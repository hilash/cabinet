/**
 * Cabinet Daemon — unified background server
 *
 * Extends terminal-server.ts with:
 * - Job scheduler (node-cron for agent jobs)
 * - WebSocket event broadcast channels
 * - SQLite database initialization
 *
 * Usage: npx tsx server/cabinet-daemon.ts
 */

import { WebSocketServer, WebSocket } from "ws";
import path from "path";
import http from "http";
import fs from "fs";
import cron from "node-cron";
import yaml from "js-yaml";
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

// ----- WebSocket Event Bus -----

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

// ----- Job Scheduler -----

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
  // Scan agent directories for jobs
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

  // Stop existing schedule if any
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

  // Record job run in SQLite
  db.prepare(
    `INSERT INTO job_runs (id, job_id, agent_slug, status, started_at)
     VALUES (?, ?, ?, 'running', datetime('now'))`
  ).run(runId, job.id, job.agentSlug);

  const proc = spawn(
    resolveClaudePath(),
    ["--dangerously-skip-permissions", "-p", job.prompt, "--output-format", "text"],
    {
      cwd: DATA_DIR,
      env: {
        ...process.env,
        PATH: `${process.env.HOME}/.local/bin:${process.env.PATH}`,
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

// ----- Claude Binary Resolution -----

function resolveClaudePath(): string {
  const candidates = [
    path.join(process.env.HOME || "", ".local", "bin", "claude"),
    "/usr/local/bin/claude",
    "/opt/homebrew/bin/claude",
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }

  try {
    const resolved = execSync("which claude", {
      encoding: "utf8",
      env: {
        ...process.env,
        PATH: `${process.env.HOME}/.local/bin:${process.env.PATH}`,
      },
    }).trim();
    if (resolved) return resolved;
  } catch {}

  return "claude";
}

// ----- HTTP Server + WebSocket -----

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

  // Health check
  if (url.pathname === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        status: "ok",
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

const wss = new WebSocketServer({ server, path: "/events" });

wss.on("connection", (ws) => {
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
});

// ----- Startup -----

server.listen(PORT, () => {
  console.log(`Cabinet Daemon running on port ${PORT}`);
  console.log(`  Events WebSocket: ws://localhost:${PORT}/events`);
  console.log(`  Health check: http://localhost:${PORT}/health`);
  console.log(`  Trigger endpoint: POST http://localhost:${PORT}/trigger`);

  loadAndScheduleJobs();
});

// ----- Graceful Shutdown -----

process.on("SIGINT", () => {
  console.log("\nShutting down...");
  for (const [, task] of scheduledJobs) {
    task.stop();
  }
  closeDb();
  server.close();
  process.exit(0);
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught exception:", err.message);
});

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled rejection:", reason);
});
