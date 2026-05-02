import test from "node:test";
import assert from "node:assert/strict";
import {
  getCommandBrainBridgeStatus,
  getPublicCommandBrainBridgeStatus,
  matchCommandBrainReadPath,
  matchCommandBrainMutationPath,
  normalizeCommandBrainPath,
  proxyCommandBrainMutation,
  proxyCommandBrainRead,
} from "./command-brain-bridge";

test("matchCommandBrainReadPath allows only read-only Command Brain paths", () => {
  assert.deepEqual(matchCommandBrainReadPath("brain/promotions"), {
    id: "brain.promotions",
    normalizedPath: "brain/promotions",
    upstreamPath: "/api/brain/promotions",
  });
  assert.deepEqual(matchCommandBrainReadPath(["api", "company-brain", "optale-global", "review-queue"]), {
    id: "companyBrain.reviewQueue",
    normalizedPath: "company-brain/optale-global/review-queue",
    upstreamPath: "/api/company-brain/optale-global/review-queue",
  });

  assert.equal(matchCommandBrainReadPath("knowledge/graph"), undefined);
  assert.equal(matchCommandBrainReadPath("brain/promotions/abc/submit"), undefined);
  assert.equal(matchCommandBrainReadPath("company-brain/optale-global/promotions/abc/promote"), undefined);
  assert.equal(normalizeCommandBrainPath(["brain", "..", "promotions"]), undefined);
  assert.equal(normalizeCommandBrainPath(["brain", "%E0%A4%A", "promotions"]), undefined);
});

test("matchCommandBrainMutationPath allows only Company Brain action paths", () => {
  assert.deepEqual(matchCommandBrainMutationPath("brain/promotions", "POST"), {
    id: "brain.createPromotion",
    normalizedPath: "brain/promotions",
    upstreamPath: "/api/brain/promotions",
  });
  assert.deepEqual(
    matchCommandBrainMutationPath(
      "company-brain/optale-global/promotions/bp_123/review-agent",
      "POST"
    ),
    {
      id: "companyBrain.reviewAgent",
      normalizedPath: "company-brain/optale-global/promotions/bp_123/review-agent",
      upstreamPath: "/api/company-brain/optale-global/promotions/bp_123/review-agent",
    }
  );
  assert.deepEqual(
    matchCommandBrainMutationPath(
      ["api", "company-brain", "optale-global", "promotions", "bp_123", "review"],
      "PATCH"
    )?.id,
    "companyBrain.review"
  );
  assert.equal(
    matchCommandBrainMutationPath(
      "company-brain/optale-global/promotions/bp_123/promote",
      "GET"
    ),
    undefined
  );
  assert.equal(
    matchCommandBrainMutationPath("brain/promotions/bp_123/submit", "POST"),
    undefined
  );
  assert.equal(matchCommandBrainMutationPath("brain/promotions", "PATCH"), undefined);
});

test("getCommandBrainBridgeStatus stays disabled until origin and auth mode are explicit", () => {
  const disabled = getCommandBrainBridgeStatus({});
  assert.equal(disabled.enabled, false);
  assert.equal(disabled.configured, false);
  assert.equal(disabled.authMode, "disabled");

  const missingMode = getCommandBrainBridgeStatus({
    OPTALE_COMMAND_BRAIN_ORIGIN: "https://command.example.com",
  });
  assert.equal(missingMode.enabled, false);
  assert.equal(missingMode.reason?.includes("AUTH_MODE"), true);

  const enabled = getCommandBrainBridgeStatus({
    OPTALE_COMMAND_BRAIN_ORIGIN: "https://command.example.com/",
    OPTALE_COMMAND_BRAIN_AUTH_MODE: "user-jwt",
  });
  assert.equal(enabled.enabled, true);
  assert.equal(enabled.configured, true);
  assert.equal(enabled.origin, "https://command.example.com");
  assert.equal(enabled.readOnly, true);

  const serviceClaims = getCommandBrainBridgeStatus({
    OPTALE_COMMAND_BRAIN_ORIGIN: "https://command.example.com",
    OPTALE_COMMAND_BRAIN_AUTH_MODE: "service-claims",
    OPTALE_COMMAND_BRAIN_SERVICE_TOKEN: "service-token",
  });
  assert.equal(serviceClaims.enabled, false);
  assert.equal(serviceClaims.configured, false);
  assert.equal(serviceClaims.reason?.includes("acting-user claims"), true);

  const serviceJwt = getCommandBrainBridgeStatus({
    OPTALE_COMMAND_BRAIN_ORIGIN: "https://command.example.com",
    OPTALE_COMMAND_BRAIN_AUTH_MODE: "service-jwt",
    OPTALE_COMMAND_BRAIN_JWT_SECRET: "secret",
    OPTALE_COMMAND_BRAIN_SERVICE_USER_ID: "user-1",
  });
  assert.equal(serviceJwt.enabled, true);
  assert.equal(serviceJwt.configured, true);
  assert.equal(serviceJwt.authMode, "service-jwt");
});

test("getPublicCommandBrainBridgeStatus redacts upstream origin and auth mode", () => {
  const status = getPublicCommandBrainBridgeStatus({
    OPTALE_COMMAND_BRAIN_ORIGIN: "https://command.example.com/",
    OPTALE_COMMAND_BRAIN_AUTH_MODE: "user-jwt",
  });

  assert.equal(status.enabled, true);
  assert.equal(status.authModeConfigured, true);
  assert.equal("origin" in status, false);
  assert.equal("authMode" in status, false);
});

test("proxyCommandBrainRead rejects missing user JWT before fetching upstream", async () => {
  let calls = 0;
  const result = await proxyCommandBrainRead({
    path: "brain/promotions",
    env: {
      OPTALE_COMMAND_BRAIN_ORIGIN: "https://command.example.com",
      OPTALE_COMMAND_BRAIN_AUTH_MODE: "user-jwt",
    },
    fetchImpl: async () => {
      calls += 1;
      return new Response("{}");
    },
  });

  assert.equal(result.status, 401);
  assert.equal(calls, 0);
});

test("proxyCommandBrainRead keeps service-claims disabled until actor claims are implemented", async () => {
  let calls = 0;
  const result = await proxyCommandBrainRead({
    path: "brain/promotions",
    env: {
      OPTALE_COMMAND_BRAIN_ORIGIN: "https://command.example.com",
      OPTALE_COMMAND_BRAIN_AUTH_MODE: "service-claims",
      OPTALE_COMMAND_BRAIN_SERVICE_TOKEN: "service-token",
    },
    fetchImpl: async () => {
      calls += 1;
      return new Response("{}");
    },
  });

  assert.equal(result.status, 503);
  assert.equal(calls, 0);
});

test("proxyCommandBrainRead mints service-jwt auth without browser cookies", async () => {
  let capturedHeaders: Headers | undefined;
  const result = await proxyCommandBrainRead({
    path: "company-brain/optale-global/overview",
    requestHeaders: new Headers({
      cookie: "kb-auth=local-observatory-cookie",
      "x-request-id": "req-service",
    }),
    actor: {
      userId: "user-1",
      role: "ADMIN",
      tenantId: "optale",
      subjectType: "personal",
      allowedTargetIds: ["optale-global"],
    },
    env: {
      OPTALE_COMMAND_BRAIN_ORIGIN: "https://command.example.com",
      OPTALE_COMMAND_BRAIN_AUTH_MODE: "service-jwt",
      OPTALE_COMMAND_BRAIN_JWT_SECRET: "secret",
      OPTALE_COMMAND_BRAIN_SERVICE_USER_ID: "user-1",
      OPTALE_COMMAND_BRAIN_SERVICE_EMAIL: "thor@optale.no",
    },
    fetchImpl: async (_input, init) => {
      capturedHeaders = init?.headers as Headers;
      return new Response(JSON.stringify({ target: {} }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    },
  });

  assert.equal(result.status, 200);
  assert.match(capturedHeaders?.get("authorization") || "", /^Bearer [^.]+\.[^.]+\.[^.]+$/);
  assert.equal(capturedHeaders?.get("cookie"), null);
  assert.equal(capturedHeaders?.get("x-optale-service-actor"), "observatory");
  assert.equal(capturedHeaders?.get("x-optale-allowed-target-ids"), "optale-global");
});

test("proxyCommandBrainRead forwards explicit bearer auth without browser cookies", async () => {
  let capturedUrl = "";
  let capturedHeaders: Headers | undefined;
  const requestHeaders = new Headers({
    authorization: "Bearer user-command-token",
    cookie: "kb-auth=local-observatory-cookie",
    "x-request-id": "req-123",
  });

  const result = await proxyCommandBrainRead({
    path: ["brain", "promotions"],
    searchParams: new URLSearchParams({ status: "submitted" }),
    requestHeaders,
    env: {
      OPTALE_COMMAND_BRAIN_ORIGIN: "https://command.example.com/",
      OPTALE_COMMAND_BRAIN_AUTH_MODE: "user-jwt",
    },
    fetchImpl: async (input, init) => {
      capturedUrl = input.toString();
      capturedHeaders = init?.headers as Headers;
      return new Response(JSON.stringify({ promotions: [] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    },
  });

  assert.equal(result.status, 200);
  assert.equal(capturedUrl, "https://command.example.com/api/brain/promotions?status=submitted");
  assert.equal(capturedHeaders?.get("authorization"), "Bearer user-command-token");
  assert.equal(capturedHeaders?.get("cookie"), null);
  assert.equal(capturedHeaders?.get("x-request-id"), "req-123");
  assert.equal(capturedHeaders?.get("x-optale-observatory-read-only"), "true");
  assert.deepEqual(result.body, { promotions: [] });
});

test("proxyCommandBrainMutation forwards only allowlisted action requests", async () => {
  let capturedUrl = "";
  let capturedMethod = "";
  let capturedBody = "";
  let capturedHeaders: Headers | undefined;
  const result = await proxyCommandBrainMutation({
    path: "company-brain/optale-global/promotions/bp_123/review",
    method: "PATCH",
    body: { status: "approved", reviewerNotes: "Looks correct." },
    requestHeaders: new Headers({
      cookie: "kb-auth=local-observatory-cookie",
      "x-request-id": "req-action",
    }),
    actor: {
      userId: "user-1",
      role: "ADMIN",
      tenantId: "optale",
      subjectType: "personal",
      allowedTargetIds: ["optale-global"],
    },
    env: {
      OPTALE_COMMAND_BRAIN_ORIGIN: "https://command.example.com",
      OPTALE_COMMAND_BRAIN_AUTH_MODE: "service-jwt",
      OPTALE_COMMAND_BRAIN_JWT_SECRET: "secret",
      OPTALE_COMMAND_BRAIN_SERVICE_USER_ID: "user-1",
    },
    fetchImpl: async (input, init) => {
      capturedUrl = input.toString();
      capturedMethod = init?.method || "";
      capturedBody = String(init?.body || "");
      capturedHeaders = init?.headers as Headers;
      return new Response(JSON.stringify({ promotion: { promotionId: "bp_123" } }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    },
  });

  assert.equal(result.status, 200);
  assert.equal(
    capturedUrl,
    "https://command.example.com/api/company-brain/optale-global/promotions/bp_123/review"
  );
  assert.equal(capturedMethod, "PATCH");
  assert.equal(capturedBody, JSON.stringify({ status: "approved", reviewerNotes: "Looks correct." }));
  assert.equal(capturedHeaders?.get("cookie"), null);
  assert.equal(capturedHeaders?.get("x-optale-observatory-read-only"), "false");
  assert.equal(capturedHeaders?.get("x-optale-observatory-action"), "companyBrain.review");
  assert.match(capturedHeaders?.get("authorization") || "", /^Bearer [^.]+\.[^.]+\.[^.]+$/);
});

test("proxyCommandBrainMutation rejects non-action Command Brain mutations", async () => {
  let calls = 0;
  const result = await proxyCommandBrainMutation({
    path: "brain/promotions/bp_123/submit",
    method: "POST",
    requestHeaders: new Headers({ authorization: "Bearer user-command-token" }),
    env: {
      OPTALE_COMMAND_BRAIN_ORIGIN: "https://command.example.com",
      OPTALE_COMMAND_BRAIN_AUTH_MODE: "user-jwt",
    },
    fetchImpl: async () => {
      calls += 1;
      return new Response("{}");
    },
  });

  assert.equal(result.status, 403);
  assert.equal(calls, 0);
});

test("proxyCommandBrainRead rejects disallowed paths even when bridge is configured", async () => {
  let calls = 0;
  const result = await proxyCommandBrainRead({
    path: "brain/promotions/abc/submit",
    requestHeaders: new Headers({ authorization: "Bearer user-command-token" }),
    env: {
      OPTALE_COMMAND_BRAIN_ORIGIN: "https://command.example.com",
      OPTALE_COMMAND_BRAIN_AUTH_MODE: "user-jwt",
    },
    fetchImpl: async () => {
      calls += 1;
      return new Response("{}");
    },
  });

  assert.equal(result.status, 403);
  assert.equal(calls, 0);
});
