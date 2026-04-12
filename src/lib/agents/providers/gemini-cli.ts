import { execSync } from "child_process";
import type { AgentProvider, ProviderStatus } from "../provider-interface";
import { checkCliProviderAvailable, resolveCliCommand, RUNTIME_PATH } from "../provider-cli";

export const geminiCliProvider: AgentProvider = {
  id: "gemini-cli",
  name: "Gemini CLI",
  type: "cli",
  icon: "gem",
  installMessage: "Gemini CLI not found. Install with: npm install -g @google/gemini-cli or see geminicli.com",
  installSteps: [
    { title: "Install Gemini CLI", detail: "npm install -g @google/gemini-cli" },
    { title: "Log in", detail: "Run gemini in your terminal and follow the login prompts." },
  ],
  command: "gemini",
  commandCandidates: [
    `${process.env.HOME || ""}/.local/bin/gemini`,
    "/usr/local/bin/gemini",
    "/opt/homebrew/bin/gemini",
    "gemini",
  ],

  buildArgs(prompt: string, _workdir: string): string[] {
    return ["--approval-mode=yolo", prompt];
  },

  buildOneShotInvocation(prompt: string, workdir: string) {
    return {
      command: this.command || "gemini",
      args: this.buildArgs ? this.buildArgs(prompt, workdir) : [],
    };
  },

  buildSessionInvocation(prompt: string | undefined, _workdir: string) {
    // Gemini uses a rich TUI — raw PTY writes don't reach its input widget.
    // Use -i (prompt-interactive) to execute the prompt on startup while
    // keeping the interactive session alive for follow-up messages.
    const args = ["--approval-mode=yolo"];
    if (prompt?.trim()) {
      args.push("-i", prompt.trim());
    }
    return {
      command: this.command || "gemini",
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

      // Gemini CLI has no fast local auth-status command (unlike Claude/Codex).
      // We only check --version here to avoid blocking the event loop with an
      // API round-trip. Auth failures surface at first actual use.
      try {
        const cmd = resolveCliCommand(this);
        const version = execSync(`${cmd} --version`, {
          encoding: "utf8",
          env: { ...process.env, PATH: RUNTIME_PATH },
          stdio: ["ignore", "pipe", "ignore"],
          timeout: 5000,
        }).trim();

        return {
          available: true,
          authenticated: true,
          version,
        };
      } catch {
        return {
          available: true,
          authenticated: false,
          error: "Could not verify Gemini CLI status. Try running: gemini",
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
