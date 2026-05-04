import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";

const PROJECT_ROOT = process.cwd();

type GuardSpec = {
  file: string;
  tokens: string[];
};

const SENSITIVE_RESTRICTED_GUARDS: GuardSpec[] = [
  {
    file: "src/app/api/agents/[id]/route.ts",
    tokens: ['restrictedCapabilityDenial("terminal.runtime")'],
  },
  {
    file: "src/app/api/agents/config/route.ts",
    tokens: ['restrictedCapabilityDenial("agents.mutate")'],
  },
  {
    file: "src/app/api/agents/import/route.ts",
    tokens: ['restrictedCapabilityDenial("agents.mutate")'],
  },
  {
    file: "src/app/api/agents/library/[slug]/add/route.ts",
    tokens: ['restrictedCapabilityDenial("agents.mutate")'],
  },
  {
    file: "src/app/api/agents/personas/[slug]/avatar/route.ts",
    tokens: ['restrictedCapabilityDenial("agents.mutate")'],
  },
  {
    file: "src/app/api/agents/scheduler/route.ts",
    tokens: ['restrictedCapabilityDenial("agents.mutate")'],
  },
  {
    file: "src/app/api/git/commit/route.ts",
    tokens: ['restrictedCapabilityDenial("diagnostics.raw")'],
  },
  {
    file: "src/app/api/git/pull/route.ts",
    tokens: ['restrictedCapabilityDenial("diagnostics.raw")'],
  },
  {
    file: "src/app/api/git/restore/route.ts",
    tokens: ['restrictedCapabilityDenial("diagnostics.raw")'],
  },
  {
    file: "src/app/api/optale/brain/company-brain/route.ts",
    tokens: ['restrictedCapabilityDenial("company_brain.view")'],
  },
  {
    file: "src/app/api/optale/brain/dreams/action/route.ts",
    tokens: ['restrictedCapabilityDenial("memory.cross_tenant")'],
  },
  {
    file: "src/app/api/optale/brain/dreams/ask/route.ts",
    tokens: ['restrictedCapabilityDenial("company_brain.view")'],
  },
  {
    file: "src/app/api/optale/brain/dreams/route.ts",
    tokens: ['restrictedCapabilityDenial("company_brain.view")'],
  },
  {
    file: "src/app/api/system/backup/route.ts",
    tokens: ['restrictedCapabilityDenial("diagnostics.raw")'],
  },
  {
    file: "src/app/api/system/data-dir/route.ts",
    tokens: ['restrictedCapabilityDenial("secrets.manage")'],
  },
  {
    file: "src/app/api/system/link-repo/route.ts",
    tokens: ['restrictedCapabilityDenial("diagnostics.raw")'],
  },
  {
    file: "src/app/api/system/open-data-dir/route.ts",
    tokens: ['restrictedCapabilityDenial("diagnostics.raw")'],
  },
  {
    file: "src/app/api/system/pick-directory/route.ts",
    tokens: ['restrictedCapabilityDenial("secrets.manage")'],
  },
  {
    file: "src/app/api/system/reveal/route.ts",
    tokens: ['restrictedCapabilityDenial("diagnostics.raw")'],
  },
  {
    file: "src/app/api/system/update/apply/route.ts",
    tokens: ['restrictedCapabilityDenial("updates.manage")'],
  },
  {
    file: "src/lib/agents/provider-runtime.ts",
    tokens: ["restrictedAgentRuntimeDenial"],
  },
  {
    file: "src/lib/agents/heartbeat.ts",
    tokens: ["restrictedAgentRuntimeDenial"],
  },
];

const SENSITIVE_RUNTIME_CHECKS: GuardSpec[] = [
  {
    file: "src/app/api/agents/conversations/[id]/route.ts",
    tokens: ["restrictedAgentRuntimeDenial", 'action === "restart"'],
  },
  {
    file: "src/app/api/agents/conversations/[id]/compact/route.ts",
    tokens: ["restrictedAgentRuntimeDenial"],
  },
];

async function readSource(relativePath: string): Promise<string> {
  return fs.readFile(path.join(PROJECT_ROOT, relativePath), "utf8");
}

test("sensitive partner desktop routes keep restricted capability gates", async () => {
  for (const spec of SENSITIVE_RESTRICTED_GUARDS) {
    const source = await readSource(spec.file);
    for (const token of spec.tokens) {
      assert.ok(
        source.includes(token),
        `${spec.file} must keep restricted guard token: ${token}`,
      );
    }
  }
});

test("partner desktop runtime relaunch routes keep restricted runtime checks", async () => {
  for (const spec of SENSITIVE_RUNTIME_CHECKS) {
    const source = await readSource(spec.file);
    for (const token of spec.tokens) {
      assert.ok(
        source.includes(token),
        `${spec.file} must keep restricted runtime token: ${token}`,
      );
    }
  }
});
