import type { AgentProvider, ProviderStatus } from "../provider-interface";
import { checkCliProviderAvailable } from "../provider-cli";
import { checkAcpProviderHealth } from "../acp-runtime";

export const codexCliProvider: AgentProvider = {
  id: "codex-cli",
  name: "Codex CLI",
  type: "cli",
  runtime: "acp",
  adapterKind: "adapter",
  icon: "bot",
  installMessage: "Cabinet could not start the bundled Codex ACP adapter. Run npm install in this project to restore dependencies. If you manage adapters globally, codex-acp on PATH also works.",
  installSteps: [
    {
      title: "Install Cabinet dependencies",
      detail: "Run npm install so Cabinet can use the bundled ACP adapters from node_modules/.bin.",
    },
    {
      title: "Optional global adapter",
      detail: "If you prefer to manage the adapter outside this repo, install @zed-industries/codex-acp globally.",
    },
    {
      title: "Use ChatGPT or API auth",
      detail: "The adapter supports ChatGPT subscription auth plus CODEX_API_KEY and OPENAI_API_KEY.",
      link: { label: "Codex ACP adapter", url: "https://github.com/zed-industries/codex-acp" },
    },
  ],
  command: "codex-acp",
  commandCandidates: [
    `${process.cwd()}/node_modules/.bin/codex-acp`,
    `${process.env.HOME || ""}/.local/bin/codex-acp`,
    "/usr/local/bin/codex-acp",
    "/opt/homebrew/bin/codex-acp",
    "codex-acp",
  ],
  commandArgs: [],

  async isAvailable(): Promise<boolean> {
    return checkCliProviderAvailable(this);
  },

  async healthCheck(): Promise<ProviderStatus> {
    return checkAcpProviderHealth(this);
  },
};
