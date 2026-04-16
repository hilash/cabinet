import fs from "fs";
import os from "os";
import path from "path";
import { execFileSync, spawn } from "child_process";
import type { AgentProvider } from "./provider-interface";
import { getNvmNodeBin } from "./nvm-path";

const nvmBin = getNvmNodeBin();

function preferredRuntimePathEntries(): string[] {
  const entries = new Set<string>();
  const homeDir = os.homedir();

  if (process.platform === "win32") {
    const appData = process.env.APPDATA || path.join(homeDir, "AppData", "Roaming");
    entries.add(path.join(appData, "npm"));
    const localAppData = process.env.LOCALAPPDATA || path.join(homeDir, "AppData", "Local");
    entries.add(path.join(localAppData, "Programs", "Microsoft VS Code", "bin"));
  } else {
    entries.add(path.join(homeDir, ".local", "bin"));
    entries.add("/usr/local/bin");
    entries.add("/opt/homebrew/bin");
  }

  if (nvmBin) {
    entries.add(nvmBin);
  }

  if (process.env.PATH) {
    entries.add(process.env.PATH);
  }

  return [...entries].filter(Boolean);
}

export const RUNTIME_PATH = preferredRuntimePathEntries().join(path.delimiter);

export interface CliExecutionSpec {
  command: string;
  args: string[];
}

function isPathLikeCommand(candidate: string): boolean {
  return path.isAbsolute(candidate) || /[\\/]/.test(candidate);
}

function resolveCommandFromPath(command: string): string | null {
  const lookupCommand = process.platform === "win32" ? "where.exe" : "which";

  try {
    const output = execFileSync(lookupCommand, [command], {
      encoding: "utf8",
      env: { ...process.env, PATH: RUNTIME_PATH },
      stdio: ["ignore", "pipe", "ignore"],
    });

    return output
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find(Boolean) || null;
  } catch {
    return null;
  }
}

function quoteWindowsCmdArgument(arg: string): string {
  if (!arg) {
    return '""';
  }

  const escaped = arg.replace(/"/g, '""');
  return /[\s"&<>^|()]/.test(arg) ? `"${escaped}"` : escaped;
}

export function normalizeCliExecution(
  command: string,
  args: string[] = []
): CliExecutionSpec {
  if (process.platform !== "win32" || !/\.(cmd|bat)$/i.test(command)) {
    return { command, args };
  }

  const comspec = process.env.ComSpec || "cmd.exe";
  const commandLine = [command, ...args].map(quoteWindowsCmdArgument).join(" ");
  return {
    command: comspec,
    args: ["/d", "/s", "/c", commandLine],
  };
}

export function resolveCliCommand(provider: AgentProvider): string {
  const candidates = [
    ...(provider.commandCandidates || []),
    provider.command,
  ].filter((candidate): candidate is string => !!candidate);

  for (const candidate of candidates) {
    if (isPathLikeCommand(candidate) && fs.existsSync(candidate)) {
      return candidate;
    }
  }

  for (const candidate of candidates) {
    if (isPathLikeCommand(candidate)) continue;
    const resolved = resolveCommandFromPath(candidate);
    if (resolved) {
      return resolved;
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

    const invocation = normalizeCliExecution(command, ["--version"]);
    const proc = spawn(invocation.command, invocation.args, {
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
