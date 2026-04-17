import { WebSocketServer, WebSocket } from "ws";
import * as pty from "node-pty";
import path from "path";
import http from "http";
import { execSync } from "child_process";
import { DATA_DIR } from "../src/lib/storage/path-utils";
import { getDaemonPort } from "../src/lib/runtime/runtime-config";
import { buildAgentEnv } from "./env-sanitize";
import {
  daemonBus,
  type PtyCreateRequest,
  type PtyCreatedEvent,
} from "./daemon-bus";
import {
  LOOPBACK_HOST,
  requireTerminalServerHttpAuth,
  requireTerminalServerWebSocketAuth,
} from "./terminal-server-auth";

const PORT = getDaemonPort();

interface Session {
  id: string;
  pty: pty.IPty;
  ws: WebSocket | null;  // null when detached (client disconnected but PTY still running)
  createdAt: Date;
  output: string[];  // captured output chunks
  exited: boolean;   // true when PTY process has exited
  exitCode: number | null;
  initialPrompt?: string;
  initialPromptSent?: boolean;
  initialPromptTimer?: NodeJS.Timeout;
}

// Active sessions (includes detached ones where PTY is still running)
const sessions = new Map<string, Session>();

// Completed session output (kept for 30 minutes for retrieval)
const completedOutput = new Map<string, { output: string; completedAt: number }>();

// Cleanup old completed output every 5 minutes
setInterval(() => {
  const cutoff = Date.now() - 30 * 60 * 1000;
  for (const [id, data] of completedOutput) {
    if (data.completedAt < cutoff) {
      completedOutput.delete(id);
    }
  }
}, 5 * 60 * 1000);

// Cleanup detached sessions that have exited and been idle for 10 minutes
setInterval(() => {
  const cutoff = Date.now() - 10 * 60 * 1000;
  for (const [id, session] of sessions) {
    if (session.exited && !session.ws && session.createdAt.getTime() < cutoff) {
      const raw = session.output.join("");
      const plain = stripAnsi(raw);
      completedOutput.set(id, { output: plain, completedAt: Date.now() });
      sessions.delete(id);
      console.log(`Cleaned up exited detached session ${id}`);
    }
  }
}, 60 * 1000);

// Strip ANSI escape codes for plain text summary
function stripAnsi(str: string): string {
  return str.replace(
    /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g,
    ""
  );
}

function claudePromptReady(output: string): boolean {
  const plain = stripAnsi(output).replace(/\r/g, "\n");
  return (
    plain.includes("shift+tab to cycle") ||
    /(?:^|\n)[❯>]\s*$/.test(plain)
  );
}

function submitInitialPrompt(session: Session): void {
  if (!session.initialPrompt || session.initialPromptSent || session.exited) {
    return;
  }

  session.initialPromptSent = true;
  if (session.initialPromptTimer) {
    clearTimeout(session.initialPromptTimer);
    delete session.initialPromptTimer;
  }

  session.pty.write(session.initialPrompt);
  session.pty.write("\r");
}

interface ResolvedPtyCreateRequest extends PtyCreateRequest {
  id: string;
}

function resolvePtyCreateRequest(input: PtyCreateRequest): ResolvedPtyCreateRequest {
  return {
    ...input,
    id: input.id || `session-${Date.now()}`,
  };
}

// Resolve the claude binary path at startup
function resolveClaudePath(): string {
  const candidates = [
    path.join(process.env.HOME || "", ".local", "bin", "claude"),
    "/usr/local/bin/claude",
    "/opt/homebrew/bin/claude",
  ];

  for (const candidate of candidates) {
    try {
      const fs = require("fs");
      if (fs.existsSync(candidate)) {
        console.log(`Found claude at: ${candidate}`);
        return candidate;
      }
    } catch {}
  }

  try {
    const resolved = execSync("which claude", {
      encoding: "utf8",
      env: {
        ...process.env,
        PATH: `${process.env.HOME}/.local/bin:${process.env.PATH}`,
      },
    }).trim();
    if (resolved) {
      console.log(`Resolved claude via which: ${resolved}`);
      return resolved;
    }
  } catch {}

  console.warn("Could not resolve claude path, using 'claude' directly");
  return "claude";
}

const CLAUDE_PATH = resolveClaudePath();

const enrichedPath = [
  `${process.env.HOME}/.local/bin`,
  process.env.PATH,
].join(":");

function createSession(input: { sessionId: string; prompt?: string }): Session {
  const prompt = input.prompt?.trim() || undefined;
  const args = prompt
    ? ["--dangerously-skip-permissions", prompt]
    : ["--dangerously-skip-permissions"];

  const term = pty.spawn(CLAUDE_PATH, args, {
    name: "xterm-256color",
    cols: 120,
    rows: 30,
    cwd: DATA_DIR,
    env: {
      ...buildAgentEnv(),
      PATH: enrichedPath,
      TERM: "xterm-256color",
      COLORTERM: "truecolor",
      FORCE_COLOR: "3",
      LANG: "en_US.UTF-8",
    },
  });

  const session: Session = {
    id: input.sessionId,
    pty: term,
    ws: null,
    createdAt: new Date(),
    output: [],
    exited: false,
    exitCode: null,
    initialPrompt: undefined,
    initialPromptSent: false,
  };

  sessions.set(input.sessionId, session);
  console.log(`Session ${input.sessionId} started (${prompt ? "agent" : "interactive"} mode)`);

  term.onData((data: string) => {
    session.output.push(data);
    if (
      session.initialPrompt &&
      !session.initialPromptSent &&
      claudePromptReady(session.output.join(""))
    ) {
      submitInitialPrompt(session);
    }
    if (session.ws && session.ws.readyState === WebSocket.OPEN) {
      session.ws.send(data);
    }
  });

  term.onExit(({ exitCode }) => {
    console.log(`Session ${input.sessionId} PTY exited with code ${exitCode}`);
    session.exited = true;
    session.exitCode = exitCode;
    daemonBus.emit("pty:exit", {
      sessionId: input.sessionId,
      pid: session.pty.pid,
      exitCode,
    });
    if (session.initialPromptTimer) {
      clearTimeout(session.initialPromptTimer);
      delete session.initialPromptTimer;
    }

    if (session.ws && session.ws.readyState === WebSocket.OPEN) {
      const raw = session.output.join("");
      const plain = stripAnsi(raw);
      completedOutput.set(input.sessionId, { output: plain, completedAt: Date.now() });
      sessions.delete(input.sessionId);
      session.ws.close();
    }
  });

  if (session.initialPrompt) {
    session.initialPromptTimer = setTimeout(() => {
      submitInitialPrompt(session);
    }, 1500);
  }

  return session;
}

function createOrReuseSession(input: ResolvedPtyCreateRequest): {
  sessionId: string;
  pid: number | null;
  existing?: boolean;
} {
  const existingSession = sessions.get(input.id);
  if (existingSession?.exited) {
    sessions.delete(input.id);
    completedOutput.delete(input.id);
  } else if (existingSession) {
    return {
      sessionId: input.id,
      pid: existingSession.pty.pid,
      existing: true,
    };
  }

  const session = createSession({
    sessionId: input.id,
    prompt: input.prompt,
  });

  return {
    sessionId: session.id,
    pid: session.pty.pid,
  };
}

daemonBus.on("pty:create-request", ({ requestId, replyTo, ...payload }) => {
  const request = resolvePtyCreateRequest(payload);
  let response: PtyCreatedEvent;

  try {
    response = {
      requestId,
      ...createOrReuseSession(request),
    };
  } catch (err) {
    response = {
      requestId,
      sessionId: request.id,
      pid: null,
      error: err instanceof Error ? err.message : String(err),
    };
  }

  daemonBus.emit("pty:created", response);
  daemonBus.emit(replyTo, response);
});

// Create HTTP server to handle both WebSocket upgrades and REST endpoints
const server = http.createServer((req, res) => {
  const url = new URL(req.url || "", `http://${LOOPBACK_HOST}:${PORT}`);

  if (!requireTerminalServerHttpAuth(req, res, url)) {
    return;
  }

  // GET /session/:id/output — retrieve captured output for a completed session
  const outputMatch = url.pathname.match(/^\/session\/([^/]+)\/output$/);
  if (outputMatch && req.method === "GET") {
    const sessionId = outputMatch[1];

    // Check active session first
    const active = sessions.get(sessionId);
    if (active) {
      const raw = active.output.join("");
      const plain = stripAnsi(raw);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ sessionId, status: "running", output: plain }));
      return;
    }

    // Check completed
    const completed = completedOutput.get(sessionId);
    if (completed) {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ sessionId, status: "completed", output: completed.output }));
      return;
    }

    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Session not found" }));
    return;
  }

  // GET /sessions — list all active sessions (including detached)
  if (url.pathname === "/sessions" && req.method === "GET") {
    const activeSessions = Array.from(sessions.values()).map((s) => ({
      id: s.id,
      createdAt: s.createdAt.toISOString(),
      connected: s.ws !== null,
      exited: s.exited,
      exitCode: s.exitCode,
    }));
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(activeSessions));
    return;
  }

  // Default: 404
  res.writeHead(404, { "Content-Type": "text/plain" });
  res.end("Not found");
});

const wss = new WebSocketServer({ server });

console.log(`Terminal WebSocket server running on ws://${LOOPBACK_HOST}:${PORT}`);
console.log(`Session output API on http://${LOOPBACK_HOST}:${PORT}/session/:id/output`);
console.log(`Using claude binary: ${CLAUDE_PATH}`);
console.log(`Working directory: ${DATA_DIR}`);

wss.on("connection", (ws, req) => {
  const url = new URL(req.url || "", `http://${LOOPBACK_HOST}:${PORT}`);

  if (!requireTerminalServerWebSocketAuth(ws, req, url)) {
    return;
  }

  const sessionId = url.searchParams.get("id") || `session-${Date.now()}`;
  const prompt = url.searchParams.get("prompt")?.trim() || undefined;

  // Check if this is a reconnection to an existing session
  const existing = sessions.get(sessionId);
  if (existing) {
    console.log(`Session ${sessionId} reconnected (exited=${existing.exited})`);
    existing.ws = ws;

    // Replay all buffered output so the client sees the full history
    const replay = existing.output.join("");
    if (replay && ws.readyState === WebSocket.OPEN) {
      ws.send(replay);
    }

    // If the process already exited while detached, notify and clean up
    if (existing.exited) {
      ws.send(`\r\n\x1b[90m[Process exited with code ${existing.exitCode}]\x1b[0m\r\n`);
      const raw = existing.output.join("");
      const plain = stripAnsi(raw);
      completedOutput.set(sessionId, { output: plain, completedAt: Date.now() });
      sessions.delete(sessionId);
      ws.close();
      return;
    }

    // Wire up input from the new WebSocket to the existing PTY
    ws.on("message", (data: Buffer) => {
      const msg = data.toString();
      try {
        const parsed = JSON.parse(msg);
        if (parsed.type === "resize" && parsed.cols && parsed.rows) {
          existing.pty.resize(parsed.cols, parsed.rows);
          return;
        }
      } catch {
        // Not JSON, treat as terminal input
      }
      existing.pty.write(msg);
    });

    // On disconnect again, just detach — don't kill
    ws.on("close", () => {
      console.log(`Session ${sessionId} detached (WebSocket closed, PTY kept alive)`);
      existing.ws = null;
    });

    return;
  }

  // New session — spawn PTY
  try {
    createSession({
      sessionId,
      prompt,
    });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error(`Failed to spawn PTY for session ${sessionId}:`, errMsg);
    ws.send(`\r\n\x1b[31mError: Failed to start Claude CLI\x1b[0m\r\n`);
    ws.send(`\x1b[90m${errMsg}\x1b[0m\r\n`);
    ws.send(`\r\n\x1b[33mMake sure 'claude' is installed and accessible.\x1b[0m\r\n`);
    ws.close();
    return;
  }

  const session = sessions.get(sessionId)!;
  session.ws = ws;

  const replay = session.output.join("");
  if (replay && ws.readyState === WebSocket.OPEN) {
    ws.send(replay);
  }

  // WebSocket input → PTY
  ws.on("message", (data: Buffer) => {
    const msg = data.toString();
    try {
      const parsed = JSON.parse(msg);
      if (parsed.type === "resize" && parsed.cols && parsed.rows) {
        session.pty.resize(parsed.cols, parsed.rows);
        return;
      }
    } catch {
      // Not JSON, treat as terminal input
    }
    session.pty.write(msg);
  });

  // On WebSocket close: DETACH, don't kill the PTY
  ws.on("close", () => {
    console.log(`Session ${sessionId} detached (WebSocket closed, PTY kept alive)`);
    session.ws = null;
  });

});

server.listen(PORT, LOOPBACK_HOST);

// Handle server-level errors gracefully
wss.on("error", (err) => {
  console.error("WebSocket server error:", err.message);
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught exception:", err.message);
});

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled rejection:", reason);
});
