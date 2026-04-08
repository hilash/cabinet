import test from "node:test";
import assert from "node:assert/strict";
import {
  getConfiguredProviderModel,
  normalizeProviderSettings,
  resolveConfiguredProviderModel,
  resolveEnabledProviderId,
} from "./provider-settings";
import { providerRegistry } from "./provider-registry";
import type { AgentProvider } from "./provider-interface";

function withRegisteredProvider(provider: AgentProvider, fn: () => void): void {
  providerRegistry.register(provider);
  try {
    fn();
  } finally {
    providerRegistry.providers.delete(provider.id);
  }
}

test("normalizeProviderSettings keeps a valid enabled default provider", () => {
  const settings = normalizeProviderSettings({
    defaultProvider: "claude-code",
    disabledProviderIds: [],
    providerModels: {
      "claude-code": "default",
      unknown: "ignored",
    },
  });

  assert.equal(settings.defaultProvider, "claude-code");
  assert.deepEqual(settings.disabledProviderIds, []);
  assert.deepEqual(settings.providerModels, { "claude-code": "default" });
});

test("normalizeProviderSettings falls back when the requested default is disabled", () => {
  const settings = normalizeProviderSettings({
    defaultProvider: "codex-cli",
    disabledProviderIds: ["codex-cli"],
    providerModels: {
      "codex-cli": "gpt-5.4",
    },
  });

  assert.equal(settings.defaultProvider, "claude-code");
  assert.deepEqual(settings.disabledProviderIds, ["codex-cli"]);
  assert.deepEqual(settings.providerModels, { "codex-cli": "gpt-5.4" });
});

test("normalizeProviderSettings falls back to the first enabled provider when needed", () => {
  const previousDefault = providerRegistry.defaultProvider;
  providerRegistry.defaultProvider = "missing-provider";

  withRegisteredProvider(
    {
      id: "test-only-provider",
      name: "Test Only Provider",
      type: "cli",
      runtime: "acp",
      adapterKind: "adapter",
      icon: "bot",
      command: "test-only-provider",
      commandArgs: [],
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
    },
    () => {
      const settings = normalizeProviderSettings({
        defaultProvider: "missing-provider",
        disabledProviderIds: ["claude-code", "codex-cli"],
        providerModels: {
          "test-only-provider": "test-model",
        },
      });

      assert.equal(settings.defaultProvider, "test-only-provider");
      assert.deepEqual(settings.disabledProviderIds, ["claude-code", "codex-cli"]);
      assert.deepEqual(settings.providerModels, { "test-only-provider": "test-model" });
    }
  );

  providerRegistry.defaultProvider = previousDefault;
});

test("resolveEnabledProviderId falls back to the configured default when the requested provider is disabled", () => {
  const providerId = resolveEnabledProviderId("claude-code", {
    defaultProvider: "codex-cli",
    disabledProviderIds: ["claude-code"],
    providerModels: {},
  });

  assert.equal(providerId, "codex-cli");
});

test("provider settings resolve configured provider models with explicit override precedence", () => {
  const settings = normalizeProviderSettings({
    defaultProvider: "claude-code",
    disabledProviderIds: [],
    providerModels: {
      "claude-code": "opus",
    },
  });

  assert.equal(getConfiguredProviderModel("claude-code", settings), "opus");
  assert.equal(resolveConfiguredProviderModel("claude-code", undefined, settings), "opus");
  assert.equal(resolveConfiguredProviderModel("claude-code", "haiku", settings), "haiku");
});
