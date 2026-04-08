import type { AgentProvider } from "./provider-interface";
import { resolveCliCommand } from "./provider-cli";
import { providerRegistry } from "./provider-registry";
import {
  probeAcpSessionOptions,
  startAcpSession,
  type AcpRunSession,
  type AcpSessionOptionsProbeResult,
} from "./acp-runtime";
import {
  getConfiguredDefaultProviderId,
  getConfiguredProviderModel,
  readProviderSettingsSync,
  resolveEnabledProviderId,
  resolveConfiguredProviderModel,
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

export function getDefaultProviderModel(providerId: string): string | undefined {
  return getConfiguredProviderModel(providerId);
}

export function resolveProviderId(providerId?: string): string {
  return resolveProviderOrThrow(providerId).id;
}

export interface ProviderPromptRun {
  result: Promise<string>;
  cancel: () => void;
}

export interface ProviderInteractiveLaunchSpec {
  providerId: string;
  providerName: string;
  installMessage?: string;
  command: string;
  args: string[];
}

export function getInteractiveProviderLaunchSpec(input: {
  providerId?: string;
  workdir: string;
}): ProviderInteractiveLaunchSpec {
  const provider = resolveProviderOrThrow(input.providerId);
  const command = provider.interactiveCommand;
  if (!command) {
    throw new Error(`Provider ${provider.id} does not support interactive terminal sessions`);
  }

  return {
    providerId: provider.id,
    providerName: provider.name,
    installMessage: provider.interactiveInstallMessage || provider.installMessage,
    command: resolveCliCommand({
      ...provider,
      command,
      commandCandidates: provider.interactiveCommandCandidates || [command],
    }),
    args: provider.buildInteractiveArgs?.(input.workdir) || [],
  };
}

export function startOneShotProviderPrompt(input: {
  providerId?: string;
  providerModel?: string;
  prompt: string;
  cwd: string;
  allowedRoots?: string[];
  timeoutMs?: number;
}): ProviderPromptRun {
  let session: AcpRunSession | undefined;
  let cancelled = false;

  const result = (async () => {
    let assistantOutput = "";
    let timeoutHandle: NodeJS.Timeout | undefined;

    try {
      session = await createProviderSession({
        providerId: input.providerId,
        providerModel: input.providerModel,
        cwd: input.cwd,
        allowedRoots: input.allowedRoots,
        onSessionUpdate(params) {
          const update = params.update;
          if (update.sessionUpdate === "agent_message_chunk" && update.content.type === "text") {
            assistantOutput += update.content.text;
          }
        },
      });

      if (cancelled) {
        session.kill();
      }

      timeoutHandle = setTimeout(() => {
        session?.kill();
      }, input.timeoutMs || 120_000);

      await session.prompt(input.prompt);
      return assistantOutput.trim();
    } finally {
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
      }
      if (session) {
        await session.close();
      }
    }
  })();

  return {
    result,
    cancel() {
      cancelled = true;
      try {
        session?.kill();
      } catch {}
    },
  };
}

export async function runOneShotProviderPrompt(input: {
  providerId?: string;
  providerModel?: string;
  prompt: string;
  cwd: string;
  allowedRoots?: string[];
  timeoutMs?: number;
}): Promise<string> {
  return startOneShotProviderPrompt(input).result;
}

export async function createProviderSession(input: {
  providerId?: string;
  providerModel?: string;
  cwd: string;
  allowedRoots?: string[];
  onSessionUpdate?: Parameters<typeof startAcpSession>[1]["onSessionUpdate"];
  onStderr?: Parameters<typeof startAcpSession>[1]["onStderr"];
}): Promise<AcpRunSession> {
  const provider = resolveProviderOrThrow(input.providerId);
  return startAcpSession(provider, {
    cwd: input.cwd,
    allowedRoots: input.allowedRoots,
    model: resolveConfiguredProviderModel(provider.id, input.providerModel),
    onSessionUpdate: input.onSessionUpdate,
    onStderr: input.onStderr,
  });
}

export async function probeProviderSessionOptions(input: {
  providerId?: string;
  cwd: string;
  allowedRoots?: string[];
}): Promise<AcpSessionOptionsProbeResult> {
  const provider = resolveProviderOrThrow(input.providerId);
  return probeAcpSessionOptions(provider, {
    cwd: input.cwd,
    allowedRoots: input.allowedRoots,
  });
}
