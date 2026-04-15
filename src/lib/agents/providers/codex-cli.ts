import { execSync } from "child_process";
import type { AgentProvider, ProviderStatus } from "../provider-interface";
import { checkCliProviderAvailable, resolveCliCommand, RUNTIME_PATH } from "../provider-cli";

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
  commandCandidates: [
    `${process.env.HOME || ""}/.local/bin/codex`,
    "/usr/local/bin/codex",
    "/opt/homebrew/bin/codex",
    "codex",
  ],

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

      const cmd = resolveCliCommand(this);

      // Get version
      let cliVersion = "";
      try {
        cliVersion = execSync(`${cmd} --version`, {
          encoding: "utf8",
          env: { ...process.env, PATH: RUNTIME_PATH },
          stdio: ["ignore", "pipe", "ignore"],
          timeout: 5000,
        }).trim();
      } catch { /* ignore */ }

      // Check auth status via `codex login status`
      try {
        const output = execSync(`${cmd} login status 2>&1`, {
          encoding: "utf8",
          env: { ...process.env, PATH: RUNTIME_PATH },
          stdio: ["ignore", "pipe", "ignore"],
          timeout: 5000,
        }).trim();

        if (output.toLowerCase().startsWith("logged in")) {
          const ver = cliVersion ? (cliVersion.startsWith("v") ? cliVersion : `v${cliVersion}`) : "";
          const parts = [ver, output, cmd].filter(Boolean);
          return {
            available: true,
            authenticated: true,
            version: parts.join(" · "),
          };
        }

        return {
          available: true,
          authenticated: false,
          version: cliVersion ? `v${cliVersion} · ${cmd}` : cmd,
          error: "已安装但未登录。运行: codex login",
        };
      } catch {
        // 检查配置文件判断是否通过代理登录
        try {
          const configPath = `${process.env.HOME || ""}/.codex/config.toml`;
          const config = require("fs").readFileSync(configPath, "utf8");
          const hasProvider = config.includes("model_provider");
          if (hasProvider) {
            const ver = cliVersion ? (cliVersion.startsWith("v") ? cliVersion : `v${cliVersion}`) : "";
            const parts = [ver, "已配置 (代理模式)", cmd].filter(Boolean);
            return {
              available: true,
              authenticated: true,
              version: parts.join(" · "),
            };
          }
        } catch { /* ignore */ }

        return {
          available: true,
          authenticated: false,
          version: cliVersion ? `v${cliVersion} · ${cmd}` : cmd,
          error: "无法验证登录状态。运行: codex login",
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
