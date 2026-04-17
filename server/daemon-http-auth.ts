import type http from "http";
import { getTokenFromAuthorizationHeader } from "../src/lib/agents/daemon-auth";

export interface CorsOptions {
  allowedBrowserOrigins: Set<string>;
}

export function applyCors(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  options: CorsOptions,
): void {
  const origin = req.headers.origin;
  if (origin && options.allowedBrowserOrigins.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
}

export function extractDaemonRequestToken(
  req: http.IncomingMessage,
  url: URL,
): string | null {
  const authHeader = Array.isArray(req.headers.authorization)
    ? req.headers.authorization[0]
    : req.headers.authorization;
  return getTokenFromAuthorizationHeader(authHeader) || url.searchParams.get("token");
}

export function rejectUnauthorized(res: http.ServerResponse): void {
  res.writeHead(401, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Unauthorized" }));
}
