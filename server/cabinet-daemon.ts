/**
 * Cabinet Daemon — unified background server
 *
 * Combines:
 * - Terminal Server (PTY/WebSocket for AI panel Claude Code sessions)
 * - Job Scheduler (node-cron for agent jobs)
 * - WebSocket Event Bus (real-time updates to frontend)
 * - SQLite database initialization
 *
 * Usage: npx tsx server/cabinet-daemon.ts
 */

import { WebSocketServer, WebSocket } from "ws";
import * as pty from "node-pty";
import path from "path";
import http from "http";
import fs from "fs";
import cron from "node-cron";
import yaml from "js-yaml";
import chokidar from "chokidar";
import { spawn } from "child_process";
import { execSync } from "child_process";
import { getDb, closeDb } from "./db";

const PORT = 3001;
const DATA_DIR = path.join(process.cwd(), "data");
const AGENTS_DIR = path.join(DATA_DIR, ".agents");

// ----- Database Initialization -----

console.log("Initializing Cabinet database...");
const db = getDb();
console.log("Database ready.");

// ----- Claude Binary Resolution -----

function resolveClaudePath(): string {
  const candidates = [
    path.join(process.env.HOME || "", ".local", "bin", "claude"),
    "/usr/local/bin/claude",
    "/opt/homebrew/bin/claude",
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      console.log(`Found claude at: ${candidate}`);
      return candidate;
    }
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

// ===== PTY Terminal Server =====

interface PtySession {
  id: string;
  pty: pty.IPty;
  ws: WebSocket | null;
  createdAt: Date;
  output: string[];
  exited: boolean;
  exitCode: number | null;
}

const sessions = new Map<string, PtySession>();
const completedOutput = new Map<string, { output: string; completedAt: number }>();

function stripAnsi(str: string): string {
  return str.replace(
    /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g,
    ""
  );
}

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

function handlePtyConnection(ws: WebSocket, req: http.IncomingMessage): void {
  const url = new URL(req.url || "", `http://localhost:${PORT}`);
  const sessionId = url.searchParams.get("id") || `session-${Date.now()}`;
  const prompt = url.searchParams.get("prompt");

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
  const shell = CLAUDE_PATH;
  const args = prompt
    ? ["--dangerously-skip-permissions", prompt]
    : ["--dangerously-skip-permissions"];

  let term: pty.IPty;
  try {
    term = pty.spawn(shell, args, {
      name: "xterm-256color",
      cols: 120,
      rows: 30,
      cwd: DATA_DIR,
      env: {
        ...(process.env as Record<string, string>),
        PATH: enrichedPath,
        TERM: "xterm-256color",
        COLORTERM: "truecolor",
        FORCE_COLOR: "3",
        LANG: "en_US.UTF-8",
      },
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

  const session: PtySession = {
    id: sessionId,
    pty: term,
    ws,
    createdAt: new Date(),
    output: [],
    exited: false,
    exitCode: null,
  };

  sessions.set(sessionId, session);
  console.log(`Session ${sessionId} started (${prompt ? "agent" : "interactive"} mode)`);

  // PTY output → WebSocket + capture
  term.onData((data: string) => {
    session.output.push(data);
    if (session.ws && session.ws.readyState === WebSocket.OPEN) {
      session.ws.send(data);
    }
  });

  // WebSocket input → PTY
  ws.on("message", (data: Buffer) => {
    const msg = data.toString();
    try {
      const parsed = JSON.parse(msg);
      if (parsed.type === "resize" && parsed.cols && parsed.rows) {
        term.resize(parsed.cols, parsed.rows);
        return;
      }
    } catch {
      // Not JSON, treat as terminal input
    }
    term.write(msg);
  });

  // On WebSocket close: DETACH, don't kill the PTY
  ws.on("close", () => {
    console.log(`Session ${sessionId} detached (WebSocket closed, PTY kept alive)`);
    session.ws = null;
  });

  // PTY exit: finalize if no client connected, otherwise notify client
  term.onExit(({ exitCode }) => {
    console.log(`Session ${sessionId} PTY exited with code ${exitCode}`);
    session.exited = true;
    session.exitCode = exitCode;

    if (session.ws && session.ws.readyState === WebSocket.OPEN) {
      const raw = session.output.join("");
      const plain = stripAnsi(raw);
      completedOutput.set(sessionId, { output: plain, completedAt: Date.now() });
      sessions.delete(sessionId);
      session.ws.close();
    }
  });
}

// ===== WebSocket Event Bus =====

interface EventSubscriber {
  ws: WebSocket;
  channels: Set<string>;
}

const subscribers: EventSubscriber[] = [];

function broadcast(channel: string, data: Record<string, unknown>): void {
  const message = JSON.stringify({ channel, ...data });
  for (const sub of subscribers) {
    if (sub.channels.has(channel) || sub.channels.has("*")) {
      if (sub.ws.readyState === WebSocket.OPEN) {
        sub.ws.send(message);
      }
    }
  }
}

function handleEventBusConnection(ws: WebSocket): void {
  const subscriber: EventSubscriber = { ws, channels: new Set(["*"]) };
  subscribers.push(subscriber);

  ws.on("message", (data) => {
    try {
      const msg = JSON.parse(data.toString());
      if (msg.subscribe) {
        subscriber.channels.add(msg.subscribe);
      }
      if (msg.unsubscribe) {
        subscriber.channels.delete(msg.unsubscribe);
      }
    } catch {
      // ignore
    }
  });

  ws.on("close", () => {
    const idx = subscribers.indexOf(subscriber);
    if (idx >= 0) subscribers.splice(idx, 1);
  });
}

// ===== Job Scheduler =====

interface JobConfig {
  id: string;
  name: string;
  enabled: boolean;
  schedule: string;
  prompt: string;
  timeout?: number;
  agentSlug: string;
}

const scheduledJobs = new Map<string, ReturnType<typeof cron.schedule>>();

async function loadAndScheduleJobs(): Promise<void> {
  if (!fs.existsSync(AGENTS_DIR)) return;

  const entries = fs.readdirSync(AGENTS_DIR, { withFileTypes: true });
  let jobCount = 0;

  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith(".")) continue;

    const jobsDir = path.join(AGENTS_DIR, entry.name, "jobs");
    if (!fs.existsSync(jobsDir)) continue;

    const jobFiles = fs.readdirSync(jobsDir);
    for (const jf of jobFiles) {
      if (!jf.endsWith(".yaml")) continue;

      try {
        const raw = fs.readFileSync(path.join(jobsDir, jf), "utf-8");
        const config = yaml.load(raw) as JobConfig;
        if (config && config.id && config.enabled && config.schedule) {
          config.agentSlug = entry.name;
          scheduleJob(config);
          jobCount++;
        }
      } catch {
        // Skip malformed job files
      }
    }
  }

  console.log(`Scheduled ${jobCount} jobs.`);
}

function scheduleJob(job: JobConfig): void {
  const key = `${job.agentSlug}/${job.id}`;

  const existing = scheduledJobs.get(key);
  if (existing) existing.stop();

  if (!cron.validate(job.schedule)) {
    console.warn(`Invalid cron schedule for job ${key}: ${job.schedule}`);
    return;
  }

  const task = cron.schedule(job.schedule, () => {
    executeJob(job);
  });

  scheduledJobs.set(key, task);
  console.log(`  Scheduled: ${key} (${job.schedule})`);
}

function executeJob(job: JobConfig): void {
  const runId = `${Date.now()}-${job.id}`;
  console.log(`Executing job: ${job.agentSlug}/${job.id} (run: ${runId})`);

  broadcast("job:started", {
    agent: job.agentSlug,
    jobId: job.id,
    runId,
  });

  db.prepare(
    `INSERT INTO job_runs (id, job_id, agent_slug, status, started_at)
     VALUES (?, ?, ?, 'running', datetime('now'))`
  ).run(runId, job.id, job.agentSlug);

  const proc = spawn(
    CLAUDE_PATH,
    ["--dangerously-skip-permissions", "-p", job.prompt, "--output-format", "text"],
    {
      cwd: DATA_DIR,
      env: {
        ...process.env,
        PATH: enrichedPath,
      } as NodeJS.ProcessEnv,
      stdio: ["pipe", "pipe", "pipe"],
    }
  );

  let output = "";

  proc.stdout?.on("data", (data: Buffer) => {
    output += data.toString();
    broadcast("agent:output", {
      agent: job.agentSlug,
      runId,
      chunk: data.toString(),
    });
  });

  proc.stderr?.on("data", (data: Buffer) => {
    output += data.toString();
  });

  const timeout = setTimeout(() => {
    proc.kill();
    console.warn(`Job ${job.agentSlug}/${job.id} timed out`);
  }, (job.timeout || 600) * 1000);

  proc.on("close", (code: number | null) => {
    clearTimeout(timeout);
    const status = code === 0 ? "completed" : "failed";

    db.prepare(
      `UPDATE job_runs SET status = ?, completed_at = datetime('now'),
       duration_ms = CAST((julianday('now') - julianday(started_at)) * 86400000 AS INTEGER),
       output = ? WHERE id = ?`
    ).run(status, output.slice(0, 10000), runId);

    broadcast("job:completed", {
      agent: job.agentSlug,
      jobId: job.id,
      runId,
      status,
    });

    console.log(`Job ${job.agentSlug}/${job.id} ${status} (exit: ${code})`);
  });

  proc.on("error", (err: Error) => {
    clearTimeout(timeout);
    db.prepare(
      `UPDATE job_runs SET status = 'failed', completed_at = datetime('now'),
       error = ? WHERE id = ?`
    ).run(err.message, runId);

    broadcast("job:completed", {
      agent: job.agentSlug,
      jobId: job.id,
      runId,
      status: "failed",
    });
  });
}

// ===== HTTP Server =====

const server = http.createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url || "", `http://localhost:${PORT}`);

  // GET /session/:id/output — retrieve captured output for a completed session
  const outputMatch = url.pathname.match(/^\/session\/([^/]+)\/output$/);
  if (outputMatch && req.method === "GET") {
    const sessionId = outputMatch[1];

    const active = sessions.get(sessionId);
    if (active) {
      const raw = active.output.join("");
      const plain = stripAnsi(raw);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ sessionId, status: "running", output: plain }));
      return;
    }

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

  // GET /sessions — list all active sessions
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

  // Health check
  if (url.pathname === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        status: "ok",
        ptySessions: sessions.size,
        scheduledJobs: scheduledJobs.size,
        subscribers: subscribers.length,
      })
    );
    return;
  }

  // Trigger job manually
  if (url.pathname === "/trigger" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        const { agentSlug, jobId, prompt } = JSON.parse(body);
        if (prompt) {
          executeJob({
            id: jobId || `manual-${Date.now()}`,
            name: "Manual run",
            enabled: true,
            schedule: "",
            prompt,
            agentSlug: agentSlug || "manual",
          });
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ ok: true }));
        } else {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "prompt is required" }));
        }
      } catch {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Invalid JSON" }));
      }
    });
    return;
  }

  res.writeHead(404, { "Content-Type": "text/plain" });
  res.end("Not found");
});

// ===== WebSocket Servers =====

// PTY terminal WebSocket — root path (what AI panel and web terminal connect to)
const wssPty = new WebSocketServer({ noServer: true });

// Event bus WebSocket — /events path
const wssEvents = new WebSocketServer({ noServer: true });

// Route WebSocket upgrades based on path
server.on("upgrade", (req, socket, head) => {
  const url = new URL(req.url || "", `http://localhost:${PORT}`);

  if (url.pathname === "/events") {
    wssEvents.handleUpgrade(req, socket, head, (ws) => {
      wssEvents.emit("connection", ws, req);
    });
  } else {
    // Root path and everything else → PTY terminal
    wssPty.handleUpgrade(req, socket, head, (ws) => {
      wssPty.emit("connection", ws, req);
    });
  }
});

wssPty.on("connection", (ws, req) => {
  handlePtyConnection(ws, req as http.IncomingMessage);
});

wssEvents.on("connection", (ws) => {
  handleEventBusConnection(ws);
});

// ===== Startup =====

server.listen(PORT, () => {
  console.log(`Cabinet Daemon running on port ${PORT}`);
  console.log(`  Terminal WebSocket: ws://localhost:${PORT}`);
  console.log(`  Events WebSocket: ws://localhost:${PORT}/events`);
  console.log(`  Session API: http://localhost:${PORT}/sessions`);
  console.log(`  Health check: http://localhost:${PORT}/health`);
  console.log(`  Trigger endpoint: POST http://localhost:${PORT}/trigger`);
  console.log(`  Using claude: ${CLAUDE_PATH}`);
  console.log(`  Working directory: ${DATA_DIR}`);

  loadAndScheduleJobs();
});

// ===== Graceful Shutdown =====

process.on("SIGINT", () => {
  console.log("\nShutting down...");
  for (const [, task] of scheduledJobs) {
    task.stop();
  }
  for (const [, session] of sessions) {
    try { session.pty.kill(); } catch {}
  }
  closeDb();
  server.close();
  process.exit(0);
});

wssPty.on("error", (err) => {
  console.error("PTY WebSocket error:", err.message);
});

wssEvents.on("error", (err) => {
  console.error("Events WebSocket error:", err.message);
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught exception:", err.message);
});

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled rejection:", reason);
});
