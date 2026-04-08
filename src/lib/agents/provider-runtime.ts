import type { AgentProvider } from "./provider-interface";
import { providerRegistry } from "./provider-registry";
import {
  runAcpOneShotPrompt,
  startAcpSession,
  type AcpRunSession,
} from "./acp-runtime";
import {
  getConfiguredDefaultProviderId,
  readProviderSettingsSync,
  resolveEnabledProviderId,
} from "./provider-settings";

export function resolveProviderOrThrow(providerId?: string): AgentProvider {
  const settings = readProviderSettingsSync();
  const resolvedProviderId = resolveEnabledProviderId(providerId, settings);
  const resolvedProvider = providerRegistry.get(resolvedProviderId);
  if (resolvedProvider) {
    return resolvedProvider;
  }

  throw new Error(
    providerId
      ? `No enabled provider is available for requested provider: ${providerId}`
      : "No enabled provider is configured"
  );
}

export function getDefaultProviderId(): string {
  return getConfiguredDefaultProviderId();
}

export function resolveProviderId(providerId?: string): string {
  return resolveProviderOrThrow(providerId).id;
}

export async function runOneShotProviderPrompt(input: {
  providerId?: string;
  prompt: string;
  cwd: string;
  timeoutMs?: number;
}): Promise<string> {
  const provider = resolveProviderOrThrow(input.providerId);
  return runAcpOneShotPrompt(provider, {
    cwd: input.cwd,
    prompt: input.prompt,
    timeoutMs: input.timeoutMs,
  });
}

export async function createProviderSession(input: {
  providerId?: string;
  cwd: string;
  onSessionUpdate?: Parameters<typeof startAcpSession>[1]["onSessionUpdate"];
  onStderr?: Parameters<typeof startAcpSession>[1]["onStderr"];
}): Promise<AcpRunSession> {
  const provider = resolveProviderOrThrow(input.providerId);
  return startAcpSession(provider, {
    cwd: input.cwd,
    onSessionUpdate: input.onSessionUpdate,
    onStderr: input.onStderr,
  });
}
