import type { AgentProvider, ProviderStatus } from "../provider-interface";
import {
  checkCliProviderAvailable,
  execCli,
  resolveCliCommand,
} from "../provider-cli";

const GROK_MODELS = [
  { id: "grok-4", name: "Grok 4", description: "xAI's flagship reasoning model" },
  {
    id: "grok-code-fast-1",
    name: "Grok Code Fast 1",
    description: "Fast code-focused Grok model",
  },
  { id: "grok-3", name: "Grok 3", description: "Previous generation flagship" },
  {
    id: "grok-3-fast",
    name: "Grok 3 Fast",
    description: "Faster, lower-latency Grok 3",
  },
] as const;

export const grokCliProvider: AgentProvider = {
  id: "grok-cli",
  name: "Grok CLI",
  type: "cli",
  icon: "grok",
  iconAsset: "/providers/grok.svg",
  installMessage:
    "Grok CLI not found. Install with: npm install -g @vibe-kit/grok-cli",
  installSteps: [
    {
      title: "Get an xAI API key",
      detail:
        "Create or retrieve a key from the xAI Console. Cabinet will read it from XAI_API_KEY (or GROK_API_KEY).",
      link: { label: "Open xAI Console", url: "https://console.x.ai/" },
    },
    {
      title: "Install Grok CLI",
      detail: "Run the following in your terminal:",
      command: "npm install -g @vibe-kit/grok-cli",
    },
    {
      title: "Export your API key",
      detail:
        "Add XAI_API_KEY to your shell (e.g. ~/.zshrc or ~/.bashrc) so the CLI can authenticate:",
      command: "export XAI_API_KEY=sk-...",
    },
    {
      title: "Verify setup",
      detail: "Confirm headless mode works:",
      command: "grok -p 'Reply with exactly OK'",
    },
  ],
  detachedPromptLaunchMode: "one-shot",
  models: GROK_MODELS.map((model) => ({
    id: model.id,
    name: model.name,
    description: model.description,
    effortLevels: [],
  })),
  effortLevels: [],
  command: "grok",
  commandCandidates: [
    `${process.env.HOME || ""}/.local/bin/grok`,
    "/usr/local/bin/grok",
    "/opt/homebrew/bin/grok",
    "grok",
  ],

  buildArgs(prompt: string): string[] {
    return ["-p", prompt];
  },

  buildOneShotInvocation(prompt: string, workdir: string, opts) {
    const baseArgs = this.buildArgs ? this.buildArgs(prompt, workdir) : [];
    const args = [...baseArgs];
    if (opts?.model) {
      args.push("--model", opts.model);
    }
    return {
      command: this.command || "grok",
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

      const hasKey =
        Boolean(process.env.XAI_API_KEY?.trim()) ||
        Boolean(process.env.GROK_API_KEY?.trim());

      try {
        const cmd = resolveCliCommand(this);
        const version = await execCli(cmd, ["--version"], { timeout: 5000 });

        if (hasKey) {
          return {
            available: true,
            authenticated: true,
            version: version ? `Grok CLI ${version}` : "Grok CLI installed",
          };
        }

        return {
          available: true,
          authenticated: false,
          error:
            "Grok CLI is installed but XAI_API_KEY (or GROK_API_KEY) is not set in the environment.",
          version: version ? `Grok CLI ${version}` : undefined,
        };
      } catch {
        return {
          available: true,
          authenticated: hasKey,
          error: hasKey
            ? undefined
            : "Grok CLI is installed but XAI_API_KEY is not set.",
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
