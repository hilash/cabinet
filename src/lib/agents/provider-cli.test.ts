import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { AgentProvider } from "./provider-interface";
import { checkCliProviderAvailable, resolveCliCommand } from "./provider-cli";

async function createExecutableScript(source: string): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "cabinet-provider-cli-test-"));
  const scriptPath = path.join(dir, "fake-provider.sh");
  await fs.writeFile(scriptPath, source, "utf8");
  await fs.chmod(scriptPath, 0o755);
  return scriptPath;
}

test("resolveCliCommand prefers an existing command candidate path", async () => {
  const scriptPath = await createExecutableScript("#!/bin/sh\nexit 0\n");
  const provider: AgentProvider = {
    id: "test-cli-provider",
    name: "Test CLI Provider",
    type: "cli",
    icon: "bot",
    command: "missing-cli-provider",
    commandCandidates: [scriptPath, "missing-cli-provider"],
    async isAvailable() {
      return true;
    },
    async healthCheck() {
      return {
        available: true,
        authenticated: true,
        version: "test",
      };
    },
  };

  assert.equal(resolveCliCommand(provider), scriptPath);
});

test("checkCliProviderAvailable uses resolved command candidates", async () => {
  const scriptPath = await createExecutableScript("#!/bin/sh\nexit 0\n");
  const provider: AgentProvider = {
    id: "test-cli-provider",
    name: "Test CLI Provider",
    type: "cli",
    icon: "bot",
    command: "missing-cli-provider",
    commandCandidates: [scriptPath, "missing-cli-provider"],
    async isAvailable() {
      return true;
    },
    async healthCheck() {
      return {
        available: true,
        authenticated: true,
        version: "test",
      };
    },
  };

  assert.equal(await checkCliProviderAvailable(provider), true);
});
