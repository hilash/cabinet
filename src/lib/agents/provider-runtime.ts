import type { AgentProvider } from "./provider-interface";
import { providerRegistry } from "./provider-registry";
import {
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

export interface ProviderPromptRun {
  result: Promise<string>;
  cancel: () => void;
}

export function startOneShotProviderPrompt(input: {
  providerId?: string;
  prompt: string;
  cwd: string;
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
        cwd: input.cwd,
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
  prompt: string;
  cwd: string;
  timeoutMs?: number;
}): Promise<string> {
  return startOneShotProviderPrompt(input).result;
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
