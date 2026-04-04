import fs from "fs";
import { execSync, spawn } from "child_process";
import type { AgentProvider, CliProviderInvocation } from "./provider-interface";
import { providerRegistry } from "./provider-registry";

const RUNTIME_PATH = [
  `${process.env.HOME || ""}/.local/bin`,
  process.env.PATH || "",
].filter(Boolean).join(":");

export interface ProviderLaunchSpec extends CliProviderInvocation {
  providerId: string;
  providerName: string;
  installMessage?: string;
}

function resolveProviderOrThrow(providerId?: string): AgentProvider {
  const provider = providerId
    ? providerRegistry.get(providerId)
    : providerRegistry.getDefault();

  if (!provider) {
    throw new Error(
      providerId
        ? `Unknown provider: ${providerId}`
        : "No default provider is configured"
    );
  }

  return provider;
}

function resolveCliCommand(provider: AgentProvider): string {
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

function buildLaunchSpec(
  providerId: string | undefined,
  prompt: string | undefined,
  workdir: string,
  mode: "one-shot" | "session"
): ProviderLaunchSpec {
  const provider = resolveProviderOrThrow(providerId);

  if (provider.type !== "cli") {
    throw new Error(`Provider ${provider.id} is not a CLI provider`);
  }

  let invocation: CliProviderInvocation | undefined;

  if (mode === "one-shot" && provider.buildOneShotInvocation && prompt) {
    invocation = provider.buildOneShotInvocation(prompt, workdir);
  }

  if (mode === "session" && provider.buildSessionInvocation) {
    invocation = provider.buildSessionInvocation(prompt, workdir);
  }

  if (!invocation && prompt && provider.buildArgs && provider.command) {
    invocation = {
      command: provider.command,
      args: provider.buildArgs(prompt, workdir),
    };
  }

  if (!invocation && provider.command) {
    invocation = {
      command: provider.command,
      args: [],
    };
  }

  if (!invocation) {
    throw new Error(`Provider ${provider.id} does not define a ${mode} launch contract`);
  }

  return {
    providerId: provider.id,
    providerName: provider.name,
    installMessage: provider.installMessage,
    command: resolveCliCommand(provider),
    args: invocation.args,
    initialPrompt: invocation.initialPrompt,
    readyStrategy: invocation.readyStrategy,
  };
}

export function getDefaultProviderId(): string {
  return resolveProviderOrThrow().id;
}

export function resolveProviderId(providerId?: string): string {
  return resolveProviderOrThrow(providerId).id;
}

export function getSessionLaunchSpec(input: {
  providerId?: string;
  prompt?: string;
  workdir: string;
}): ProviderLaunchSpec {
  return buildLaunchSpec(input.providerId, input.prompt, input.workdir, "session");
}

export function getOneShotLaunchSpec(input: {
  providerId?: string;
  prompt: string;
  workdir: string;
}): ProviderLaunchSpec {
  return buildLaunchSpec(input.providerId, input.prompt, input.workdir, "one-shot");
}

export async function runOneShotProviderPrompt(input: {
  providerId?: string;
  prompt: string;
  cwd: string;
  timeoutMs?: number;
}): Promise<string> {
  const provider = resolveProviderOrThrow(input.providerId);

  if (provider.type === "api" && provider.runPrompt) {
    return provider.runPrompt(input.prompt, "");
  }

  const launch = getOneShotLaunchSpec({
    providerId: input.providerId,
    prompt: input.prompt,
    workdir: input.cwd,
  });

  return new Promise<string>((resolve, reject) => {
    const proc = spawn(launch.command, launch.args, {
      cwd: input.cwd,
      env: {
        ...process.env,
        PATH: RUNTIME_PATH,
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let settled = false;
    const timeoutHandle = setTimeout(() => {
      if (settled) return;
      settled = true;
      proc.kill();
      reject(new Error("Timed out after waiting for provider output"));
    }, input.timeoutMs || 120_000);

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (data: Buffer) => {
      stdout += data.toString();
    });

    proc.stderr.on("data", (data: Buffer) => {
      stderr += data.toString();
    });

    proc.on("close", (code: number | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutHandle);
      if (code === 0) {
        resolve(stdout.trim());
      } else {
        reject(new Error(stderr || `Exited with code ${code}`));
      }
    });

    proc.on("error", (error: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutHandle);
      reject(
        new Error(
          launch.installMessage
            ? `${launch.installMessage} (${error.message})`
            : `Failed to spawn ${launch.command}: ${error.message}`
        )
      );
    });
  });
}
