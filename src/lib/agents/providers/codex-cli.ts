import { execSync } from "child_process";
import type { AgentProvider, ProviderStatus } from "../provider-interface";
import {
  buildCommandCandidates,
  checkCliProviderAvailable,
  resolveCliCommand,
  RUNTIME_PATH,
} from "../provider-cli";

export const codexCliProvider: AgentProvider = {
  id: "codex-cli",
  name: "Codex CLI",
  type: "cli",
  icon: "bot",
  installMessage: "Codex CLI not found. Install with: npm i -g @openai/codex",
  installSteps: [
    { title: "Install Codex CLI", detail: "npm i -g @openai/codex" },
    { title: "Log in", detail: "Run codex in your terminal and follow the login prompts." },
  ],
  command: "codex",
  commandCandidates: buildCommandCandidates("codex"),

  buildArgs(prompt: string, _workdir: string): string[] {
    return [
      "exec",
      "--ephemeral",
      "--skip-git-repo-check",
      "--dangerously-bypass-approvals-and-sandbox",
      prompt,
    ];
  },

  buildOneShotInvocation(prompt: string, workdir: string) {
    return {
      command: this.command || "codex",
      args: this.buildArgs ? this.buildArgs(prompt, workdir) : [],
    };
  },

  buildSessionInvocation(prompt: string | undefined, workdir: string) {
    if (prompt?.trim()) {
      return {
        command: this.command || "codex",
        args: this.buildArgs ? this.buildArgs(prompt.trim(), workdir) : [prompt.trim()],
      };
    }

    return {
      command: this.command || "codex",
      args: ["--ephemeral"],
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

      // Check auth status via `codex login status`
      try {
        const cmd = resolveCliCommand(this);
        const output = execSync(`${cmd} login status 2>&1`, {
          encoding: "utf8",
          env: { ...process.env, PATH: RUNTIME_PATH },
          stdio: ["ignore", "pipe", "ignore"],
          timeout: 5000,
        }).trim();

        // Output is e.g. "Logged in using ChatGPT"
        if (output.toLowerCase().startsWith("logged in")) {
          return {
            available: true,
            authenticated: true,
            version: output,
          };
        }

        return {
          available: true,
          authenticated: false,
          error: "Codex CLI is installed but not logged in. Run: codex login",
        };
      } catch {
        return {
          available: true,
          authenticated: false,
          error: "Could not verify login status. Run: codex login",
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
