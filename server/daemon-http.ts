import type http from "http";
import { isDaemonTokenValid } from "../src/lib/agents/runtime/daemon-auth";
import { writeCabinetDaemonHealthResponse } from "./cabinet-daemon-health";
import type { ServiceModule } from "./service-module";
import type { PtyCreateRequest } from "./daemon-bus";
import type { PtyManager } from "./pty-manager";
import type { Scheduler } from "./scheduler";
import {
  applyCors,
  extractDaemonRequestToken,
  rejectUnauthorized,
} from "./daemon-http-auth";
import { resolveSessionOutput } from "./session-output";

export interface DaemonHttpOptions {
  port: number;
  dataDir: string;
  allowedBrowserOrigins: Set<string>;
  pty: PtyManager;
  scheduler: Scheduler;
  getServiceModules: () => ServiceModule[];
}

type Handler = (req: http.IncomingMessage, res: http.ServerResponse) => Promise<void> | void;

export function createDaemonRequestHandler(opts: DaemonHttpOptions): Handler {
  const { port, dataDir, allowedBrowserOrigins, pty, scheduler, getServiceModules } = opts;
  const corsOptions = { allowedBrowserOrigins };

  return async (req, res) => {
    applyCors(req, res, corsOptions);

    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = new URL(req.url || "", `http://localhost:${port}`);
    const isHealthRequest = url.pathname === "/health" && req.method === "GET";
    if (!isHealthRequest && !isDaemonTokenValid(extractDaemonRequestToken(req, url))) {
      rejectUnauthorized(res);
      return;
    }

    const outputMatch = url.pathname.match(/^\/session\/([^/]+)\/output$/);
    if (outputMatch && req.method === "GET") {
      const sessionId = outputMatch[1];
      const snapshot = await resolveSessionOutput(sessionId, { pty, dataDir });
      if (snapshot) {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(snapshot));
        return;
      }
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Session not found" }));
      return;
    }

    if (url.pathname === "/sessions" && req.method === "POST") {
      let body = "";
      req.on("data", (chunk) => (body += chunk));
      req.on("end", () => {
        try {
          const request = pty.resolveCreateRequest(JSON.parse(body) as PtyCreateRequest);
          const result = pty.createOrReuseSession(request);
          console.log(`Session ${result.sessionId} started via HTTP (agent mode)`);
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify(
              result.existing
                ? { sessionId: result.sessionId, existing: true }
                : { sessionId: result.sessionId },
            ),
          );
        } catch (err: unknown) {
          if (err instanceof SyntaxError) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Invalid JSON" }));
            return;
          }

          const errMsg = err instanceof Error ? err.message : String(err);
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: errMsg }));
          return;
        }
      });
      return;
    }

    if (url.pathname === "/sessions" && req.method === "GET") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(pty.listSessions()));
      return;
    }

    if (url.pathname === "/reload-schedules" && req.method === "POST") {
      try {
        await scheduler.reload();
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true, ...scheduler.counts() }));
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: message }));
      }
      return;
    }

    if (isHealthRequest) {
      writeCabinetDaemonHealthResponse(res, getServiceModules());
      return;
    }

    if (url.pathname === "/trigger" && req.method === "POST") {
      let body = "";
      req.on("data", (chunk) => (body += chunk));
      req.on("end", () => {
        try {
          const { agentSlug, jobId, prompt, providerId, timeoutSeconds } = JSON.parse(body);
          if (prompt) {
            const sessionId = jobId || `manual-${Date.now()}`;
            pty.createSession({
              sessionId,
              providerId,
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
  };
}
