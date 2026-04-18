import type http from "http";
import type { WebSocket } from "ws";
import {
  getTokenFromAuthorizationHeader,
  isDaemonTokenValid,
} from "../src/lib/agents/runtime/daemon-auth";

export const LOOPBACK_HOST = "127.0.0.1";

interface TerminalServerAuthResponse {
  writeHead(statusCode: number, headers?: Record<string, string>): unknown;
  end(body?: string): unknown;
}

function getHeaderToken(req: Pick<http.IncomingMessage, "headers">): string | null {
  const authHeader = Array.isArray(req.headers.authorization)
    ? req.headers.authorization[0]
    : req.headers.authorization;

  return getTokenFromAuthorizationHeader(authHeader);
}

// HTTP routes must use the Authorization header only. Tokens in the query
// string leak into reverse-proxy logs, shell history (ps), and browser
// history, so reject them here even if the caller appended `?token=`.
export function getTerminalServerHttpToken(
  req: Pick<http.IncomingMessage, "headers">,
): string | null {
  return getHeaderToken(req);
}

// WebSocket connections opened from the browser cannot set custom headers,
// so the query-string fallback is the only way for the UI to authenticate.
export function getTerminalServerWebSocketToken(
  req: Pick<http.IncomingMessage, "headers">,
  url: URL,
): string | null {
  return getHeaderToken(req) || url.searchParams.get("token");
}

export function requireTerminalServerHttpAuth(
  req: Pick<http.IncomingMessage, "headers">,
  res: TerminalServerAuthResponse,
  _url: URL,
): boolean {
  if (isDaemonTokenValid(getTerminalServerHttpToken(req))) {
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
  if (isDaemonTokenValid(getTerminalServerWebSocketToken(req, url))) {
    return true;
  }

  ws.close(1008, "unauthorized");
  return false;
}
