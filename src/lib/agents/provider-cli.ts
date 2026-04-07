import fs from "fs";
import { execSync, spawn } from "child_process";
import type { AgentProvider } from "./provider-interface";

export const RUNTIME_PATH = [
  `${process.env.HOME || ""}/.local/bin`,
  process.env.PATH || "",
].filter(Boolean).join(":");

export function resolveCliCommand(provider: AgentProvider): string {
  const candidates = [
    ...(provider.commandCandidates || []),
    provider.command,
  ].filter((candidate): candidate is string => !!candidate);

  for (const candidate of candidates) {
    if (candidate.includes("/") && fs.existsSync(candidate)) {
      return candidate;
    }
  }

  for (const candidate of candidates) {
    if (candidate.includes("/")) continue;
    try {
      const resolved = execSync(`command -v ${candidate}`, {
        encoding: "utf8",
        env: { ...process.env, PATH: RUNTIME_PATH },
        stdio: ["ignore", "pipe", "ignore"],
      }).trim();

      if (resolved) {
        return resolved;
      }
    } catch {
      // Ignore and keep trying.
    }
  }

  if (!provider.command) {
    throw new Error(`Provider ${provider.id} does not define a command`);
  }

  return provider.command;
}

export async function checkCliProviderAvailable(provider: AgentProvider): Promise<boolean> {
  return new Promise((resolve) => {
    let command: string;
    try {
      command = resolveCliCommand(provider);
    } catch {
      resolve(false);
      return;
    }

    const proc = spawn(command, ["--version"], {
      env: {
        ...process.env,
        PATH: RUNTIME_PATH,
      },
      stdio: ["ignore", "pipe", "pipe"],
    });

    const settle = (value: boolean) => {
      clearTimeout(timeout);
      resolve(value);
    };

    proc.on("close", (code) => {
      settle(code === 0);
    });

    proc.on("error", () => {
      settle(false);
    });

    const timeout = setTimeout(() => {
      proc.kill();
      settle(false);
    }, 5000);
  });
}
