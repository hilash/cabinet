import { spawn } from "child_process";
import type { AgentProvider, ProviderStatus } from "../provider-interface";

export const hermesAgentProvider: AgentProvider = {
  id: "hermes-agent",
  name: "Hermes Agent",
  type: "cli",
  icon: "bot",
  command: "hermes",

  buildArgs(prompt: string, workdir: string, profile?: string): string[] {
    const args = ["--dangerously-skip-permissions"];
    
    // Add profile if specified (maps to Cabinet agent slug)
    if (profile) {
      args.push("-p", profile);
    }
    
    // Add the prompt
    args.push("-p", prompt);
    
    // Request structured output
    args.push("--output-format", "json");
    
    return args;
  },

  async isAvailable(): Promise<boolean> {
    return new Promise((resolve) => {
      const proc = spawn("hermes", ["--version"], {
        stdio: ["pipe", "pipe", "pipe"],
        shell: true,
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
          error: "Hermes Agent CLI not found. Install with: pip install hermes-agent or see https://github.com/hermes-agent",
        };
      }

      // Try to get version
      const version = await new Promise<string>((resolve) => {
        const proc = spawn("hermes", ["--version"], {
          stdio: ["pipe", "pipe", "pipe"],
          shell: true,
        });

        let output = "";
        proc.stdout?.on("data", (d: Buffer) => { output += d.toString(); });
        proc.on("close", () => {
          resolve(output.trim() || "Hermes Agent");
        });
        setTimeout(() => {
          proc.kill();
          resolve("Hermes Agent");
        }, 3000);
      });

      return {
        available: true,
        authenticated: true,
        version,
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
