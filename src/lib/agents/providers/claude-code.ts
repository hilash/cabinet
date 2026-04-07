import type { AgentProvider, ProviderStatus } from "../provider-interface";
import { checkCliProviderAvailable } from "../provider-cli";

export const claudeCodeProvider: AgentProvider = {
  id: "claude-code",
  name: "Claude Code Max",
  type: "cli",
  icon: "sparkles",
  installMessage: "Claude CLI not found. Install with: npm install -g @anthropic-ai/claude-code",
  installSteps: [
    { title: "Get a Claude subscription", detail: "You need a Claude Max or Team plan to use Claude Code.", link: { label: "Open Claude billing", url: "https://claude.ai/settings/billing" } },
    { title: "Install Claude Code", detail: "npm install -g @anthropic-ai/claude-code" },
    { title: "Log in", detail: "Run claude in your terminal and follow the login prompts." },
  ],
  command: "claude",
  commandCandidates: [
    `${process.env.HOME || ""}/.local/bin/claude`,
    "/usr/local/bin/claude",
    "/opt/homebrew/bin/claude",
    "claude",
  ],

  buildArgs(prompt: string, _workdir: string): string[] {
    return ["--dangerously-skip-permissions", "-p", prompt, "--output-format", "text"];
  },

  buildOneShotInvocation(prompt: string, workdir: string) {
    return {
      command: this.command || "claude",
      args: this.buildArgs ? this.buildArgs(prompt, workdir) : [],
    };
  },

  buildSessionInvocation(prompt: string | undefined, _workdir: string) {
    return {
      command: this.command || "claude",
      args: ["--dangerously-skip-permissions"],
      initialPrompt: prompt?.trim() || undefined,
      readyStrategy: prompt ? "claude" : undefined,
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

      return {
        available: true,
        authenticated: true, // Max subscription auth is inherited
        version: "Claude Code Max",
      };
    } catch (error) {
      return {
        available: false,
        authenticated: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
};
