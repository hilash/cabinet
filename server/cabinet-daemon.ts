/**
 * Cabinet Daemon — unified background server
 *
 * Thin composer that wires six self-contained modules:
 * - pty-manager         — PTY session lifecycle (WS terminal + headless sessions)
 * - scheduler           — cron-driven jobs, heartbeats, health checks
 * - event-bus           — real-time WebSocket fan-out to the web UI
 * - daemon-http         — REST endpoints consumed by the Next.js app
 * - daemon-supervisor   — service modules + config watcher + chokidar reload
 * - service-supervisor  — restart policy for each sub-service
 *
 * This file composes dependencies, routes WebSocket upgrades, and manages
 * graceful shutdown. All state lives inside the modules above.
 *
 * Usage: npx tsx server/cabinet-daemon.ts
 */

import http from "http";
import path from "path";
import { WebSocketServer } from "ws";
import { closeDb, getDb } from "./db";
import { DATA_DIR } from "../src/lib/storage/path-utils";
import {
  getAppOrigin,
  getDaemonPort,
} from "../src/lib/runtime/runtime-config";
import { resolveProviderId } from "../src/lib/agents/provider-runtime";
import { getNvmNodeBin } from "../src/lib/agents/nvm-path";
import { isDaemonTokenValid } from "../src/lib/agents/daemon-auth";
import { createPtyManager } from "./pty-manager";
import { createEventBus } from "./event-bus";
import { createScheduler } from "./scheduler";
import { createDaemonRequestHandler } from "./daemon-http";
import { extractDaemonRequestToken } from "./daemon-http-auth";
import { createDaemonSupervisor } from "./daemon-supervisor";

const PORT = getDaemonPort();
const AGENTS_DIR = path.join(DATA_DIR, ".agents");
const ALLOWED_BROWSER_ORIGINS = new Set(
  [
    getAppOrigin(),
    ...(process.env.CABINET_APP_ORIGIN
      ? process.env.CABINET_APP_ORIGIN.split(",").map((value) => value.trim()).filter(Boolean)
      : []),
  ],
);

console.log("Initializing Cabinet database...");
const db = getDb();
console.log("Database ready.");

const nvmBin = getNvmNodeBin();
const enrichedPath = [
  `${process.env.HOME}/.local/bin`,
  "/usr/local/bin",
  "/opt/homebrew/bin",
  ...(nvmBin ? [nvmBin] : []),
  process.env.PATH,
].join(":");

const pty = createPtyManager({
  dataDir: DATA_DIR,
  enrichedPath,
  port: PORT,
});

const eventBus = createEventBus();

const scheduler = createScheduler({
  agentsDir: AGENTS_DIR,
  dataDir: DATA_DIR,
  getAppOrigin,
});

const server = http.createServer(
  createDaemonRequestHandler({
    port: PORT,
    dataDir: DATA_DIR,
    allowedBrowserOrigins: ALLOWED_BROWSER_ORIGINS,
    pty,
    scheduler,
    getServiceModules: () => supervisor.modules,
  }),
);

const wssPty = new WebSocketServer({ noServer: true });
const wssEvents = new WebSocketServer({ noServer: true });

server.on("upgrade", (req, socket, head) => {
  const url = new URL(req.url || "", `http://localhost:${PORT}`);
  if (!isDaemonTokenValid(extractDaemonRequestToken(req, url))) {
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
  pty.handleConnection(ws, req as http.IncomingMessage);
});

wssEvents.on("connection", (ws) => {
  eventBus.handleConnection(ws);
});

wssPty.on("error", (err) => {
  console.error("PTY WebSocket error:", err.message);
});

wssEvents.on("error", (err) => {
  console.error("Events WebSocket error:", err.message);
});

const supervisor = createDaemonSupervisor({
  dataDir: DATA_DIR,
  db,
  agentsDir: AGENTS_DIR,
  server,
  port: PORT,
  scheduler,
  onTerminalReady: () => {
    console.log(`Cabinet Daemon running on port ${PORT}`);
    console.log(`  Terminal WebSocket: ws://localhost:${PORT}/api/daemon/pty`);
    console.log(`  Events WebSocket: ws://localhost:${PORT}/api/daemon/events`);
    console.log(`  Session API: http://localhost:${PORT}/sessions`);
    console.log(`  Reload schedules: POST http://localhost:${PORT}/reload-schedules`);
    console.log(`  Health check: http://localhost:${PORT}/health`);
    console.log(`  Trigger endpoint: POST http://localhost:${PORT}/trigger`);
    console.log(`  Default provider: ${resolveProviderId()}`);
    console.log(`  Working directory: ${DATA_DIR}`);
    void scheduler.reload();
  },
});

void supervisor.start().catch((err) => {
  console.error(
    "[supervisor] fatal startup error:",
    err instanceof Error ? err.stack || err.message : String(err),
  );
  process.exitCode = 1;
  void shutdown();
});

let shuttingDown = false;

async function shutdown(): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log("\nShutting down...");
  await supervisor.stop();
  scheduler.stopAll();
  pty.stop();
  closeDb();
  await new Promise<void>((resolve) => {
    if (!server.listening) {
      resolve();
      return;
    }
    server.close(() => resolve());
  });
  process.exit(0);
}

process.on("SIGINT", () => {
  void shutdown();
});
process.on("SIGTERM", () => {
  void shutdown();
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught exception:", err.message);
});

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled rejection:", reason);
});
