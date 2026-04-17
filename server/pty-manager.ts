import type { IncomingMessage } from "http";
import { WebSocket } from "ws";
import * as pty from "node-pty";
import path from "path";
import {
  getSessionLaunchSpec,
  resolveProviderId,
} from "../src/lib/agents/provider-runtime";
import { buildAgentEnv } from "./env-sanitize";
import {
  appendConversationTranscript,
  finalizeConversation,
  readConversationMeta,
} from "../src/lib/agents/conversation-store";
import {
  daemonBus,
  type PtyCreateRequest,
  type PtyCreatedEvent,
  type PtyCreateRequestEvent,
} from "./daemon-bus";
import {
  claudeIdlePromptVisible,
  claudePromptReady,
  stripAnsi,
} from "./terminal-utils";

const MAX_SESSION_OUTPUT_BYTES = 8 * 1024 * 1024; // 8 MB per session
const MAX_COMPLETED_OUTPUT_ENTRIES = 200;
const COMPLETED_OUTPUT_RETENTION_MS = 30 * 60 * 1000;
const DETACHED_EXITED_RETENTION_MS = 10 * 60 * 1000;
const DETACHED_IDLE_KILL_MS = 30 * 60 * 1000;

interface PtySession {
  id: string;
  providerId: string;
  pty: pty.IPty;
  ws: WebSocket | null;
  detachedAt?: number;
  createdAt: Date;
  output: string[];
  outputBytes: number;
  exited: boolean;
  exitCode: number | null;
  timeoutHandle?: NodeJS.Timeout;
  initialPrompt?: string;
  initialPromptSent?: boolean;
  initialPromptTimer?: NodeJS.Timeout;
  promptSubmittedOutputLength?: number;
  autoExitRequested?: boolean;
  autoExitFallbackTimer?: NodeJS.Timeout;
  resolvedStatus?: "completed" | "failed";
  resolvingStatus?: boolean;
  readyStrategy?: "claude";
}

export interface ResolvedPtyCreateRequest extends PtyCreateRequest {
  id: string;
}

export interface CreateSessionInput {
  sessionId: string;
  providerId?: string;
  prompt?: string;
  cwd?: string;
  timeoutSeconds?: number;
  onData?: (chunk: string) => void;
}

export interface PtyCreateResult {
  sessionId: string;
  pid: number | null;
  existing?: boolean;
}

export interface ActiveSessionSnapshot {
  sessionId: string;
  status: "completed" | "failed" | "running";
  output: string;
}

export interface CompletedOutputSnapshot {
  output: string;
  completedAt: number;
}

export interface SessionListItem {
  id: string;
  createdAt: string;
  connected: boolean;
  exited: boolean;
  exitCode: number | null;
}

export interface PtyManager {
  handleConnection(ws: WebSocket, req: IncomingMessage): void;
  createSession(input: CreateSessionInput): void;
  createOrReuseSession(input: ResolvedPtyCreateRequest): PtyCreateResult;
  resolveCreateRequest(input: PtyCreateRequest): ResolvedPtyCreateRequest;
  getActiveSessionSnapshot(id: string): ActiveSessionSnapshot | null;
  getCompletedOutput(id: string): CompletedOutputSnapshot | null;
  listSessions(): SessionListItem[];
  stop(): void;
}

export interface PtyManagerOptions {
  dataDir: string;
  enrichedPath: string;
  port: number;
}

export function createPtyManager(opts: PtyManagerOptions): PtyManager {
  const sessions = new Map<string, PtySession>();
  const completedOutput = new Map<string, CompletedOutputSnapshot>();

  function pushSessionOutput(session: PtySession, data: string): void {
    const dataBytes = Buffer.byteLength(data, "utf8");
    while (session.output.length > 0 && session.outputBytes + dataBytes > MAX_SESSION_OUTPUT_BYTES) {
      const dropped = session.output.shift()!;
      session.outputBytes -= Buffer.byteLength(dropped, "utf8");
    }
    session.output.push(data);
    session.outputBytes += dataBytes;
  }

  function setCompletedOutput(id: string, output: string): void {
    completedOutput.set(id, { output, completedAt: Date.now() });
    if (completedOutput.size > MAX_COMPLETED_OUTPUT_ENTRIES) {
      const entries = Array.from(completedOutput.entries()).sort(
        (a, b) => a[1].completedAt - b[1].completedAt,
      );
      const toRemove = entries.length - MAX_COMPLETED_OUTPUT_ENTRIES;
      for (let i = 0; i < toRemove; i++) {
        completedOutput.delete(entries[i][0]);
      }
    }
  }

  function resolveSessionCwd(input?: string): string {
    if (!input) return opts.dataDir;
    const resolved = path.resolve(input);
    if (resolved === opts.dataDir || resolved.startsWith(`${opts.dataDir}${path.sep}`)) {
      return resolved;
    }
    return opts.dataDir;
  }

  function submitInitialPrompt(session: PtySession): void {
    if (!session.initialPrompt || session.initialPromptSent || session.exited) {
      return;
    }
    session.initialPromptSent = true;
    session.promptSubmittedOutputLength = session.output.join("").length;
    if (session.initialPromptTimer) {
      clearTimeout(session.initialPromptTimer);
      delete session.initialPromptTimer;
    }
    session.pty.write(session.initialPrompt);
    session.pty.write("\r");
  }

  async function syncConversationChunk(sessionId: string, chunk: string): Promise<void> {
    const meta = await readConversationMeta(sessionId);
    if (!meta) return;
    const plainChunk = stripAnsi(chunk);
    if (!plainChunk) return;
    await appendConversationTranscript(sessionId, plainChunk);
  }

  function maybeAutoExitClaudeSession(session: PtySession): void {
    if (
      !session.initialPrompt ||
      !session.initialPromptSent ||
      session.exited ||
      session.autoExitRequested ||
      session.resolvedStatus
    ) {
      return;
    }

    const submittedLength = session.promptSubmittedOutputLength ?? 0;
    const currentOutput = session.output.join("");
    if (currentOutput.length <= submittedLength) return;

    const outputSincePrompt = currentOutput.slice(submittedLength);
    if (!claudeIdlePromptVisible(outputSincePrompt)) return;

    session.resolvedStatus = "completed";
    session.resolvingStatus = true;
    session.autoExitRequested = true;
    const plain = stripAnsi(currentOutput);
    setCompletedOutput(session.id, plain);
    void finalizeConversation(session.id, {
      status: "completed",
      exitCode: 0,
      output: plain,
    }).finally(() => {
      session.resolvingStatus = false;
    });
    session.pty.write("/exit\r");
    session.autoExitFallbackTimer = setTimeout(() => {
      if (session.exited) return;
      try {
        session.pty.kill();
      } catch {}
    }, 1500);
  }

  async function finalizeSessionConversation(session: PtySession): Promise<void> {
    const meta = await readConversationMeta(session.id);
    if (!meta) return;

    const plain = stripAnsi(session.output.join(""));
    if (meta.status !== "running") {
      setCompletedOutput(session.id, plain);
      return;
    }
    await finalizeConversation(session.id, {
      status: session.resolvedStatus || (session.exitCode === 0 ? "completed" : "failed"),
      exitCode: session.resolvedStatus === "completed" ? 0 : session.exitCode,
      output: plain,
    });
  }

  function createSessionInternal(input: CreateSessionInput): PtySession {
    const cwd = resolveSessionCwd(input.cwd);
    const launch = getSessionLaunchSpec({
      providerId: input.providerId,
      prompt: input.prompt,
      workdir: cwd,
    });
    const resolvedProviderId = resolveProviderId(input.providerId);

    const term = pty.spawn(launch.command, launch.args, {
      name: "xterm-256color",
      cols: 120,
      rows: 30,
      cwd,
      env: {
        ...buildAgentEnv(),
        PATH: opts.enrichedPath,
        TERM: "xterm-256color",
        COLORTERM: "truecolor",
        FORCE_COLOR: "3",
        LANG: "en_US.UTF-8",
      },
    });

    const session: PtySession = {
      id: input.sessionId,
      providerId: resolvedProviderId,
      pty: term,
      ws: null,
      createdAt: new Date(),
      output: [],
      outputBytes: 0,
      exited: false,
      exitCode: null,
      initialPrompt: launch.initialPrompt?.trim() || undefined,
      initialPromptSent: false,
      promptSubmittedOutputLength: 0,
      autoExitRequested: false,
      readyStrategy: launch.readyStrategy,
    };
    sessions.set(input.sessionId, session);

    term.onData((data: string) => {
      pushSessionOutput(session, data);
      if (
        session.initialPrompt &&
        !session.initialPromptSent &&
        session.readyStrategy === "claude" &&
        claudePromptReady(session.output.join(""))
      ) {
        submitInitialPrompt(session);
      }
      maybeAutoExitClaudeSession(session);
      void syncConversationChunk(input.sessionId, data).catch(() => {});
      if (session.ws && session.ws.readyState === WebSocket.OPEN) {
        session.ws.send(data);
      }
      input.onData?.(data);
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
      if (session.timeoutHandle) {
        clearTimeout(session.timeoutHandle);
        delete session.timeoutHandle;
      }
      if (session.initialPromptTimer) {
        clearTimeout(session.initialPromptTimer);
        delete session.initialPromptTimer;
      }
      if (session.autoExitFallbackTimer) {
        clearTimeout(session.autoExitFallbackTimer);
        delete session.autoExitFallbackTimer;
      }

      const plain = stripAnsi(session.output.join(""));
      setCompletedOutput(input.sessionId, plain);
      void finalizeSessionConversation(session).catch(() => {});

      if (session.ws && session.ws.readyState === WebSocket.OPEN) {
        sessions.delete(input.sessionId);
        session.ws.close();
      }
    });

    if (input.timeoutSeconds && input.timeoutSeconds > 0) {
      session.timeoutHandle = setTimeout(() => {
        console.warn(`Session ${input.sessionId} timed out after ${input.timeoutSeconds}s`);
        try {
          term.kill();
        } catch {}
      }, input.timeoutSeconds * 1000);
    }

    if (session.initialPrompt) {
      session.initialPromptTimer = setTimeout(() => {
        submitInitialPrompt(session);
      }, 1500);
    }

    return session;
  }

  function resolveCreateRequest(input: PtyCreateRequest): ResolvedPtyCreateRequest {
    return {
      ...input,
      id: input.id || `session-${Date.now()}`,
    };
  }

  function createOrReuseSession(input: ResolvedPtyCreateRequest): PtyCreateResult {
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

    const session = createSessionInternal({
      sessionId: input.id,
      providerId: input.providerId,
      prompt: input.prompt,
      cwd: input.cwd,
      timeoutSeconds: input.timeoutSeconds,
    });

    return {
      sessionId: session.id,
      pid: session.pty.pid,
    };
  }

  function handleConnection(ws: WebSocket, req: IncomingMessage): void {
    const url = new URL(req.url || "", `http://localhost:${opts.port}`);
    const sessionId = url.searchParams.get("id") || `session-${Date.now()}`;
    const prompt = url.searchParams.get("prompt");
    const providerId = url.searchParams.get("providerId") || undefined;

    const existing = sessions.get(sessionId);
    if (existing) {
      console.log(`Session ${sessionId} reconnected (exited=${existing.exited})`);
      existing.ws = ws;
      delete existing.detachedAt;

      const replay = existing.output.join("");
      if (replay && ws.readyState === WebSocket.OPEN) {
        ws.send(replay);
      }

      if (existing.exited) {
        ws.send(`\r\n\x1b[90m[Process exited with code ${existing.exitCode}]\x1b[0m\r\n`);
        const plain = stripAnsi(existing.output.join(""));
        setCompletedOutput(sessionId, plain);
        sessions.delete(sessionId);
        ws.close();
        return;
      }

      ws.on("message", (data: Buffer) => {
        const msg = data.toString();
        try {
          const parsed = JSON.parse(msg);
          if (parsed.type === "resize" && parsed.cols && parsed.rows) {
            existing.pty.resize(parsed.cols, parsed.rows);
            return;
          }
        } catch {
          // not JSON, treat as terminal input
        }
        existing.pty.write(msg);
      });

      ws.on("close", () => {
        console.log(`Session ${sessionId} detached (WebSocket closed, PTY kept alive)`);
        existing.ws = null;
        existing.detachedAt = Date.now();
      });

      return;
    }

    let session: PtySession;
    try {
      session = createSessionInternal({
        sessionId,
        providerId,
        prompt: prompt || undefined,
      });
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error(`Failed to spawn PTY for session ${sessionId}:`, errMsg);
      ws.send(`\r\n\x1b[31mError: Failed to start agent CLI\x1b[0m\r\n`);
      ws.send(`\x1b[90m${errMsg}\x1b[0m\r\n`);
      ws.close();
      return;
    }

    session.ws = ws;
    console.log(`Session ${sessionId} started (${prompt ? "agent" : "interactive"} mode)`);

    const replay = session.output.join("");
    if (replay && ws.readyState === WebSocket.OPEN) {
      ws.send(replay);
    }

    ws.on("message", (data: Buffer) => {
      const msg = data.toString();
      try {
        const parsed = JSON.parse(msg);
        if (parsed.type === "resize" && parsed.cols && parsed.rows) {
          session.pty.resize(parsed.cols, parsed.rows);
          return;
        }
      } catch {
        // not JSON, treat as terminal input
      }
      session.pty.write(msg);
    });

    ws.on("close", () => {
      console.log(`Session ${sessionId} detached (WebSocket closed, PTY kept alive)`);
      session.ws = null;
      session.detachedAt = Date.now();
    });
  }

  function getActiveSessionSnapshot(id: string): ActiveSessionSnapshot | null {
    const active = sessions.get(id);
    if (!active) return null;
    const plain = stripAnsi(active.output.join(""));
    const status = active.resolvedStatus
      ? active.resolvedStatus
      : active.exited
        ? active.exitCode === 0
          ? "completed"
          : "failed"
        : "running";
    return { sessionId: id, status, output: plain };
  }

  function getCompletedOutput(id: string): CompletedOutputSnapshot | null {
    return completedOutput.get(id) ?? null;
  }

  function listSessions(): SessionListItem[] {
    return Array.from(sessions.values()).map((s) => ({
      id: s.id,
      createdAt: s.createdAt.toISOString(),
      connected: s.ws !== null,
      exited: s.exited,
      exitCode: s.exitCode,
    }));
  }

  const completedOutputCleanupInterval = setInterval(() => {
    const cutoff = Date.now() - COMPLETED_OUTPUT_RETENTION_MS;
    for (const [id, data] of completedOutput) {
      if (data.completedAt < cutoff) {
        completedOutput.delete(id);
      }
    }
  }, 5 * 60 * 1000);

  const detachedSessionCleanupInterval = setInterval(() => {
    const cutoff = Date.now() - DETACHED_EXITED_RETENTION_MS;
    const detachedPtyCutoff = Date.now() - DETACHED_IDLE_KILL_MS;
    for (const [id, session] of sessions) {
      if (session.exited && !session.ws && session.createdAt.getTime() < cutoff) {
        const plain = stripAnsi(session.output.join(""));
        setCompletedOutput(id, plain);
        sessions.delete(id);
        console.log(`Cleaned up exited detached session ${id}`);
        continue;
      }
      if (!session.exited && !session.ws && session.detachedAt && session.detachedAt < detachedPtyCutoff) {
        console.log(`Killing idle detached session ${id} after 30 minutes`);
        try {
          session.pty.kill();
        } catch {}
      }
    }
  }, 60 * 1000);

  const onCreateRequest = async ({ requestId, replyTo, ...payload }: PtyCreateRequestEvent) => {
    const request = resolveCreateRequest(payload);
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
  };

  daemonBus.on("pty:create-request", onCreateRequest);

  function stop(): void {
    clearInterval(completedOutputCleanupInterval);
    clearInterval(detachedSessionCleanupInterval);
    daemonBus.off("pty:create-request", onCreateRequest);
    for (const [, session] of sessions) {
      try {
        session.pty.kill();
      } catch {}
    }
  }

  return {
    handleConnection,
    createSession: (input) => {
      createSessionInternal(input);
    },
    createOrReuseSession,
    resolveCreateRequest,
    getActiveSessionSnapshot,
    getCompletedOutput,
    listSessions,
    stop,
  };
}
