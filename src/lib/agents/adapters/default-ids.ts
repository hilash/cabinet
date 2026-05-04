export const DEFAULT_AGENT_ADAPTER_TYPE = "claude_local";

export const DEFAULT_ADAPTER_BY_PROVIDER_ID: Record<string, string> = {
  "claude-code": "claude_local",
  "codex-cli": "codex_local",
  "gemini-cli": "gemini_local",
  "cursor-cli": "cursor_local",
  opencode: "opencode_local",
  openrouter: "openrouter_api",
  pi: "pi_local",
  "grok-cli": "grok_local",
  "copilot-cli": "copilot_local",
};

export function defaultAdapterTypeForProviderId(
  providerId?: string | null,
  fallback = DEFAULT_AGENT_ADAPTER_TYPE
): string {
  return providerId && DEFAULT_ADAPTER_BY_PROVIDER_ID[providerId]
    ? DEFAULT_ADAPTER_BY_PROVIDER_ID[providerId]
    : fallback;
}
