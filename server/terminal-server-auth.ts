import type http from "http";
import type { WebSocket } from "ws";
import {
  getTokenFromAuthorizationHeader,
  isDaemonTokenValid,
} from "../src/lib/agents/daemon-auth";

export const LOOPBACK_HOST = "127.0.0.1";

interface TerminalServerAuthResponse {
  writeHead(statusCode: number, headers?: Record<string, string>): unknown;
  end(body?: string): unknown;
}

export function getTerminalServerToken(
  req: Pick<http.IncomingMessage, "headers">,
  url: URL,
): string | null {
  const authHeader = Array.isArray(req.headers.authorization)
    ? req.headers.authorization[0]
    : req.headers.authorization;

  return getTokenFromAuthorizationHeader(authHeader) || url.searchParams.get("token");
}

export function requireTerminalServerHttpAuth(
  req: Pick<http.IncomingMessage, "headers">,
  res: TerminalServerAuthResponse,
  url: URL,
): boolean {
  if (isDaemonTokenValid(getTerminalServerToken(req, url))) {
    return true;
  }

  res.writeHead(401, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Unauthorized" }));
  return false;
}

export function requireTerminalServerWebSocketAuth(
  ws: Pick<WebSocket, "close">,
  req: Pick<http.IncomingMessage, "headers">,
  url: URL,
): boolean {
  if (isDaemonTokenValid(getTerminalServerToken(req, url))) {
    return true;
  }

  ws.close(1008, "unauthorized");
  return false;
}
