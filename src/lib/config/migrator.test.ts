import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import matter from "gray-matter";
import { migrateFromLegacy } from "./migrator";

async function makeTempDataDir(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), "cabinet-config-migrator-"));
}

async function writeJson(filePath: string, value: unknown): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(value, null, 2), "utf8");
}

async function writePersona(
  dataDir: string,
  slug: string,
  frontmatter: Record<string, unknown>,
): Promise<void> {
  const personaPath = path.join(dataDir, ".agents", slug, "persona.md");
  await fs.mkdir(path.dirname(personaPath), { recursive: true });
  await fs.writeFile(personaPath, matter.stringify("Persona body", frontmatter), "utf8");
}

test("migrateFromLegacy handles integrations.json only", async (t) => {
  const dataDir = await makeTempDataDir();
  t.after(async () => {
    await fs.rm(dataDir, { recursive: true, force: true });
  });

  await writeJson(path.join(dataDir, ".agents", ".config", "integrations.json"), {
    notifications: {
      browser_push: false,
      telegram: {
        enabled: true,
        bot_token: "telegram-token",
        chat_id: "chat-123",
      },
    },
  });

  const config = await migrateFromLegacy(dataDir);

  assert.equal(config.version, 1);
  assert.equal(config.integrations.notifications.browser_push, false);
  assert.equal(config.integrations.notifications.telegram.enabled, true);
  assert.equal(config.integrations.notifications.telegram.bot_token, "telegram-token");
  assert.equal(config.integrations.scheduling.max_concurrent_agents, 10);
  assert.deepEqual(config.schedules, []);
  assert.deepEqual(config.runtime.personas, {});
  await assert.doesNotReject(
    fs.access(path.join(dataDir, ".agents", ".config", "cabinet.config.migrated-at")),
  );
});

test("migrateFromLegacy handles schedules.json only", async (t) => {
  const dataDir = await makeTempDataDir();
  t.after(async () => {
    await fs.rm(dataDir, { recursive: true, force: true });
  });

  await writeJson(path.join(dataDir, ".agents", ".config", "schedules.json"), [
    {
      id: "weekday-health",
      name: "Weekday health",
      schedule: "0 9 * * 1-5",
      enabled: true,
    },
  ]);

  const config = await migrateFromLegacy(dataDir);

  assert.equal(config.schedules.length, 1);
  assert.equal(config.schedules[0]?.id, "weekday-health");
  assert.equal(config.schedules[0]?.schedule, "0 9 * * 1-5");
  assert.equal(config.integrations.notifications.telegram.enabled, false);
  assert.deepEqual(config.runtime.personas, {});
});

test("migrateFromLegacy merges integrations, schedules, and persona runtime frontmatter", async (t) => {
  const dataDir = await makeTempDataDir();
  t.after(async () => {
    await fs.rm(dataDir, { recursive: true, force: true });
  });

  await writeJson(path.join(dataDir, ".agents", ".config", "integrations.json"), {
    notifications: {
      telegram: {
        enabled: true,
        bot_token: "bot-1",
        chat_id: "chat-1",
        bidirectional: true,
        default_agent_id: "agent-1",
      },
    },
  });
  await writeJson(path.join(dataDir, ".agents", ".health", "schedules.json"), [
    {
      id: "health-every-hour",
      schedule: "0 * * * *",
      enabled: true,
      profile: "quick",
      createdAt: "2026-04-17T00:00:00.000Z",
      updatedAt: "2026-04-17T00:00:00.000Z",
    },
  ]);
  await writePersona(dataDir, "ceo", {
    name: "CEO",
    provider: "codex-cli",
    heartbeat: "0 9 * * 1-5",
    budget: 100,
    active: true,
    workdir: "/data",
    workspace: "/",
    setupComplete: true,
    multica_runtime_id: "runtime-123",
  });
  await writePersona(dataDir, "editor", {
    name: "Editor",
    provider: "claude-code",
    active: false,
  });

  const config = await migrateFromLegacy(dataDir);

  assert.equal(config.integrations.notifications.telegram.default_agent_id, "agent-1");
  assert.equal(config.schedules[0]?.profile, "quick");
  assert.deepEqual(config.runtime.personas.ceo, {
    provider: "codex-cli",
    heartbeat: "0 9 * * 1-5",
    budget: 100,
    active: true,
    workdir: "/data",
    workspace: "/",
    setupComplete: true,
    multicaRuntimeId: "runtime-123",
  });
  assert.deepEqual(config.runtime.personas.editor, {
    provider: "claude-code",
    active: false,
  });
});
