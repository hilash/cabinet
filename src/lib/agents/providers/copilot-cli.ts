import type { AgentProvider, ProviderStatus } from "../provider-interface";
import {
  checkCliProviderAvailable,
  execCli,
  resolveCliCommand,
} from "../provider-cli";

const COPILOT_MODELS = [
  {
    id: "claude-sonnet-4.5",
    name: "Claude Sonnet 4.5 (via Copilot)",
    description: "Anthropic Sonnet routed through GitHub Copilot",
  },
  {
    id: "gpt-5",
    name: "GPT-5 (via Copilot)",
    description: "OpenAI flagship routed through GitHub Copilot",
  },
  {
    id: "gpt-5-mini",
    name: "GPT-5 Mini (via Copilot)",
    description: "Fast, cheap option routed through GitHub Copilot",
  },
  {
    id: "gemini-2.5-pro",
    name: "Gemini 2.5 Pro (via Copilot)",
    description: "Google model routed through GitHub Copilot",
  },
] as const;

export const copilotCliProvider: AgentProvider = {
  id: "copilot-cli",
  name: "Copilot CLI",
  type: "cli",
  icon: "copilot",
  iconAsset: "/providers/copilot.svg",
  installMessage:
    "GitHub Copilot CLI not found. Install with: npm install -g @github/copilot",
  installSteps: [
    {
      title: "Get a Copilot subscription",
      detail:
        "Any GitHub Copilot plan works (Individual, Business, or Enterprise).",
      link: {
        label: "GitHub Copilot plans",
        url: "https://github.com/features/copilot/plans",
      },
    },
    {
      title: "Install Copilot CLI",
      detail: "Run the following in your terminal:",
      command: "npm install -g @github/copilot",
    },
    {
      title: "Sign in to GitHub",
      detail:
        "Authenticate Copilot CLI with your GitHub account. It reuses `gh` auth when available:",
      command: "copilot auth login",
    },
    {
      title: "Verify setup",
      detail: "Confirm headless mode works:",
      command: "copilot -p 'Reply with exactly OK' --allow-all-tools",
    },
  ],
  detachedPromptLaunchMode: "one-shot",
  models: COPILOT_MODELS.map((model) => ({
    id: model.id,
    name: model.name,
    description: model.description,
    effortLevels: [],
  })),
  effortLevels: [],
  command: "copilot",
  commandCandidates: [
    `${process.env.HOME || ""}/.local/bin/copilot`,
    "/usr/local/bin/copilot",
    "/opt/homebrew/bin/copilot",
    "copilot",
  ],

  buildArgs(prompt: string): string[] {
    return ["-p", prompt, "--allow-all-tools"];
  },

  buildOneShotInvocation(prompt: string, workdir: string, opts) {
    const baseArgs = this.buildArgs ? this.buildArgs(prompt, workdir) : [];
    const args = [...baseArgs];
    if (opts?.model) {
      args.push("--model", opts.model);
    }
    return {
      command: this.command || "copilot",
      args,
    };
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
          version: version ? `Copilot CLI ${version}` : "Copilot CLI installed",
        };
      } catch {
        return {
          available: true,
          authenticated: false,
          error:
            "Copilot CLI is installed but not authenticated. Run: copilot auth login",
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
