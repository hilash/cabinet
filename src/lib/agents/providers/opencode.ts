import type { AgentProvider, ProviderStatus } from "../provider-interface";
import {
  checkCliProviderAvailable,
  execCli,
  resolveCliCommand,
} from "../provider-cli";

const OPENCODE_VARIANT_LEVELS = [
  { id: "minimal", name: "Minimal", description: "Skip extra reasoning" },
  { id: "low", name: "Low", description: "Quick reasoning" },
  { id: "medium", name: "Medium", description: "Balanced depth" },
  { id: "high", name: "High", description: "Thorough reasoning" },
  { id: "xhigh", name: "Extra High", description: "Maximum depth" },
  { id: "max", name: "Max", description: "Provider max effort" },
] as const;

const OPENCODE_FALLBACK_MODELS = [
  { id: "openai/gpt-5.2-codex", name: "openai/gpt-5.2-codex" },
  { id: "openai/gpt-5.4", name: "openai/gpt-5.4" },
  { id: "openai/gpt-5.1-codex-max", name: "openai/gpt-5.1-codex-max" },
  { id: "anthropic/claude-sonnet-4-6", name: "anthropic/claude-sonnet-4-6" },
  { id: "anthropic/claude-opus-4-7", name: "anthropic/claude-opus-4-7" },
  { id: "google/gemini-2.5-pro", name: "google/gemini-2.5-pro" },
] as const;

export const openCodeProvider: AgentProvider = {
  id: "opencode",
  name: "OpenCode",
  type: "cli",
  icon: "opencode",
  iconAsset: "/providers/opencode.svg",
  installMessage:
    "OpenCode CLI not found. Install with: npm i -g opencode-ai",
  installSteps: [
    {
      title: "Install OpenCode",
      detail: "Run the following in your terminal:",
      command: "npm i -g opencode-ai",
    },
    {
      title: "Configure a provider",
      detail:
        "OpenCode routes to many providers. Configure at least one (OpenAI, Anthropic, OpenRouter, etc.) via environment variables or `opencode auth`.",
      command: "opencode auth",
      link: {
        label: "OpenCode docs",
        url: "https://opencode.ai/docs",
      },
    },
    {
      title: "Verify setup",
      detail: "Confirm headless mode works:",
      command: "opencode run 'Reply with exactly OK'",
    },
  ],
  detachedPromptLaunchMode: "one-shot",
  supportsTerminalResume: true,
  models: OPENCODE_FALLBACK_MODELS.map((model) => ({
    id: model.id,
    name: model.name,
    effortLevels: [...OPENCODE_VARIANT_LEVELS],
  })),
  effortLevels: [...OPENCODE_VARIANT_LEVELS],
  command: "opencode",
  commandCandidates: [
    `${process.env.HOME || ""}/.local/bin/opencode`,
    "/usr/local/bin/opencode",
    "/opt/homebrew/bin/opencode",
    "opencode",
  ],

  buildArgs(prompt: string): string[] {
    return ["run", prompt];
  },

  buildOneShotInvocation(prompt: string, workdir: string, opts) {
    const baseArgs = this.buildArgs ? this.buildArgs(prompt, workdir) : [];
    const args = [...baseArgs];
    if (opts?.model) {
      args.push("--model", opts.model);
    }
    if (opts?.effort) {
      args.push("--variant", opts.effort);
    }
    if (opts?.resumeId) {
      args.push("--session", opts.resumeId);
    }
    return {
      command: this.command || "opencode",
      args,
    };
  },

  async listModels() {
    try {
      const cmd = resolveCliCommand(this);
      const out = await execCli(cmd, ["models"], { timeout: 10_000 });
      if (!out) return [...OPENCODE_FALLBACK_MODELS].map((m) => ({ ...m, effortLevels: [...OPENCODE_VARIANT_LEVELS] }));
      return out
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line && line.includes("/"))
        .map((id) => ({
          id,
          name: id,
          effortLevels: [...OPENCODE_VARIANT_LEVELS],
        }));
    } catch {
      return [...OPENCODE_FALLBACK_MODELS].map((m) => ({ ...m, effortLevels: [...OPENCODE_VARIANT_LEVELS] }));
    }
  },

  async isAvailable(): Promise<boolean> {
    return checkCliProviderAvailable(this);
  },

  async healthCheck(): Promise<ProviderStatus> {
    try {
      const available = await this.isAvailable();
      if (!available) {
        return {
          available: false,
          authenticated: false,
          error: this.installMessage,
        };
      }

      try {
        const cmd = resolveCliCommand(this);
        const version = await execCli(cmd, ["--version"], { timeout: 5000 });

        return {
          available: true,
          authenticated: true,
          version: version ? `OpenCode ${version}` : "OpenCode installed",
        };
      } catch {
        return {
          available: true,
          authenticated: false,
          error: "OpenCode is installed but not verified. Configure a provider (e.g. OPENAI_API_KEY).",
        };
      }
    } catch (error) {
      return {
        available: false,
        authenticated: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
};
