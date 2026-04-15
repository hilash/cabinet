import fs from "fs";
import { spawn } from "child_process";
import type { AgentProvider } from "./provider-interface";
import {
  ADAPTER_RUNTIME_PATH,
  resolveCommandFromCandidates,
  withAdapterRuntimeEnv,
} from "./adapters/utils";

export const RUNTIME_PATH = ADAPTER_RUNTIME_PATH;

export function resolveCliCommand(provider: AgentProvider): string {
  const candidates = [
    ...(provider.commandCandidates || []),
    provider.command,
  ].filter((candidate): candidate is string => !!candidate);

  const resolved = resolveCommandFromCandidates(candidates, process.env);
  if (resolved) return resolved;

  for (const candidate of candidates) {
    if (candidate.includes("/") && fs.existsSync(candidate)) return candidate;
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
      env: withAdapterRuntimeEnv(process.env),
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
