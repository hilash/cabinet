import { providerRegistry } from "../provider-registry";
import type { ProviderStatus } from "../provider-interface";
import { claudeCodeProvider } from "../providers/claude-code";
import { codexCliProvider } from "../providers/codex-cli";
import type {
  AdapterEnvironmentCheck,
  AdapterEnvironmentTestContext,
  AdapterEnvironmentTestResult,
  AgentExecutionAdapter,
} from "./types";

export const LEGACY_ADAPTER_BY_PROVIDER_ID: Record<string, string> = {
  "claude-code": "claude_code_legacy",
  "codex-cli": "codex_cli_legacy",
};

export const LEGACY_PROVIDER_ID_BY_ADAPTER: Record<string, string> = Object.fromEntries(
  Object.entries(LEGACY_ADAPTER_BY_PROVIDER_ID).map(([providerId, adapterType]) => [
    adapterType,
    providerId,
  ])
);

function providerStatusToEnvironmentTest(
  adapterType: string,
  providerStatus: ProviderStatus,
  installMessage?: string
): AdapterEnvironmentTestResult {
  const checks: AdapterEnvironmentCheck[] = [
    {
      code: "provider_available",
      level: providerStatus.available ? "info" : "error",
      message: providerStatus.available
        ? "Provider command is available."
        : providerStatus.error || installMessage || "Provider is not installed or not on PATH.",
      ...(providerStatus.available
        ? { detail: providerStatus.version || null }
        : { hint: installMessage || null }),
    },
  ];

  if (providerStatus.available) {
    checks.push({
      code: "provider_authenticated",
      level: providerStatus.authenticated ? "info" : "warn",
      message: providerStatus.authenticated
        ? "Provider authentication is ready."
        : providerStatus.error || "Provider is installed but not authenticated yet.",
      detail: providerStatus.version || providerStatus.error || null,
    });
  }

  const status = checks.some((check) => check.level === "error")
    ? "fail"
    : checks.some((check) => check.level === "warn")
      ? "warn"
      : "pass";

  return {
    adapterType,
    status,
    checks,
    testedAt: new Date().toISOString(),
  };
}

function buildLegacyCliAdapter(input: {
  type: string;
  name: string;
  description: string;
  providerId: string;
}): AgentExecutionAdapter {
  const provider = providerRegistry.get(input.providerId);
  if (!provider) {
    throw new Error(`Cannot build legacy adapter for missing provider: ${input.providerId}`);
  }

  return {
    type: input.type,
    name: input.name,
    description: input.description,
    providerId: input.providerId,
    executionEngine: "legacy_pty_cli",
    experimental: true,
    supportsSessionResume: provider.detachedPromptLaunchMode === "session",
    supportsDetachedRuns: true,
    models: provider.models,
    effortLevels: provider.effortLevels,
    async testEnvironment(_ctx?: AdapterEnvironmentTestContext) {
      return providerStatusToEnvironmentTest(
        input.type,
        await provider.healthCheck(),
        provider.installMessage
      );
    },
  };
}

export const legacyClaudeCodeAdapter = buildLegacyCliAdapter({
  type: "claude_code_legacy",
  name: "Claude Code (Legacy PTY)",
  description:
    "Current Cabinet daemon path using prompt injection and PTY session management. Keep as an escape hatch while the structured adapter runtime lands.",
  providerId: claudeCodeProvider.id,
});

export const legacyCodexCliAdapter = buildLegacyCliAdapter({
  type: "codex_cli_legacy",
  name: "Codex CLI (Legacy PTY)",
  description:
    "Current Cabinet detached launch path for Codex. Marked experimental while the new adapter runtime is introduced.",
  providerId: codexCliProvider.id,
});

class AgentAdapterRegistry {
  adapters = new Map<string, AgentExecutionAdapter>();
  defaultAdapterType = legacyClaudeCodeAdapter.type;

  register(adapter: AgentExecutionAdapter): void {
    this.adapters.set(adapter.type, adapter);
  }

  get(type: string): AgentExecutionAdapter | undefined {
    return this.adapters.get(type);
  }

  listAll(): AgentExecutionAdapter[] {
    return Array.from(this.adapters.values());
  }

  findByProviderId(providerId: string): AgentExecutionAdapter | undefined {
    return this.listAll().find((adapter) => adapter.providerId === providerId);
  }
}

export const agentAdapterRegistry = new AgentAdapterRegistry();

agentAdapterRegistry.register(legacyClaudeCodeAdapter);
agentAdapterRegistry.register(legacyCodexCliAdapter);

export function defaultAdapterTypeForProvider(
  providerId?: string | null
): string {
  if (providerId && LEGACY_ADAPTER_BY_PROVIDER_ID[providerId]) {
    return LEGACY_ADAPTER_BY_PROVIDER_ID[providerId];
  }

  const defaultProviderId = providerRegistry.defaultProvider;
  return (
    LEGACY_ADAPTER_BY_PROVIDER_ID[defaultProviderId] ||
    agentAdapterRegistry.defaultAdapterType
  );
}

export function resolveLegacyProviderIdForAdapterType(
  adapterType?: string | null
): string | undefined {
  if (!adapterType) return undefined;
  return LEGACY_PROVIDER_ID_BY_ADAPTER[adapterType];
}

export function isLegacyAdapterType(adapterType?: string | null): boolean {
  return Boolean(adapterType && adapterType in LEGACY_PROVIDER_ID_BY_ADAPTER);
}

export function resolveLegacyExecutionProviderId(input: {
  adapterType?: string | null;
  providerId?: string | null;
  defaultProviderId?: string;
}): string {
  const mappedProviderId = resolveLegacyProviderIdForAdapterType(input.adapterType);
  if (mappedProviderId) {
    return mappedProviderId;
  }

  if (input.adapterType) {
    throw new Error(
      `Adapter ${input.adapterType} is not supported by the legacy PTY runtime.`
    );
  }

  return (
    input.providerId ||
    input.defaultProviderId ||
    providerRegistry.defaultProvider
  );
}

export function resolveExecutionProviderId(input: {
  adapterType?: string | null;
  providerId?: string | null;
  defaultProviderId?: string;
}): string {
  return (
    resolveLegacyProviderIdForAdapterType(input.adapterType) ||
    input.providerId ||
    input.defaultProviderId ||
    providerRegistry.defaultProvider
  );
}
