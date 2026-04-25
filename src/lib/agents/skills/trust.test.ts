import test from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import os from "os";
import path from "path";
import { PROJECT_ROOT } from "@/lib/runtime/runtime-config";
import {
  evaluateMountDecision,
  isVerifiedPublisher,
  loadCabinetTrustDecisions,
  saveCabinetTrustDecision,
} from "./trust";
import type { SkillEntry } from "./types";

const REPO_TRUST_DIR = path.join(PROJECT_ROOT, ".cabinet");
const REPO_TRUST_FILE = path.join(REPO_TRUST_DIR, "skills-trust.json");

/**
 * Each test cleans the repo's `.cabinet/skills-trust.json` so cabinetPath=null
 * (which routes to PROJECT_ROOT) sees a clean slate. We can't easily mock
 * PROJECT_ROOT from a test since it's resolved at module-load time.
 */
function withTempEnv<T>(fn: (root: string) => Promise<T> | T): Promise<T> {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "cabinet-trust-test-"));
  const prevHome = process.env.HOME;
  process.env.HOME = tmp;
  // Snapshot any pre-existing trust file so we don't clobber operator state.
  let snapshot: string | null = null;
  try {
    snapshot = fs.readFileSync(REPO_TRUST_FILE, "utf-8");
  } catch {
    /* no prior file */
  }
  fs.rmSync(REPO_TRUST_FILE, { force: true });
  return Promise.resolve(fn(tmp)).finally(() => {
    process.env.HOME = prevHome;
    fs.rmSync(tmp, { recursive: true, force: true });
    fs.rmSync(REPO_TRUST_FILE, { force: true });
    if (snapshot !== null) {
      fs.mkdirSync(REPO_TRUST_DIR, { recursive: true });
      fs.writeFileSync(REPO_TRUST_FILE, snapshot, "utf-8");
    }
  });
}

function makeSkill(overrides: Partial<SkillEntry> = {}): SkillEntry {
  return {
    key: "test-skill",
    name: "Test Skill",
    description: "A test skill",
    origin: "cabinet-root",
    scope: null,
    path: "/tmp/test-skill",
    fileInventory: [],
    trustLevel: "markdown_only",
    trustPolicy: null,
    allowedTools: [],
    editable: true,
    ...overrides,
  };
}

test("isVerifiedPublisher recognizes known orgs case-insensitively", () => {
  assert.equal(isVerifiedPublisher("anthropic"), true);
  assert.equal(isVerifiedPublisher("Anthropic"), true);
  assert.equal(isVerifiedPublisher("ANTHROPICS"), true);
  assert.equal(isVerifiedPublisher("vercel-labs"), true);
  assert.equal(isVerifiedPublisher("randoperson"), false);
  assert.equal(isVerifiedPublisher(null), false);
  assert.equal(isVerifiedPublisher(undefined), false);
  assert.equal(isVerifiedPublisher(""), false);
});

test("markdown_only skills auto-allow regardless of publisher", async () => {
  await withTempEnv(async () => {
    const verified = await evaluateMountDecision({
      skill: makeSkill({ trustLevel: "markdown_only" }),
      publisher: "anthropic",
    });
    const unverified = await evaluateMountDecision({
      skill: makeSkill({ trustLevel: "markdown_only" }),
      publisher: "rando",
    });
    assert.equal(verified.status, "allow");
    assert.equal(unverified.status, "allow");
    assert.equal(verified.effectivePolicy, "auto-allow");
    assert.equal(unverified.effectivePolicy, "auto-allow");
  });
});

test("scripts_executables from verified publisher → prompt-once", async () => {
  await withTempEnv(async () => {
    const decision = await evaluateMountDecision({
      skill: makeSkill({ trustLevel: "scripts_executables" }),
      publisher: "anthropic",
    });
    assert.equal(decision.status, "needs-prompt");
    assert.equal(decision.effectivePolicy, "prompt-once");
  });
});

test("scripts_executables from unverified publisher → always-prompt", async () => {
  await withTempEnv(async () => {
    const decision = await evaluateMountDecision({
      skill: makeSkill({ trustLevel: "scripts_executables" }),
      publisher: "rando",
    });
    assert.equal(decision.status, "needs-prompt");
    assert.equal(decision.effectivePolicy, "always-prompt");
  });
});

test("Bash(*) catch-all from unverified publisher → always-prompt", async () => {
  await withTempEnv(async () => {
    const decision = await evaluateMountDecision({
      skill: makeSkill({
        trustLevel: "scripts_executables",
        allowedTools: ["Bash(*)"],
      }),
      publisher: "rando",
    });
    assert.equal(decision.status, "needs-prompt");
    assert.equal(decision.effectivePolicy, "always-prompt");
  });
});

test("explicit trust-policy: refuse → block", async () => {
  await withTempEnv(async () => {
    const decision = await evaluateMountDecision({
      skill: makeSkill({ trustPolicy: "refuse", trustLevel: "scripts_executables" }),
      publisher: "anthropic",
    });
    assert.equal(decision.status, "block");
    assert.equal(decision.effectivePolicy, "refuse");
  });
});

test("operator approval overrides author trust-policy", async () => {
  await withTempEnv(async () => {
    await saveCabinetTrustDecision(null, "test-skill", {
      status: "approved",
      decidedAt: "2026-01-01T00:00:00.000Z",
    });
    const decision = await evaluateMountDecision({
      skill: makeSkill({
        trustPolicy: "always-prompt",
        trustLevel: "scripts_executables",
      }),
      publisher: "rando",
    });
    assert.equal(decision.status, "allow");
    assert.match(decision.reason, /Approved/);
  });
});

test("operator revoke overrides everything", async () => {
  await withTempEnv(async () => {
    await saveCabinetTrustDecision(null, "test-skill", {
      status: "revoked",
      decidedAt: "2026-01-01T00:00:00.000Z",
    });
    const decision = await evaluateMountDecision({
      skill: makeSkill({ trustPolicy: "auto-allow", trustLevel: "markdown_only" }),
      publisher: "anthropic",
    });
    assert.equal(decision.status, "block");
    assert.match(decision.reason, /Revoked/);
  });
});

test("loadCabinetTrustDecisions returns empty default when file is missing", async () => {
  await withTempEnv(async () => {
    const trust = await loadCabinetTrustDecisions(null);
    assert.equal(trust.version, 1);
    assert.deepEqual(trust.decisions, {});
  });
});

test("saveCabinetTrustDecision then load round-trips", async () => {
  await withTempEnv(async () => {
    await saveCabinetTrustDecision(null, "alpha", {
      status: "approved",
      decidedAt: "2026-04-25T12:00:00.000Z",
      reason: "test",
    });
    await saveCabinetTrustDecision(null, "beta", {
      status: "revoked",
      decidedAt: "2026-04-25T12:01:00.000Z",
    });
    const trust = await loadCabinetTrustDecisions(null);
    assert.equal(Object.keys(trust.decisions).length, 2);
    assert.equal(trust.decisions.alpha.status, "approved");
    assert.equal(trust.decisions.alpha.reason, "test");
    assert.equal(trust.decisions.beta.status, "revoked");
  });
});
