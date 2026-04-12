import test from "node:test";
import assert from "node:assert/strict";
import { normalizeProviderSettings, resolveEnabledProviderId } from "./provider-settings";
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
  });

  assert.equal(settings.defaultProvider, "claude-code");
  assert.deepEqual(settings.disabledProviderIds, []);
});

test("normalizeProviderSettings falls back when the requested default is disabled", () => {
  const settings = normalizeProviderSettings({
    defaultProvider: "codex-cli",
    disabledProviderIds: ["codex-cli"],
  });

  assert.equal(settings.defaultProvider, "claude-code");
  assert.deepEqual(settings.disabledProviderIds, ["codex-cli"]);
});

test("normalizeProviderSettings falls back to the first enabled provider when needed", () => {
  const previousDefault = providerRegistry.defaultProvider;
  providerRegistry.defaultProvider = "missing-provider";

  withRegisteredProvider(
    {
      id: "test-only-provider",
      name: "Test Only Provider",
      type: "cli",
      icon: "bot",
      command: "test-only-provider",
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
    },
    () => {
      const settings = normalizeProviderSettings({
        defaultProvider: "missing-provider",
        disabledProviderIds: ["claude-code", "codex-cli", "gemini-cli"],
      });

      assert.equal(settings.defaultProvider, "test-only-provider");
      assert.deepEqual(settings.disabledProviderIds, ["claude-code", "codex-cli", "gemini-cli"]);
    }
  );

  providerRegistry.defaultProvider = previousDefault;
});

test("resolveEnabledProviderId falls back to the configured default when the requested provider is disabled", () => {
  const providerId = resolveEnabledProviderId("claude-code", {
    defaultProvider: "codex-cli",
    disabledProviderIds: ["claude-code"],
  });

  assert.equal(providerId, "codex-cli");
});
