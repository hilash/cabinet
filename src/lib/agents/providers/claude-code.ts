import { execSync } from "child_process";
import type { AgentProvider, ProviderStatus } from "../provider-interface";
import { checkCliProviderAvailable, resolveCliCommand, RUNTIME_PATH } from "../provider-cli";
import { getNvmNodeBin } from "../nvm-path";

const nvmClaudePath = (() => {
  const bin = getNvmNodeBin();
  return bin ? `${bin}/claude` : null;
})();

export const claudeCodeProvider: AgentProvider = {
  id: "claude-code",
  name: "Claude Code",
  type: "cli",
  icon: "sparkles",
  installMessage: "Claude CLI not found. Install with: npm install -g @anthropic-ai/claude-code",
  installSteps: [
    { title: "Get a Claude subscription", detail: "Any Claude Code subscription will do (Pro, Max, or Team).", link: { label: "Open Claude billing", url: "https://claude.ai/settings/billing" } },
    { title: "Install Claude Code", detail: "npm install -g @anthropic-ai/claude-code" },
    { title: "Log in", detail: "Run claude in your terminal and follow the login prompts." },
  ],
  command: "claude",
  commandCandidates: [
    `${process.env.HOME || ""}/.local/bin/claude`,
    "/usr/local/bin/claude",
    "/opt/homebrew/bin/claude",
    ...(nvmClaudePath ? [nvmClaudePath] : []),
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
    // When a prompt is provided (manual/scheduled/heartbeat runs), use -p
    // non-interactive mode. This avoids Claude Code's first-run Bypass
    // Permissions interactive warning that blocks node-pty sessions and
    // results in exitCode 1 with "SUMMARY:..." template-only output.
    const trimmed = prompt?.trim();
    if (trimmed) {
      return {
        command: this.command || "claude",
        args: ["--dangerously-skip-permissions", "-p", trimmed, "--output-format", "text"],
      };
    }
    // No prompt = pure interactive session (AI panel chat). Keep legacy path.
    return {
      command: this.command || "claude",
      args: ["--dangerously-skip-permissions"],
      initialPrompt: undefined,
      readyStrategy: undefined,
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

      // Check actual auth status via `claude auth status`
      try {
        const cmd = resolveCliCommand(this);
        const output = execSync(`${cmd} auth status`, {
          encoding: "utf8",
          env: { ...process.env, PATH: RUNTIME_PATH },
          stdio: ["ignore", "pipe", "ignore"],
          timeout: 5000,
        }).trim();
        const auth = JSON.parse(output);
        if (auth.loggedIn) {
          const sub = auth.subscriptionType ? ` (${auth.subscriptionType})` : "";
          return {
            available: true,
            authenticated: true,
            version: `Logged in${sub}`,
          };
        }
        return {
          available: true,
          authenticated: false,
          error: "Claude Code is installed but not logged in. Run: claude auth login",
        };
      } catch {
        // auth status command failed — might be older version without it
        return {
          available: true,
          authenticated: false,
          error: "Could not verify login status. Run: claude auth login",
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
