/**
 * Cabinet Daemon — unified background server
 *
 * Combines:
 * - Terminal Server (PTY/WebSocket for AI panel agent sessions)
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
import matter from "gray-matter";
import { getDb, closeDb } from "./db";
import { DATA_DIR } from "../src/lib/storage/path-utils";
import {
  getAppOrigin,
  getDaemonPort,
} from "../src/lib/runtime/runtime-config";
import {
  createProviderSession,
  getInteractiveProviderLaunchSpec,
  resolveProviderId,
} from "../src/lib/agents/provider-runtime";
import { formatAcpSessionUpdate } from "../src/lib/agents/acp-runtime";
import {
  appendConversationTranscript,
  finalizeConversation,
  parseCabinetBlock,
  readConversationMeta,
  readConversationTranscript,
} from "../src/lib/agents/conversation-store";
import {
  getTokenFromAuthorizationHeader,
  isDaemonTokenValid,
} from "../src/lib/agents/daemon-auth";
import {
  normalizeJobConfig,
  normalizeJobId,
} from "../src/lib/jobs/job-normalization";

const PORT = getDaemonPort();
const AGENTS_DIR = path.join(DATA_DIR, ".agents");
const ALLOWED_BROWSER_ORIGINS = new Set(
  [
    getAppOrigin(),
    ...(process.env.CABINET_APP_ORIGIN
      ? process.env.CABINET_APP_ORIGIN.split(",").map((value) => value.trim()).filter(Boolean)
      : []),
  ]
);

// ----- Database Initialization -----

console.log("Initializing Cabinet database...");
getDb();
console.log("Database ready.");

const enrichedPath = [
  `${process.env.HOME}/.local/bin`,
  process.env.PATH,
].join(":");

// ===== PTY Terminal Server =====

interface PtySession {
  id: string;
  providerId: string;
  kind: "shell" | "acp" | "provider";
  pty?: pty.IPty;
  acpClose?: () => Promise<void>;
  acpKill?: () => void;
  ws: WebSocket | null;
  createdAt: Date;
  output: string[];
  exited: boolean;
  exitCode: number | null;
  timeoutHandle?: NodeJS.Timeout;
  resolvedStatus?: "completed" | "failed";
  resolvingStatus?: boolean;
}

const sessions = new Map<string, PtySession>();
const completedOutput = new Map<string, { output: string; completedAt: number }>();

function resolveSessionCwd(input?: string): string {
  if (!input) return DATA_DIR;

  const resolved = path.resolve(input);
  if (resolved.startsWith(DATA_DIR)) {
    return resolved;
  }

  return DATA_DIR;
}

function applyCors(req: http.IncomingMessage, res: http.ServerResponse): void {
  const origin = req.headers.origin;
  if (origin && ALLOWED_BROWSER_ORIGINS.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
}

function requestToken(req: http.IncomingMessage, url: URL): string | null {
  const authHeader = Array.isArray(req.headers.authorization)
    ? req.headers.authorization[0]
    : req.headers.authorization;
  return getTokenFromAuthorizationHeader(authHeader) || url.searchParams.get("token");
}

function rejectUnauthorized(res: http.ServerResponse): void {
  res.writeHead(401, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Unauthorized" }));
}

function stripAnsi(str: string): string {
  return str
    .replace(/\u001B\][^\u0007]*(?:\u0007|\u001B\\)/g, "")
    .replace(/\u001B[P^_][\s\S]*?\u001B\\/g, "")
    .replace(/\u001B\[[0-?]*[ -/]*[@-~]/g, "")
    .replace(/\u001B[@-_]/g, "")
    .replace(/[\u0000-\u0008\u000B-\u001A\u001C-\u001F\u007F]/g, "");
}

function claudeIdlePromptVisible(output: string): boolean {
  const plain = stripAnsi(output).replace(/\r/g, "\n");
  return /(?:^|\n)[❯>]\s*$/.test(plain);
}

function transcriptShowsCompletedRun(output: string, prompt?: string): boolean {
  const parsed = parseCabinetBlock(output, prompt);
  if (parsed.summary || parsed.artifactPaths.length > 0) {
    return true;
  }
  return claudeIdlePromptVisible(output);
}

async function syncConversationChunk(sessionId: string, chunk: string): Promise<void> {
  const meta = await readConversationMeta(sessionId);
  if (!meta) return;
  const plainChunk = stripAnsi(chunk);
  if (!plainChunk) return;
  await appendConversationTranscript(sessionId, plainChunk);
}

async function finalizeSessionConversation(session: PtySession): Promise<void> {
  const meta = await readConversationMeta(session.id);
  if (!meta) return;

  const plain = stripAnsi(session.output.join(""));
  if (meta.status !== "running") {
    completedOutput.set(session.id, { output: plain, completedAt: Date.now() });
    return;
  }
  await finalizeConversation(session.id, {
    status: session.resolvedStatus || (session.exitCode === 0 ? "completed" : "failed"),
    exitCode: session.resolvedStatus === "completed" ? 0 : session.exitCode,
    output: plain,
  });
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
  const providerId = url.searchParams.get("providerId") || undefined;

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
      if (!existing.pty) {
        return;
      }

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
    createDetachedSession({
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
  const session = sessions.get(sessionId)!;
  session.ws = ws;
  console.log(`Session ${sessionId} started (${prompt ? "agent" : "interactive"} mode)`);

  const replay = session.output.join("");
  if (replay && ws.readyState === WebSocket.OPEN) {
    ws.send(replay);
  }

  // WebSocket input → PTY
  ws.on("message", (data: Buffer) => {
    const msg = data.toString();
    try {
      const parsed = JSON.parse(msg);
      if (parsed.type === "resize" && parsed.cols && parsed.rows && session.pty) {
        session.pty.resize(parsed.cols, parsed.rows);
        return;
      }
    } catch {
      // Not JSON, treat as terminal input
    }
    if (session.pty) {
      session.pty.write(msg);
    }
  });

  // On WebSocket close: DETACH, don't kill the PTY
  ws.on("close", () => {
    console.log(`Session ${sessionId} detached (WebSocket closed, PTY kept alive)`);
    session.ws = null;
  });

}

function createDetachedSession(input: {
  sessionId: string;
  providerId?: string;
  providerModel?: string;
  prompt?: string;
  cwd?: string;
  allowedRoots?: string[];
  timeoutSeconds?: number;
  onData?: (chunk: string) => void;
}): PtySession {
  if (input.providerId && !input.prompt?.trim()) {
    return createInteractiveProviderDetachedSession(input);
  }
  if (input.providerId || input.prompt?.trim()) {
    return createAcpDetachedSession(input);
  }
  return createShellDetachedSession(input);
}

function createShellDetachedSession(input: {
  sessionId: string;
  providerId?: string;
  providerModel?: string;
  prompt?: string;
  cwd?: string;
  allowedRoots?: string[];
  timeoutSeconds?: number;
  onData?: (chunk: string) => void;
}): PtySession {
  const cwd = resolveSessionCwd(input.cwd);
  const shell = process.env.SHELL || "/bin/zsh";
  const term = pty.spawn(shell, [], {
    name: "xterm-256color",
    cols: 120,
    rows: 30,
    cwd,
    env: {
      ...(process.env as Record<string, string>),
      PATH: enrichedPath,
      TERM: "xterm-256color",
      COLORTERM: "truecolor",
      FORCE_COLOR: "3",
      LANG: "en_US.UTF-8",
    },
  });

  const session: PtySession = {
    id: input.sessionId,
    providerId: "shell",
    kind: "shell",
    pty: term,
    ws: null,
    createdAt: new Date(),
    output: [],
    exited: false,
    exitCode: null,
  };
  sessions.set(input.sessionId, session);

  term.onData((data: string) => {
    session.output.push(data);
    void syncConversationChunk(input.sessionId, data).catch(() => {});
    if (session.ws && session.ws.readyState === WebSocket.OPEN) {
      session.ws.send(data);
    }
    input.onData?.(data);
  });

  term.onExit(({ exitCode }) => {
    console.log(`Session ${input.sessionId} shell exited with code ${exitCode}`);
    session.exited = true;
    session.exitCode = exitCode;
    if (session.timeoutHandle) {
      clearTimeout(session.timeoutHandle);
      delete session.timeoutHandle;
    }

    const plain = stripAnsi(session.output.join(""));
    completedOutput.set(input.sessionId, { output: plain, completedAt: Date.now() });
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

  return session;
}

function createAcpDetachedSession(input: {
  sessionId: string;
  providerId?: string;
  providerModel?: string;
  prompt?: string;
  cwd?: string;
  allowedRoots?: string[];
  timeoutSeconds?: number;
  onData?: (chunk: string) => void;
}): PtySession {
  const cwd = resolveSessionCwd(input.cwd);
  const resolvedProviderId = resolveProviderId(input.providerId);
  const prompt = input.prompt?.trim();

  if (!prompt) {
    throw new Error("ACP sessions require a prompt");
  }

  const session: PtySession = {
    id: input.sessionId,
    providerId: resolvedProviderId,
    kind: "acp",
    ws: null,
    createdAt: new Date(),
    output: [],
    exited: false,
    exitCode: null,
  };
  sessions.set(input.sessionId, session);

  const appendOutput = (chunk: string) => {
    if (!chunk) return;
    session.output.push(chunk);
    void syncConversationChunk(input.sessionId, chunk).catch(() => {});
    if (session.ws && session.ws.readyState === WebSocket.OPEN) {
      session.ws.send(chunk);
    }
    input.onData?.(chunk);
  };

  const finalizeAcpSession = async (status: "completed" | "failed", error?: string) => {
    if (session.exited) return;
    session.exited = true;
    session.exitCode = status === "completed" ? 0 : 1;
    session.resolvedStatus = status;
    if (session.timeoutHandle) {
      clearTimeout(session.timeoutHandle);
      delete session.timeoutHandle;
    }

    const plain = stripAnsi(session.output.join(""));
    completedOutput.set(input.sessionId, { output: plain, completedAt: Date.now() });
    await finalizeSessionConversation(session).catch(() => {});
    if (error && session.ws && session.ws.readyState === WebSocket.OPEN) {
      session.ws.send(`\r\n${error}\r\n`);
    }
    if (session.ws && session.ws.readyState === WebSocket.OPEN) {
      sessions.delete(input.sessionId);
      session.ws.close();
    }
  };

  void createProviderSession({
    providerId: resolvedProviderId,
    providerModel: input.providerModel,
    cwd,
    allowedRoots: input.allowedRoots?.length ? input.allowedRoots : [DATA_DIR],
    onSessionUpdate(params) {
      appendOutput(formatAcpSessionUpdate(params));
    },
    onStderr(chunk) {
      appendOutput(chunk);
    },
  }).then(async (acpSession) => {
    session.acpClose = acpSession.close;
    session.acpKill = acpSession.kill;

    if (input.timeoutSeconds && input.timeoutSeconds > 0) {
      session.timeoutHandle = setTimeout(() => {
        try {
          session.acpKill?.();
        } catch {}
        const message = `Session timed out after ${input.timeoutSeconds}s`;
        appendOutput(`\n${message}\n`);
        void finalizeAcpSession("failed", message);
      }, input.timeoutSeconds * 1000);
    }

    try {
      await acpSession.prompt(prompt);
      await acpSession.close();
      await finalizeAcpSession("completed");
    } catch (error) {
      try {
        await acpSession.close();
      } catch {}
      const message = error instanceof Error ? error.message : String(error);
      appendOutput(`\n${message}\n`);
      await finalizeAcpSession("failed", message);
    }
  }).catch(async (error) => {
    const message = error instanceof Error ? error.message : String(error);
    appendOutput(`\n${message}\n`);
    await finalizeAcpSession("failed", message);
  });

  return session;
}

function createInteractiveProviderDetachedSession(input: {
  sessionId: string;
  providerId?: string;
  providerModel?: string;
  prompt?: string;
  cwd?: string;
  allowedRoots?: string[];
  timeoutSeconds?: number;
  onData?: (chunk: string) => void;
}): PtySession {
  const cwd = resolveSessionCwd(input.cwd);
  const launch = getInteractiveProviderLaunchSpec({
    providerId: input.providerId,
    workdir: cwd,
  });
  const term = pty.spawn(launch.command, launch.args, {
    name: "xterm-256color",
    cols: 120,
    rows: 30,
    cwd,
    env: {
      ...(process.env as Record<string, string>),
      PATH: enrichedPath,
      TERM: "xterm-256color",
      COLORTERM: "truecolor",
      FORCE_COLOR: "3",
      LANG: "en_US.UTF-8",
    },
  });

  const session: PtySession = {
    id: input.sessionId,
    providerId: launch.providerId,
    kind: "provider",
    pty: term,
    ws: null,
    createdAt: new Date(),
    output: [],
    exited: false,
    exitCode: null,
  };
  sessions.set(input.sessionId, session);

  term.onData((data: string) => {
    session.output.push(data);
    void syncConversationChunk(input.sessionId, data).catch(() => {});
    if (session.ws && session.ws.readyState === WebSocket.OPEN) {
      session.ws.send(data);
    }
    input.onData?.(data);
  });

  term.onExit(({ exitCode }) => {
    console.log(`Session ${input.sessionId} provider exited with code ${exitCode}`);
    session.exited = true;
    session.exitCode = exitCode;
    if (session.timeoutHandle) {
      clearTimeout(session.timeoutHandle);
      delete session.timeoutHandle;
    }

    const plain = stripAnsi(session.output.join(""));
    completedOutput.set(input.sessionId, { output: plain, completedAt: Date.now() });
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

  return session;
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
const scheduledHeartbeats = new Map<string, ReturnType<typeof cron.schedule>>();
let scheduleReloadTimer: NodeJS.Timeout | null = null;

async function putJson(url: string, body: Record<string, unknown>): Promise<void> {
  const response = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }
}

function stopScheduledTasks(): void {
  for (const [, task] of scheduledJobs) task.stop();
  for (const [, task] of scheduledHeartbeats) task.stop();
  scheduledJobs.clear();
  scheduledHeartbeats.clear();
}

function scheduleJob(job: JobConfig): void {
  const key = `${job.agentSlug}/${job.id}`;
  const existingTask = scheduledJobs.get(key);
  if (existingTask) existingTask.stop();

  if (!cron.validate(job.schedule)) {
    console.warn(`Invalid cron schedule for job ${key}: ${job.schedule}`);
    return;
  }

  const task = cron.schedule(job.schedule, () => {
    console.log(`Triggering scheduled job ${key}`);
    void putJson(`${getAppOrigin()}/api/agents/${job.agentSlug}/jobs/${job.id}`, {
      action: "run",
      source: "scheduler",
    }).catch((error) => {
      console.error(`Failed to trigger scheduled job ${key}:`, error);
    });
  });

  scheduledJobs.set(key, task);
  console.log(`  Scheduled job: ${key} (${job.schedule})`);
}

function scheduleHeartbeat(slug: string, cronExpr: string): void {
  if (!cron.validate(cronExpr)) {
    console.warn(`Invalid heartbeat schedule for ${slug}: ${cronExpr}`);
    return;
  }

  const task = cron.schedule(cronExpr, () => {
    console.log(`Triggering heartbeat ${slug}`);
    void putJson(`${getAppOrigin()}/api/agents/personas/${slug}`, {
      action: "run",
      source: "scheduler",
    }).catch((error) => {
      console.error(`Failed to trigger heartbeat ${slug}:`, error);
    });
  });

  scheduledHeartbeats.set(slug, task);
  console.log(`  Scheduled heartbeat: ${slug} (${cronExpr})`);
}

async function reloadSchedules(): Promise<void> {
  stopScheduledTasks();

  if (!fs.existsSync(AGENTS_DIR)) return;

  const entries = fs.readdirSync(AGENTS_DIR, { withFileTypes: true });
  let jobCount = 0;
  let heartbeatCount = 0;

  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith(".")) continue;

    const personaPath = path.join(AGENTS_DIR, entry.name, "persona.md");
    if (fs.existsSync(personaPath)) {
      try {
        const rawPersona = fs.readFileSync(personaPath, "utf-8");
        const { data } = matter(rawPersona);
        const active = data.active !== false;
        const heartbeat = typeof data.heartbeat === "string" ? data.heartbeat : "";
        if (active && heartbeat) {
          scheduleHeartbeat(entry.name, heartbeat);
          heartbeatCount++;
        }
      } catch {
        // Skip malformed personas.
      }
    }

    const jobsDir = path.join(AGENTS_DIR, entry.name, "jobs");
    if (!fs.existsSync(jobsDir)) continue;

    const jobFiles = fs.readdirSync(jobsDir);
    for (const jf of jobFiles) {
      if (!jf.endsWith(".yaml")) continue;

      try {
        const raw = fs.readFileSync(path.join(jobsDir, jf), "utf-8");
        const config: JobConfig = {
          ...normalizeJobConfig(
            yaml.load(raw) as Partial<JobConfig>,
            entry.name,
            normalizeJobId(path.basename(jf, ".yaml"))
          ),
          agentSlug: entry.name,
        };
        if (config.id && config.enabled && config.schedule) {
          scheduleJob(config);
          jobCount++;
        }
      } catch {
        // Skip malformed jobs.
      }
    }
  }

  console.log(`Scheduled ${jobCount} jobs and ${heartbeatCount} heartbeats.`);
}

function queueScheduleReload(): void {
  if (scheduleReloadTimer) {
    clearTimeout(scheduleReloadTimer);
  }

  scheduleReloadTimer = setTimeout(() => {
    scheduleReloadTimer = null;
    void reloadSchedules().catch((error) => {
      console.error("Failed to reload daemon schedules:", error);
    });
  }, 200);
}

// ===== HTTP Server =====

const server = http.createServer(async (req, res) => {
  applyCors(req, res);

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url || "", `http://localhost:${PORT}`);
  if (url.pathname !== "/health" && !isDaemonTokenValid(requestToken(req, url))) {
    rejectUnauthorized(res);
    return;
  }

  // GET /session/:id/output — retrieve captured output for a completed session
  const outputMatch = url.pathname.match(/^\/session\/([^/]+)\/output$/);
  if (outputMatch && req.method === "GET") {
    const sessionId = outputMatch[1];

    const active = sessions.get(sessionId);
    if (active) {
      const raw = active.output.join("");
      const plain = stripAnsi(raw);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          sessionId,
          status: active.resolvedStatus
            ? active.resolvedStatus
            : active.exited
              ? active.exitCode === 0
                ? "completed"
                : "failed"
              : "running",
          output: plain,
        })
      );
      return;
    }

    const conversationMeta = await readConversationMeta(sessionId).catch(() => null);
    if (conversationMeta) {
      const transcript = await readConversationTranscript(sessionId).catch(() => "");
      const plainTranscript = stripAnsi(transcript);
      let prompt = "";
      if (conversationMeta.promptPath) {
        const promptPath = path.join(DATA_DIR, conversationMeta.promptPath);
        if (fs.existsSync(promptPath)) {
          prompt = fs.readFileSync(promptPath, "utf8");
        }
      }
      if (
        conversationMeta.status === "running" &&
        transcriptShowsCompletedRun(plainTranscript, prompt)
      ) {
        await finalizeConversation(sessionId, {
          status: "completed",
          exitCode: 0,
          output: plainTranscript,
        }).catch(() => null);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            sessionId,
            status: "completed",
            output: plainTranscript,
          })
        );
        return;
      }
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          sessionId,
          status: conversationMeta.status,
          output: plainTranscript,
        })
      );
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

  // POST /sessions — create a PTY session without a WebSocket (for agent heartbeats)
  if (url.pathname === "/sessions" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        const {
          id,
          providerId,
          providerModel,
          prompt,
          cwd,
          allowedRoots,
          timeoutSeconds,
        } = JSON.parse(body) as {
          id: string;
          providerId?: string;
          providerModel?: string;
          prompt?: string;
          cwd?: string;
          allowedRoots?: string[];
          timeoutSeconds?: number;
        };
        const sessionId = id || `session-${Date.now()}`;

        if (sessions.has(sessionId)) {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ sessionId, existing: true }));
          return;
        }

        try {
          createDetachedSession({
            sessionId,
            providerId,
            providerModel,
            prompt,
            cwd,
            allowedRoots,
            timeoutSeconds,
          });
        } catch (err: unknown) {
          const errMsg = err instanceof Error ? err.message : String(err);
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: errMsg }));
          return;
        }

        console.log(`Session ${sessionId} started via HTTP (agent mode)`);

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ sessionId }));
      } catch {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Invalid JSON" }));
      }
    });
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

  if (url.pathname === "/reload-schedules" && req.method === "POST") {
    try {
      await reloadSchedules();
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          ok: true,
          jobs: scheduledJobs.size,
          heartbeats: scheduledHeartbeats.size,
        })
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: message }));
    }
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
        scheduledHeartbeats: scheduledHeartbeats.size,
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
        const { agentSlug, jobId, prompt, providerId, providerModel, timeoutSeconds } = JSON.parse(body);
        if (prompt) {
          const sessionId = jobId || `manual-${Date.now()}`;
          createDetachedSession({
            sessionId,
            providerId,
            providerModel,
            prompt,
            timeoutSeconds,
          });
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ ok: true, sessionId, agentSlug: agentSlug || "manual" }));
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
  if (!isDaemonTokenValid(requestToken(req, url))) {
    socket.write("HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n");
    socket.destroy();
    return;
  }

  if (url.pathname === "/events" || url.pathname === "/api/daemon/events") {
    wssEvents.handleUpgrade(req, socket, head, (ws) => {
      wssEvents.emit("connection", ws, req);
    });
  } else if (url.pathname === "/" || url.pathname === "/api/daemon/pty") {
    wssPty.handleUpgrade(req, socket, head, (ws) => {
      wssPty.emit("connection", ws, req);
    });
  } else {
    socket.write("HTTP/1.1 404 Not Found\r\nConnection: close\r\n\r\n");
    socket.destroy();
  }
});

wssPty.on("connection", (ws, req) => {
  handlePtyConnection(ws, req as http.IncomingMessage);
});

wssEvents.on("connection", (ws) => {
  handleEventBusConnection(ws);
});

// ===== Startup =====

const scheduleWatcher = chokidar.watch(
  [path.join(AGENTS_DIR, "*/persona.md"), path.join(AGENTS_DIR, "*/jobs/*.yaml")],
  {
    ignoreInitial: true,
  }
);

scheduleWatcher.on("all", () => {
  queueScheduleReload();
});

server.listen(PORT, () => {
  console.log(`Cabinet Daemon running on port ${PORT}`);
  console.log(`  Terminal WebSocket: ws://localhost:${PORT}/api/daemon/pty`);
  console.log(`  Events WebSocket: ws://localhost:${PORT}/api/daemon/events`);
  console.log(`  Session API: http://localhost:${PORT}/sessions`);
  console.log(`  Reload schedules: POST http://localhost:${PORT}/reload-schedules`);
  console.log(`  Health check: http://localhost:${PORT}/health`);
  console.log(`  Trigger endpoint: POST http://localhost:${PORT}/trigger`);
  console.log(`  Default provider: ${resolveProviderId()}`);
  console.log(`  Working directory: ${DATA_DIR}`);

  void reloadSchedules();
});

// ===== Graceful Shutdown =====

process.on("SIGINT", () => {
  console.log("\nShutting down...");
  for (const [, task] of scheduledJobs) {
    task.stop();
  }
  for (const [, task] of scheduledHeartbeats) {
    task.stop();
  }
  for (const [, session] of sessions) {
    try { session.pty?.kill(); } catch {}
    try { session.acpKill?.(); } catch {}
  }
  void scheduleWatcher.close();
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
