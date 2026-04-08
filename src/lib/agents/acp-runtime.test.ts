import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import type { AgentProvider } from "./provider-interface";
import { checkAcpProviderHealth, normalizeAcpSessionModelMetadata } from "./acp-runtime";
import type * as schema from "@agentclientprotocol/sdk/dist/schema/types.gen";

test("normalizeAcpSessionModelMetadata prefers stable configOptions over unstable models", () => {
  const configOptions = [
    {
      id: "model",
      name: "Model",
      type: "select",
      category: "model",
      currentValue: "gpt-5.4",
      options: [
        {
          value: "gpt-5.4",
          name: "GPT-5.4",
          description: "Default model",
        },
      ],
    },
  ] satisfies schema.SessionConfigOption[];
  const models = {
    currentModelId: "ignored",
    availableModels: [
      {
        modelId: "ignored",
        name: "Ignored",
        description: "Should not win",
      },
    ],
  } satisfies schema.SessionModelState;

  const normalized = normalizeAcpSessionModelMetadata({ configOptions, models });

  assert.deepEqual(normalized, {
    currentModelId: "gpt-5.4",
    options: [
      {
        id: "gpt-5.4",
        name: "GPT-5.4",
        description: "Default model",
      },
    ],
    source: "configOptions",
  });
});

test("normalizeAcpSessionModelMetadata falls back to unstable models when configOptions are absent", () => {
  const normalized = normalizeAcpSessionModelMetadata({
    models: {
      currentModelId: "opus",
      availableModels: [
        {
          modelId: "default",
          name: "Default",
          description: "Recommended",
        },
        {
          modelId: "opus",
          name: "Opus",
          description: "Most capable",
        },
      ],
    },
  });

  assert.deepEqual(normalized, {
    currentModelId: "opus",
    options: [
      {
        id: "default",
        name: "Default",
        description: "Recommended",
      },
      {
        id: "opus",
        name: "Opus",
        description: "Most capable",
      },
    ],
    source: "models",
  });
});

test("checkAcpProviderHealth reports unauthenticated when initialize succeeds but newSession requires auth", async () => {
  const provider: AgentProvider = {
    id: "test-auth-required-provider",
    name: "Auth Required Test Provider",
    type: "cli",
    runtime: "acp",
    adapterKind: "adapter",
    icon: "bot",
    command: process.execPath,
    commandCandidates: [process.execPath],
    commandArgs: [path.join(process.cwd(), "test", "fixtures", "acp-auth-required-agent.mjs")],
    async isAvailable() {
      return true;
    },
    async healthCheck() {
      throw new Error("unused");
    },
  };

  const status = await checkAcpProviderHealth(provider);

  assert.equal(status.available, true);
  assert.equal(status.authenticated, false);
  assert.match(status.error || "", /requires authentication/i);
});
