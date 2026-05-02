import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

type AdapterModule = typeof import("./brain-company-brain-adapter");
type ScopeRegistryModule = typeof import("./scope-registry");

let tempRoot: string;
let adapter: AdapterModule;
let registry: ScopeRegistryModule;

const ENV_KEYS = [
  "CABINET_DATA_DIR",
  "OPTALE_COMMAND_BRAIN_ORIGIN",
  "OPTALE_COMMAND_BRAIN_AUTH_MODE",
  "OPTALE_COMMAND_BRAIN_JWT_SECRET",
  "OPTALE_COMMAND_BRAIN_SERVICE_USER_ID",
  "OPTALE_COMPANY_BRAIN_ACTIONS_ENABLED",
] as const;
let originalEnv: Map<string, string | undefined>;

before(async () => {
  originalEnv = new Map(ENV_KEYS.map((key) => [key, process.env[key]]));
  tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "optale-company-brain-test-"));
  process.env.CABINET_DATA_DIR = tempRoot;
  process.env.OPTALE_COMMAND_BRAIN_ORIGIN = "https://command.example.com";
  process.env.OPTALE_COMMAND_BRAIN_AUTH_MODE = "service-jwt";
  process.env.OPTALE_COMMAND_BRAIN_JWT_SECRET = "secret";
  process.env.OPTALE_COMMAND_BRAIN_SERVICE_USER_ID = "user-1";
  process.env.OPTALE_COMPANY_BRAIN_ACTIONS_ENABLED = "true";

  adapter = await import("./brain-company-brain-adapter");
  registry = await import("./scope-registry");
});

after(async () => {
  if (tempRoot) await fs.rm(tempRoot, { recursive: true, force: true });
  for (const [key, value] of originalEnv) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

test("createOptaleCompanyBrainPromotion posts a scoped promotion packet", async () => {
  await registry.writeCabinetOptaleScope(".", {
    scope: "personal",
    ownerId: "thor",
    userId: "thor",
    policyId: "optale-thor",
    memoryNamespace: "thor-individual",
    companyBrainTargetId: "optale-global",
    labels: ["company-brain-reviewer"],
  });

  let capturedUrl = "";
  let capturedMethod = "";
  let capturedBody: Record<string, unknown> = {};
  let capturedHeaders: Headers | undefined;
  const fakeFetch: typeof fetch = async (input, init) => {
    capturedUrl = input.toString();
    capturedMethod = init?.method || "";
    capturedBody = JSON.parse(String(init?.body || "{}")) as Record<string, unknown>;
    capturedHeaders = init?.headers as Headers;
    return Response.json(
      {
        promotion: {
          promotionId: "bp_123",
          targetId: "optale-global",
          sourceType: "manual",
          title: "New operating policy",
          summary: "Policy summary",
          content: "Policy content",
          status: "submitted",
          sensitivity: "internal",
          entityTypes: ["policy"],
          tags: ["brain", "ops"],
          agentReview: {},
          reviewHistory: [],
          writeResult: { writes: [] },
        },
        reviewJob: { queued: true },
      },
      { status: 201 }
    );
  };

  const response = await adapter.createOptaleCompanyBrainPromotion({
    cabinetPath: ".",
    targetId: "optale-global",
    title: "New operating policy",
    summary: "Policy summary",
    content: "Policy content",
    sourceType: "manual",
    sensitivity: "internal",
    entityTypes: "policy",
    tags: "brain, ops",
    notes: "Submit now",
    submit: true,
    fetchImpl: fakeFetch,
  });

  assert.equal(response.httpStatus, 201);
  assert.equal(response.ok, true);
  assert.equal(response.submitted, true);
  assert.equal(response.promotion?.promotionId, "bp_123");
  assert.equal(capturedUrl, "https://command.example.com/api/brain/promotions");
  assert.equal(capturedMethod, "POST");
  assert.equal(capturedBody.targetId, "optale-global");
  assert.equal(capturedBody.submit, true);
  assert.deepEqual(capturedBody.tags, ["brain", "ops"]);
  assert.equal(capturedHeaders?.get("x-optale-observatory-read-only"), "false");
  assert.match(capturedHeaders?.get("authorization") || "", /^Bearer [^.]+\.[^.]+\.[^.]+$/);
});
