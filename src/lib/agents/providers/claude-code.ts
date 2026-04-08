import type { AgentProvider, ProviderStatus } from "../provider-interface";
import { checkCliProviderAvailable } from "../provider-cli";
import { checkAcpProviderHealth } from "../acp-runtime";

export const claudeCodeProvider: AgentProvider = {
  id: "claude-code",
  name: "Claude Code Max",
  type: "cli",
  runtime: "acp",
  adapterKind: "adapter",
  icon: "sparkles",
  installMessage: "Cabinet could not start the bundled Claude ACP adapter. Run npm install in this project to restore dependencies. If you manage adapters globally, claude-code-acp on PATH also works.",
  installSteps: [
    {
      title: "Install Cabinet dependencies",
      detail: "Run npm install so Cabinet can use the bundled ACP adapters from node_modules/.bin.",
    },
    {
      title: "Optional global adapter",
      detail: "If you prefer to manage the adapter outside this repo, install @zed-industries/claude-code-acp globally.",
    },
    {
      title: "Configure Anthropic auth",
      detail: "Set ANTHROPIC_API_KEY or use the adapter-supported Claude auth flow.",
      link: { label: "Claude Code ACP adapter", url: "https://github.com/zed-industries/claude-code-acp" },
    },
  ],
  command: "claude-code-acp",
  commandCandidates: [
    `${process.cwd()}/node_modules/.bin/claude-code-acp`,
    `${process.env.HOME || ""}/.local/bin/claude-code-acp`,
    "/usr/local/bin/claude-code-acp",
    "/opt/homebrew/bin/claude-code-acp",
    "claude-code-acp",
  ],
  commandArgs: [],

  async isAvailable(): Promise<boolean> {
    return checkCliProviderAvailable(this);
  },

  async healthCheck(): Promise<ProviderStatus> {
    return checkAcpProviderHealth(this);
  },
};
