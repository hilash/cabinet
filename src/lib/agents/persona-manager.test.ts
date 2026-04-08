import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { readPersona, writePersona } from "./persona-manager";

const AGENTS_DIR = path.join(process.cwd(), "data", ".agents");

test("writePersona persists providerModel and clears it when explicitly unset", async (t) => {
  const slug = `provider-model-${Date.now()}`;
  const agentDir = path.join(AGENTS_DIR, slug);

  t.after(async () => {
    await fs.rm(agentDir, { recursive: true, force: true });
  });

  await writePersona(slug, {
    name: "Provider Model Test",
    role: "Testing",
    provider: "codex-cli",
    providerModel: "gpt-5.4",
    heartbeat: "0 8 * * *",
    budget: 100,
    active: true,
    workdir: "/data",
    focus: [],
    tags: [],
    emoji: "🤖",
    department: "general",
    type: "specialist",
    workspace: "workspace",
    body: "Test persona body",
  });

  const persisted = await readPersona(slug);
  assert.equal(persisted?.providerModel, "gpt-5.4");

  await writePersona(slug, {
    providerModel: "",
  });

  const cleared = await readPersona(slug);
  assert.equal(cleared?.providerModel, undefined);
});
