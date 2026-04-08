import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import type { AgentProvider } from "./provider-interface";
import { providerRegistry } from "./provider-registry";
import { writeProviderSettings } from "./provider-settings";
import {
  createProviderSession,
  getDefaultProviderId,
  getInteractiveProviderLaunchSpec,
  probeProviderSessionOptions,
  resolveProviderId,
  resolveProviderOrThrow,
  runOneShotProviderPrompt,
} from "./provider-runtime";

function getExampleAgentPath(): string {
  return path.join(
    process.cwd(),
    "node_modules",
    "@agentclientprotocol",
    "sdk",
    "dist",
    "examples",
    "agent.js"
  );
}

function getFsAgentPath(): string {
  return path.join(process.cwd(), "test", "fixtures", "acp-fs-agent.mjs");
}

function createAcpTestProvider(id: string): AgentProvider {
  const exampleAgentPath = getExampleAgentPath();

  return {
    id,
    name: `ACP Test Provider ${id}`,
    type: "cli",
    runtime: "acp",
    adapterKind: "adapter",
    icon: "bot",
    command: process.execPath,
    commandCandidates: [process.execPath],
    commandArgs: [exampleAgentPath],
    async isAvailable() {
      return true;
    },
    async healthCheck() {
      return {
        available: true,
        authenticated: true,
        version: "test",
        runtime: "acp",
        adapterKind: "adapter",
      };
    },
  };
}

function createFsAcpTestProvider(id: string): AgentProvider {
  const fsAgentPath = getFsAgentPath();

  return {
    id,
    name: `ACP FS Test Provider ${id}`,
    type: "cli",
    runtime: "acp",
    adapterKind: "adapter",
    icon: "bot",
    command: process.execPath,
    commandCandidates: [process.execPath],
    commandArgs: [fsAgentPath],
    async isAvailable() {
      return true;
    },
    async healthCheck() {
      return {
        available: true,
        authenticated: true,
        version: "test",
        runtime: "acp",
        adapterKind: "adapter",
      };
    },
  };
}

function registerTestProvider(
  provider: AgentProvider,
  t: test.TestContext,
  previousDefaultProvider: string
): void {
  providerRegistry.register(provider);
  t.after(() => {
    providerRegistry.providers.delete(provider.id);
    providerRegistry.defaultProvider = previousDefaultProvider;
  });
}

async function withProviderSettingsBackup(
  t: test.TestContext,
  fn: () => Promise<void>
): Promise<void> {
  const providersPath = path.join(process.cwd(), "data", ".agents", ".config", "providers.json");
  const originalSettings = await fs.readFile(providersPath, "utf8").catch(() => null);

  t.after(async () => {
    if (originalSettings === null) {
      await fs.rm(providersPath, { force: true });
      return;
    }
    await fs.writeFile(providersPath, originalSettings, "utf8");
  });

  await fn();
}

test("provider runtime resolves the configured enabled default provider", async (t) => {
  const previousDefaultProvider = providerRegistry.defaultProvider;
  const provider = createAcpTestProvider("test-default-provider");
  registerTestProvider(provider, t, previousDefaultProvider);
  providerRegistry.defaultProvider = provider.id;

  await withProviderSettingsBackup(t, async () => {
    await writeProviderSettings({
      defaultProvider: provider.id,
      disabledProviderIds: [],
      providerModels: {},
    });

    assert.equal(getDefaultProviderId(), provider.id);
    assert.equal(resolveProviderId(), provider.id);
    assert.equal(resolveProviderOrThrow().id, provider.id);
  });
});

test("provider runtime falls back to the enabled default when the requested provider is disabled", async (t) => {
  await withProviderSettingsBackup(t, async () => {
    await writeProviderSettings({
      defaultProvider: "codex-cli",
      disabledProviderIds: ["claude-code"],
      providerModels: {},
    });

    assert.equal(resolveProviderId("claude-code"), "codex-cli");
  });
});

test("getInteractiveProviderLaunchSpec uses provider-specific interactive CLI settings", async (t) => {
  const previousDefaultProvider = providerRegistry.defaultProvider;
  const scriptPath = await fs.mkdtemp(path.join(os.tmpdir(), "cabinet-provider-runtime-"))
    .then(async (dir) => {
      const filePath = path.join(dir, "interactive-provider.sh");
      await fs.writeFile(filePath, "#!/bin/sh\nexit 0\n", "utf8");
      await fs.chmod(filePath, 0o755);
      t.after(async () => {
        await fs.rm(dir, { recursive: true, force: true });
      });
      return filePath;
    });
  const provider: AgentProvider = {
    id: "test-interactive-provider",
    name: "Interactive Test Provider",
    type: "cli",
    runtime: "acp",
    adapterKind: "adapter",
    icon: "bot",
    command: "unused-acp-adapter",
    commandCandidates: ["unused-acp-adapter"],
    commandArgs: [],
    interactiveCommand: scriptPath,
    interactiveCommandCandidates: [scriptPath],
    buildInteractiveArgs(workdir: string) {
      return ["--cwd", workdir];
    },
    async isAvailable() {
      return true;
    },
    async healthCheck() {
      return {
        available: true,
        authenticated: true,
        version: "test",
        runtime: "acp",
        adapterKind: "adapter",
      };
    },
  };
  registerTestProvider(provider, t, previousDefaultProvider);

  const launch = getInteractiveProviderLaunchSpec({
    providerId: provider.id,
    workdir: process.cwd(),
  });

  assert.equal(launch.providerId, provider.id);
  assert.equal(launch.command, scriptPath);
  assert.deepEqual(launch.args, ["--cwd", process.cwd()]);
});

test("runOneShotProviderPrompt executes an ACP provider and returns streamed output", async (t) => {
  const previousDefaultProvider = providerRegistry.defaultProvider;
  const provider = createAcpTestProvider("test-run-provider");
  registerTestProvider(provider, t, previousDefaultProvider);

  const output = await runOneShotProviderPrompt({
    providerId: provider.id,
    prompt: "Say hello",
    cwd: process.cwd(),
    timeoutMs: 10_000,
  });

  assert.match(output, /I'll help you with that/);
  assert.match(output, /successfully updated the configuration/);
});

test("createProviderSession starts an ACP session and streams updates", async (t) => {
  const previousDefaultProvider = providerRegistry.defaultProvider;
  const provider = createAcpTestProvider("test-session-provider");
  registerTestProvider(provider, t, previousDefaultProvider);

  const updates: string[] = [];
  const session = await createProviderSession({
    providerId: provider.id,
    cwd: process.cwd(),
    onSessionUpdate(params) {
      updates.push(params.update.sessionUpdate);
    },
  });

  t.after(async () => {
    await session.close();
  });

  assert.equal(session.providerId, provider.id);
  assert.equal(session.providerName, provider.name);
  assert.ok(session.acpSessionId.length > 0);

  const result = await session.prompt("Do the thing");

  assert.equal(result.stopReason, "end_turn");
  assert.ok(updates.includes("agent_message_chunk"));
  assert.ok(updates.includes("tool_call"));
  assert.ok(updates.includes("tool_call_update"));
});

test("createProviderSession rejects writes outside cwd when no broader allowed roots are provided", async (t) => {
  const previousDefaultProvider = providerRegistry.defaultProvider;
  const provider = createFsAcpTestProvider("test-fs-default-roots");
  registerTestProvider(provider, t, previousDefaultProvider);

  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "cabinet-acp-roots-"));
  const cwd = path.join(tempRoot, "workspace", "marketing");
  const targetPath = path.join(tempRoot, "workspace", "sales", "note.md");
  await fs.mkdir(cwd, { recursive: true });

  const session = await createProviderSession({
    providerId: provider.id,
    cwd,
  });

  t.after(async () => {
    await session.close();
    await fs.rm(tempRoot, { recursive: true, force: true });
  });

  await assert.rejects(session.prompt(`WRITE ${targetPath}\noutside cwd`), (error: unknown) => {
    assert.equal(error instanceof Error, true);
    const details =
      typeof error === "object" && error !== null && "data" in error
        ? Reflect.get(error.data as object, "details")
        : undefined;
    assert.match(String(details), /outside the allowed workspace/);
    return true;
  });
});

test("createProviderSession allows writes anywhere under allowedRoots even when cwd is narrower", async (t) => {
  const previousDefaultProvider = providerRegistry.defaultProvider;
  const provider = createFsAcpTestProvider("test-fs-expanded-roots");
  registerTestProvider(provider, t, previousDefaultProvider);

  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "cabinet-acp-roots-"));
  const allowedRoot = path.join(tempRoot, "workspace");
  const cwd = path.join(allowedRoot, "marketing");
  const targetPath = path.join(allowedRoot, "sales", "note.md");
  await fs.mkdir(cwd, { recursive: true });

  const session = await createProviderSession({
    providerId: provider.id,
    cwd,
    allowedRoots: [allowedRoot],
  });

  t.after(async () => {
    await session.close();
    await fs.rm(tempRoot, { recursive: true, force: true });
  });

  const result = await session.prompt(`WRITE ${targetPath}\nshared workspace`);

  assert.equal(result.stopReason, "end_turn");
  assert.equal(await fs.readFile(targetPath, "utf8"), "shared workspace");
});

test("probeProviderSessionOptions returns model options for bundled ACP providers", async () => {
  const codex = await probeProviderSessionOptions({
    providerId: "codex-cli",
    cwd: process.cwd(),
  });
  assert.ok((codex.modelMetadata?.options.length || 0) > 0);
  assert.ok(
    codex.modelMetadata?.source === "configOptions" ||
    codex.modelMetadata?.source === "models"
  );

  const claude = await probeProviderSessionOptions({
    providerId: "claude-code",
    cwd: process.cwd(),
  });
  assert.ok((claude.modelMetadata?.options.length || 0) > 0);
  assert.ok(
    claude.modelMetadata?.source === "models" ||
    claude.modelMetadata?.source === "configOptions"
  );
});
