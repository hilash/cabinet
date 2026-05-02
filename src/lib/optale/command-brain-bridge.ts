import { createHmac } from "crypto";

export type OptaleCommandBrainAuthMode =
  | "disabled"
  | "user-jwt"
  | "service-jwt"
  | "service-claims";

export interface OptaleCommandBrainAllowedRoute {
  id: string;
  pattern: string;
  upstreamPattern: string;
}

export interface OptaleCommandBrainAllowedMutationRoute
  extends OptaleCommandBrainAllowedRoute {
  method: "POST" | "PATCH";
}

export interface OptaleCommandBrainMatchedRoute {
  id: string;
  normalizedPath: string;
  upstreamPath: string;
}

export interface OptaleCommandBrainBridgeStatus {
  enabled: boolean;
  configured: boolean;
  readOnly: true;
  origin?: string;
  authMode: OptaleCommandBrainAuthMode;
  reason?: string;
  allowedRoutes: OptaleCommandBrainAllowedRoute[];
}

export interface OptaleCommandBrainPublicStatus {
  enabled: boolean;
  configured: boolean;
  readOnly: true;
  authModeConfigured: boolean;
  reason?: string;
  allowedRoutes: OptaleCommandBrainAllowedRoute[];
}

export interface OptaleCommandBrainBridgeResult {
  status: number;
  body: unknown;
  contentType: string;
  upstreamUrl?: string;
}

export interface OptaleCommandBrainActorClaims {
  userId: string;
  role?: string;
  tenantId?: string;
  subjectType?: string;
  allowedTargetIds?: string[];
}

type OptaleCommandBrainEnv = Record<string, string | undefined>;

type FetchLike = (
  input: string | URL,
  init?: RequestInit
) => Promise<Response>;

const READ_ONLY_ROUTES: Array<{
  id: string;
  pattern: string[];
}> = [
  { id: "brain.companyTargets", pattern: ["brain", "company-targets"] },
  {
    id: "brain.companyTargetHealth",
    pattern: ["brain", "company-targets", ":targetId", "health"],
  },
  { id: "brain.promotions", pattern: ["brain", "promotions"] },
  { id: "brain.promotion", pattern: ["brain", "promotions", ":promotionId"] },
  { id: "companyBrain.targets", pattern: ["company-brain", "targets"] },
  {
    id: "companyBrain.overview",
    pattern: ["company-brain", ":targetId", "overview"],
  },
  {
    id: "companyBrain.health",
    pattern: ["company-brain", ":targetId", "health"],
  },
  {
    id: "companyBrain.promotions",
    pattern: ["company-brain", ":targetId", "promotions"],
  },
  {
    id: "companyBrain.reviewQueue",
    pattern: ["company-brain", ":targetId", "review-queue"],
  },
];

const MUTATION_ROUTES: Array<{
  id: string;
  method: "POST" | "PATCH";
  pattern: string[];
}> = [
  {
    id: "brain.createPromotion",
    method: "POST",
    pattern: ["brain", "promotions"],
  },
  {
    id: "companyBrain.reviewAgent",
    method: "POST",
    pattern: ["company-brain", ":targetId", "promotions", ":promotionId", "review-agent"],
  },
  {
    id: "companyBrain.review",
    method: "PATCH",
    pattern: ["company-brain", ":targetId", "promotions", ":promotionId", "review"],
  },
  {
    id: "companyBrain.promote",
    method: "POST",
    pattern: ["company-brain", ":targetId", "promotions", ":promotionId", "promote"],
  },
];

function trimString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function envValue(
  env: OptaleCommandBrainEnv,
  name: string
): string | undefined {
  return trimString(env[name]);
}

function normalizeOrigin(value: string | undefined): string | undefined {
  if (!value) return undefined;
  return value.replace(/\/+$/, "");
}

function normalizeAuthMode(value: string | undefined): OptaleCommandBrainAuthMode {
  if (value === "user-jwt" || value === "service-jwt" || value === "service-claims") {
    return value;
  }
  return "disabled";
}

function routePatternLabel(pattern: string[]): string {
  return `/api/${pattern.join("/")}`;
}

export function listCommandBrainAllowedRoutes(): OptaleCommandBrainAllowedRoute[] {
  return READ_ONLY_ROUTES.map((route) => ({
    id: route.id,
    pattern: route.pattern.join("/"),
    upstreamPattern: routePatternLabel(route.pattern),
  }));
}

export function listCommandBrainAllowedMutationRoutes(): OptaleCommandBrainAllowedMutationRoute[] {
  return MUTATION_ROUTES.map((route) => ({
    id: route.id,
    method: route.method,
    pattern: route.pattern.join("/"),
    upstreamPattern: routePatternLabel(route.pattern),
  }));
}

function safeSegment(segment: string): string | undefined {
  let decoded: string;
  try {
    decoded = decodeURIComponent(segment).trim();
  } catch {
    return undefined;
  }
  if (!decoded || decoded === "." || decoded === "..") return undefined;
  if (decoded.includes("/") || decoded.includes("\\") || decoded.includes("\0")) {
    return undefined;
  }
  return decoded;
}

export function normalizeCommandBrainPath(
  path: string | string[]
): string[] | undefined {
  const rawSegments = Array.isArray(path) ? path : path.split("/");
  const segments: string[] = [];

  for (const rawSegment of rawSegments) {
    if (!rawSegment) continue;
    const segment = safeSegment(rawSegment);
    if (!segment) return undefined;
    segments.push(segment);
  }

  if (segments[0] === "api") segments.shift();
  if (segments.length === 0) return undefined;
  return segments;
}

function matchPattern(pattern: string[], segments: string[]): boolean {
  if (pattern.length !== segments.length) return false;
  return pattern.every((part, index) => part.startsWith(":") || part === segments[index]);
}

export function matchCommandBrainReadPath(
  path: string | string[]
): OptaleCommandBrainMatchedRoute | undefined {
  const segments = normalizeCommandBrainPath(path);
  if (!segments) return undefined;

  const route = READ_ONLY_ROUTES.find((candidate) =>
    matchPattern(candidate.pattern, segments)
  );
  if (!route) return undefined;

  const upstreamPath = `/api/${segments.map(encodeURIComponent).join("/")}`;
  return {
    id: route.id,
    normalizedPath: segments.join("/"),
    upstreamPath,
  };
}

export function matchCommandBrainMutationPath(
  path: string | string[],
  method: string
): OptaleCommandBrainMatchedRoute | undefined {
  const segments = normalizeCommandBrainPath(path);
  if (!segments) return undefined;
  const normalizedMethod = method.toUpperCase();

  const route = MUTATION_ROUTES.find(
    (candidate) =>
      candidate.method === normalizedMethod && matchPattern(candidate.pattern, segments)
  );
  if (!route) return undefined;

  const upstreamPath = `/api/${segments.map(encodeURIComponent).join("/")}`;
  return {
    id: route.id,
    normalizedPath: segments.join("/"),
    upstreamPath,
  };
}

export function isCommandBrainReadMethod(method: string): boolean {
  return method.toUpperCase() === "GET";
}

export function getCommandBrainBridgeStatus(
  env: OptaleCommandBrainEnv = process.env
): OptaleCommandBrainBridgeStatus {
  const origin = normalizeOrigin(envValue(env, "OPTALE_COMMAND_BRAIN_ORIGIN"));
  const authMode = normalizeAuthMode(envValue(env, "OPTALE_COMMAND_BRAIN_AUTH_MODE"));
  const allowedRoutes = listCommandBrainAllowedRoutes();

  if (!origin) {
    return {
      enabled: false,
      configured: false,
      readOnly: true,
      authMode,
      reason: "OPTALE_COMMAND_BRAIN_ORIGIN is not configured.",
      allowedRoutes,
    };
  }

  if (authMode === "disabled") {
    return {
      enabled: false,
      configured: false,
      readOnly: true,
      origin,
      authMode,
      reason: "OPTALE_COMMAND_BRAIN_AUTH_MODE is disabled or not configured.",
      allowedRoutes,
    };
  }

  if (authMode === "service-claims") {
    if (!envValue(env, "OPTALE_COMMAND_BRAIN_SERVICE_TOKEN")) {
      return {
        enabled: false,
        configured: false,
        readOnly: true,
        origin,
        authMode,
        reason: "OPTALE_COMMAND_BRAIN_SERVICE_TOKEN is required for service-claims mode.",
        allowedRoutes,
      };
    }
    return {
      enabled: false,
      configured: false,
      readOnly: true,
      origin,
      authMode,
      reason:
        "service-claims mode requires verified acting-user claims and is not enabled by this route yet.",
      allowedRoutes,
    };
  }

  if (authMode === "service-jwt") {
    if (!envValue(env, "OPTALE_COMMAND_BRAIN_JWT_SECRET")) {
      return {
        enabled: false,
        configured: false,
        readOnly: true,
        origin,
        authMode,
        reason: "OPTALE_COMMAND_BRAIN_JWT_SECRET is required for service-jwt mode.",
        allowedRoutes,
      };
    }
    if (!envValue(env, "OPTALE_COMMAND_BRAIN_SERVICE_USER_ID")) {
      return {
        enabled: false,
        configured: false,
        readOnly: true,
        origin,
        authMode,
        reason: "OPTALE_COMMAND_BRAIN_SERVICE_USER_ID is required for service-jwt mode.",
        allowedRoutes,
      };
    }
    return {
      enabled: true,
      configured: true,
      readOnly: true,
      origin,
      authMode,
      allowedRoutes,
    };
  }

  return {
    enabled: true,
    configured: true,
    readOnly: true,
    origin,
    authMode,
    allowedRoutes,
  };
}

export function getPublicCommandBrainBridgeStatus(
  env: OptaleCommandBrainEnv = process.env
): OptaleCommandBrainPublicStatus {
  const status = getCommandBrainBridgeStatus(env);
  return {
    enabled: status.enabled,
    configured: status.configured,
    readOnly: true,
    authModeConfigured: status.authMode !== "disabled",
    reason: status.reason,
    allowedRoutes: status.allowedRoutes,
  };
}

function bearerTokenFrom(headers?: Headers): string | undefined {
  const explicit = trimString(headers?.get("x-optale-command-jwt"));
  if (explicit) return explicit;
  const authorization = trimString(headers?.get("authorization"));
  const match = authorization?.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || undefined;
}

function requestIdFrom(headers?: Headers): string {
  return (
    trimString(headers?.get("x-request-id")) ||
    globalThis.crypto?.randomUUID?.() ||
    Math.random().toString(36).slice(2)
  );
}

function base64Url(value: Buffer | string): string {
  return Buffer.from(value)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function commandServiceJwt(input: {
  env: OptaleCommandBrainEnv;
  actor?: OptaleCommandBrainActorClaims;
}): string | undefined {
  const secret = envValue(input.env, "OPTALE_COMMAND_BRAIN_JWT_SECRET");
  const userId =
    envValue(input.env, "OPTALE_COMMAND_BRAIN_SERVICE_USER_ID") || input.actor?.userId;
  if (!secret || !userId) return undefined;

  const now = Math.floor(Date.now() / 1000);
  const ttl = Number(envValue(input.env, "OPTALE_COMMAND_BRAIN_JWT_TTL_SECONDS") || 300);
  const safeTtl = Number.isFinite(ttl) ? Math.min(Math.max(Math.trunc(ttl), 60), 900) : 300;
  const payload: Record<string, unknown> = {
    id: userId,
    iat: now,
    exp: now + safeTtl,
    iss: "optale-observatory",
    aud: "optale-command-brain",
  };
  const username = envValue(input.env, "OPTALE_COMMAND_BRAIN_SERVICE_USERNAME");
  const email = envValue(input.env, "OPTALE_COMMAND_BRAIN_SERVICE_EMAIL");
  if (username) payload.username = username;
  if (email) payload.email = email;

  const encodedHeader = base64Url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const encodedPayload = base64Url(JSON.stringify(payload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const signature = base64Url(createHmac("sha256", secret).update(signingInput).digest());
  return `${signingInput}.${signature}`;
}

function bridgeHeaders(input: {
  authMode: OptaleCommandBrainAuthMode;
  env: OptaleCommandBrainEnv;
  requestHeaders?: Headers;
  actor?: OptaleCommandBrainActorClaims;
  readOnly?: boolean;
}): Headers | OptaleCommandBrainBridgeResult {
  const headers = new Headers({
    Accept: "application/json",
    "X-Optale-Observatory-Bridge": "brain",
    "X-Optale-Observatory-Read-Only": input.readOnly === false ? "false" : "true",
    "X-Request-Id": requestIdFrom(input.requestHeaders),
  });

  if (input.authMode === "user-jwt") {
    const token = bearerTokenFrom(input.requestHeaders);
    if (!token) {
      return {
        status: 401,
        contentType: "application/json",
        body: {
          error: "CommandBrainAuthRequired",
          message:
            "Command Brain bridge is in user-jwt mode, but no explicit bearer token was provided.",
        },
      };
    }
    headers.set("Authorization", `Bearer ${token}`);
    return headers;
  }

  if (input.authMode === "service-jwt") {
    const token = commandServiceJwt({
      env: input.env,
      actor: input.actor,
    });
    if (!token) {
      return {
        status: 503,
        contentType: "application/json",
        body: {
          error: "CommandBrainBridgeDisabled",
          message:
            "OPTALE_COMMAND_BRAIN_JWT_SECRET and OPTALE_COMMAND_BRAIN_SERVICE_USER_ID are required for service-jwt mode.",
        },
      };
    }
    headers.set("Authorization", `Bearer ${token}`);
    headers.set("X-Optale-Service-Actor", "observatory");
    if (input.actor?.tenantId) headers.set("X-Optale-Tenant-Id", input.actor.tenantId);
    if (input.actor?.subjectType) {
      headers.set("X-Optale-Subject-Type", input.actor.subjectType);
    }
    if (input.actor?.allowedTargetIds?.length) {
      headers.set("X-Optale-Allowed-Target-Ids", input.actor.allowedTargetIds.join(","));
    }
    return headers;
  }

  if (input.authMode === "service-claims") {
    if (!input.actor?.userId) {
      return {
        status: 401,
        contentType: "application/json",
        body: {
          error: "CommandBrainActorClaimsRequired",
          message:
            "service-claims mode requires verified acting-user claims before proxying Command Brain.",
        },
      };
    }
    const token = envValue(input.env, "OPTALE_COMMAND_BRAIN_SERVICE_TOKEN");
    if (!token) {
      return {
        status: 503,
        contentType: "application/json",
        body: {
          error: "CommandBrainBridgeDisabled",
          message: "OPTALE_COMMAND_BRAIN_SERVICE_TOKEN is not configured.",
        },
      };
    }
    headers.set("Authorization", `Bearer ${token}`);
    headers.set("X-Optale-User-Id", input.actor.userId);
    if (input.actor.role) headers.set("X-Optale-User-Role", input.actor.role);
    if (input.actor.tenantId) headers.set("X-Optale-Tenant-Id", input.actor.tenantId);
    if (input.actor.subjectType) {
      headers.set("X-Optale-Subject-Type", input.actor.subjectType);
    }
    if (input.actor.allowedTargetIds?.length) {
      headers.set("X-Optale-Allowed-Target-Ids", input.actor.allowedTargetIds.join(","));
    }
    return headers;
  }

  return {
    status: 503,
    contentType: "application/json",
    body: {
      error: "CommandBrainBridgeDisabled",
      message: "Command Brain bridge auth mode is disabled.",
    },
  };
}

function parseBody(contentType: string, text: string): unknown {
  if (!text) return null;
  if (!contentType.toLowerCase().includes("application/json")) return text;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export async function proxyCommandBrainRead(input: {
  path: string | string[];
  searchParams?: URLSearchParams;
  requestHeaders?: Headers;
  actor?: OptaleCommandBrainActorClaims;
  env?: OptaleCommandBrainEnv;
  fetchImpl?: FetchLike;
}): Promise<OptaleCommandBrainBridgeResult> {
  const env = input.env || process.env;
  const status = getCommandBrainBridgeStatus(env);
  if (!status.enabled || !status.origin) {
    return {
      status: 503,
      contentType: "application/json",
      body: {
        error: "CommandBrainBridgeDisabled",
        message: status.reason || "Command Brain bridge is disabled.",
        bridge: getPublicCommandBrainBridgeStatus(env),
      },
    };
  }

  const route = matchCommandBrainReadPath(input.path);
  if (!route) {
    return {
      status: 403,
      contentType: "application/json",
      body: {
        error: "CommandBrainRouteNotAllowed",
        message: "This Command Brain route is not in the read-only allowlist.",
        allowedRoutes: status.allowedRoutes,
      },
    };
  }

  const headers = bridgeHeaders({
    authMode: status.authMode,
    env,
    requestHeaders: input.requestHeaders,
    actor: input.actor,
    readOnly: true,
  });
  if (!(headers instanceof Headers)) return headers;

  const upstreamUrl = new URL(`${status.origin}${route.upstreamPath}`);
  if (input.searchParams) {
    upstreamUrl.search = input.searchParams.toString();
  }

  try {
    const response = await (input.fetchImpl || fetch)(upstreamUrl, {
      method: "GET",
      headers,
      cache: "no-store",
    });
    const contentType = response.headers.get("content-type") || "application/json";
    const text = await response.text();
    return {
      status: response.status,
      contentType,
      upstreamUrl: upstreamUrl.toString(),
      body: parseBody(contentType, text),
    };
  } catch (error) {
    return {
      status: 502,
      contentType: "application/json",
      upstreamUrl: upstreamUrl.toString(),
      body: {
        error: "CommandBrainUpstreamError",
        message: error instanceof Error ? error.message : "Command Brain request failed.",
      },
    };
  }
}

export async function proxyCommandBrainMutation(input: {
  path: string | string[];
  method: "POST" | "PATCH";
  body?: unknown;
  requestHeaders?: Headers;
  actor?: OptaleCommandBrainActorClaims;
  env?: OptaleCommandBrainEnv;
  fetchImpl?: FetchLike;
}): Promise<OptaleCommandBrainBridgeResult> {
  const env = input.env || process.env;
  const status = getCommandBrainBridgeStatus(env);
  if (!status.enabled || !status.origin) {
    return {
      status: 503,
      contentType: "application/json",
      body: {
        error: "CommandBrainBridgeDisabled",
        message: status.reason || "Command Brain bridge is disabled.",
        bridge: getPublicCommandBrainBridgeStatus(env),
      },
    };
  }

  const route = matchCommandBrainMutationPath(input.path, input.method);
  if (!route) {
    return {
      status: 403,
      contentType: "application/json",
      body: {
        error: "CommandBrainRouteNotAllowed",
        message: "This Command Brain route is not in the mutation allowlist.",
        allowedRoutes: listCommandBrainAllowedMutationRoutes(),
      },
    };
  }

  const headers = bridgeHeaders({
    authMode: status.authMode,
    env,
    requestHeaders: input.requestHeaders,
    actor: input.actor,
    readOnly: false,
  });
  if (!(headers instanceof Headers)) return headers;
  headers.set("Content-Type", "application/json");
  headers.set("X-Optale-Observatory-Action", route.id);

  const upstreamUrl = new URL(`${status.origin}${route.upstreamPath}`);

  try {
    const response = await (input.fetchImpl || fetch)(upstreamUrl, {
      method: input.method,
      headers,
      body: JSON.stringify(input.body || {}),
      cache: "no-store",
    });
    const contentType = response.headers.get("content-type") || "application/json";
    const text = await response.text();
    return {
      status: response.status,
      contentType,
      upstreamUrl: upstreamUrl.toString(),
      body: parseBody(contentType, text),
    };
  } catch (error) {
    return {
      status: 502,
      contentType: "application/json",
      upstreamUrl: upstreamUrl.toString(),
      body: {
        error: "CommandBrainUpstreamError",
        message: error instanceof Error ? error.message : "Command Brain request failed.",
      },
    };
  }
}
