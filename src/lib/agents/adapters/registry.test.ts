import test from "node:test";
import assert from "node:assert/strict";
import {
  agentAdapterRegistry,
  defaultAdapterTypeForProvider,
  resolveExecutionProviderId,
  resolveLegacyProviderIdForAdapterType,
} from "./registry";

test("legacy adapter registry exposes the current compatibility adapters", () => {
  const adapterTypes = agentAdapterRegistry.listAll().map((adapter) => adapter.type).sort();
  assert.deepEqual(adapterTypes, ["claude_code_legacy", "codex_cli_legacy"]);

  const claudeAdapter = agentAdapterRegistry.get("claude_code_legacy");
  assert.ok(claudeAdapter);
  assert.equal(claudeAdapter.experimental, true);
  assert.equal(claudeAdapter.providerId, "claude-code");
  assert.equal(claudeAdapter.executionEngine, "legacy_pty_cli");
});

test("provider-to-adapter defaults map current providers onto legacy adapters", () => {
  assert.equal(defaultAdapterTypeForProvider("claude-code"), "claude_code_legacy");
  assert.equal(defaultAdapterTypeForProvider("codex-cli"), "codex_cli_legacy");
});

test("execution provider resolution prefers explicit legacy adapter mappings", () => {
  assert.equal(resolveLegacyProviderIdForAdapterType("claude_code_legacy"), "claude-code");
  assert.equal(resolveLegacyProviderIdForAdapterType("codex_cli_legacy"), "codex-cli");
  assert.equal(resolveLegacyProviderIdForAdapterType("unknown_adapter"), undefined);

  assert.equal(
    resolveExecutionProviderId({
      adapterType: "codex_cli_legacy",
      providerId: "claude-code",
      defaultProviderId: "claude-code",
    }),
    "codex-cli"
  );

  assert.equal(
    resolveExecutionProviderId({
      adapterType: "unknown_adapter",
      providerId: "claude-code",
      defaultProviderId: "codex-cli",
    }),
    "claude-code"
  );
});

