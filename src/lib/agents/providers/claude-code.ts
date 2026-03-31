import { spawn } from "child_process";
import type { AgentProvider, ProviderStatus } from "../provider-interface";

export const claudeCodeProvider: AgentProvider = {
  id: "claude-code",
  name: "Claude Code Max",
  type: "cli",
  icon: "sparkles",
  command: "claude",

  buildArgs(prompt: string, _workdir: string): string[] {
    return ["--dangerously-skip-permissions", "-p", prompt, "--output-format", "text"];
  },

  async isAvailable(): Promise<boolean> {
    return new Promise((resolve) => {
      const proc = spawn("claude", ["--version"], {
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
          error: "Claude CLI not found. Install with: npm install -g @anthropic-ai/claude-code",
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
