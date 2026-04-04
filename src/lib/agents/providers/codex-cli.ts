import { spawn } from "child_process";
import type { AgentProvider, ProviderStatus } from "../provider-interface";

export const codexCliProvider: AgentProvider = {
  id: "codex-cli",
  name: "Codex CLI",
  type: "cli",
  icon: "bot",
  installMessage: "Codex CLI not found. Install with: npm install -g @openai/codex or brew install --cask codex",
  command: "codex",
  commandCandidates: [
    `${process.env.HOME || ""}/.local/bin/codex`,
    "/usr/local/bin/codex",
    "/opt/homebrew/bin/codex",
    "codex",
  ],

  buildArgs(prompt: string, _workdir: string): string[] {
    return [
      "exec",
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
    if (!prompt?.trim()) {
      return {
        command: this.command || "codex",
        args: [],
      };
    }

    return {
      command: this.command || "codex",
      args: this.buildArgs ? this.buildArgs(prompt, workdir) : [],
    };
  },

  async isAvailable(): Promise<boolean> {
    return new Promise((resolve) => {
      const proc = spawn("codex", ["--version"], {
        stdio: ["pipe", "pipe", "pipe"],
      });

      proc.on("close", (code) => {
        resolve(code === 0);
      });

      proc.on("error", () => {
        resolve(false);
      });

      setTimeout(() => {
        proc.kill();
        resolve(false);
      }, 5000);
    });
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
        authenticated: true,
        version: "Codex CLI",
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
