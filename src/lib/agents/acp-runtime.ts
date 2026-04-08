import { spawn, type ChildProcessWithoutNullStreams, type ChildProcessByStdio } from "child_process";
import fs from "fs/promises";
import path from "path";
import { Readable, Writable } from "stream";
import {
  ClientSideConnection,
  PROTOCOL_VERSION,
  RequestError,
  ndJsonStream,
} from "@agentclientprotocol/sdk";
import type * as schema from "@agentclientprotocol/sdk/dist/schema/types.gen";
import type { AgentProvider, ProviderStatus } from "./provider-interface";
import { resolveCliCommand, RUNTIME_PATH } from "./provider-cli";

interface LocalTerminal {
  id: string;
  process: ChildProcessByStdio<null, Readable, Readable>;
  output: string;
  truncated: boolean;
  outputByteLimit: number;
  exitStatus?: schema.TerminalExitStatus;
  exitPromise: Promise<schema.TerminalExitStatus>;
  resolveExit: (status: schema.TerminalExitStatus) => void;
}

export interface AcpProbeResult {
  provider: {
    name?: string | null;
    version?: string | null;
  };
  authMethods: schema.AuthMethod[];
  capabilities?: schema.AgentCapabilities;
}

export interface AcpRunSession {
  providerId: string;
  providerName: string;
  acpSessionId: string;
  capabilities?: schema.AgentCapabilities;
  authMethods: schema.AuthMethod[];
  close: () => Promise<void>;
  prompt: (text: string) => Promise<schema.PromptResponse>;
  kill: () => void;
}

export interface AcpRunInput {
  cwd: string;
  allowedRoots?: string[];
  onSessionUpdate?: (params: schema.SessionNotification) => void | Promise<void>;
  onStderr?: (chunk: string) => void;
}

function normalizeAllowedRoots(cwd: string, allowedRoots?: string[]): string[] {
  const candidates = [cwd, ...(allowedRoots || [])]
    .map((root) => path.resolve(root))
    .filter(Boolean)
    .sort((a, b) => a.length - b.length);

  const roots: string[] = [];
  for (const candidate of candidates) {
    if (roots.some((root) => candidate === root || candidate.startsWith(`${root}${path.sep}`))) {
      continue;
    }
    roots.push(candidate);
  }
  return roots;
}

function getProviderEnv(): NodeJS.ProcessEnv {
  return {
    ...process.env,
    PATH: RUNTIME_PATH,
  };
}

function createTerminalId(sessionId: string): string {
  return `term-${sessionId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function trimOutputToByteLimit(value: string, limit: number): { output: string; truncated: boolean } {
  if (limit <= 0) {
    return { output: "", truncated: value.length > 0 };
  }

  let output = value;
  let truncated = false;
  while (Buffer.byteLength(output, "utf8") > limit && output.length > 0) {
    output = output.slice(Math.ceil(output.length / 10));
    truncated = true;
  }

  return { output, truncated };
}

function normalizeTerminalExitStatus(code: number | null, signal: NodeJS.Signals | null): schema.TerminalExitStatus {
  return {
    exitCode: typeof code === "number" ? code : null,
    signal: signal || null,
  };
}

function assertAllowedPath(filePath: string, allowedRoots: string[]): void {
  const resolved = path.resolve(filePath);
  if (!path.isAbsolute(resolved)) {
    throw new Error(`ACP filesystem path must be absolute: ${filePath}`);
  }

  if (!allowedRoots.some((root) => resolved === root || resolved.startsWith(`${root}${path.sep}`))) {
    throw new Error(`ACP path is outside the allowed workspace: ${resolved}`);
  }
}

function buildClientHandlers(input: {
  allowedRoots: string[];
  onSessionUpdate?: (params: schema.SessionNotification) => void | Promise<void>;
}) {
  const terminals = new Map<string, LocalTerminal>();

  return {
    terminals,
    client: {
      async requestPermission(params: schema.RequestPermissionRequest): Promise<schema.RequestPermissionResponse> {
        const preferred =
          params.options.find((option) => option.kind === "allow_always") ||
          params.options.find((option) => option.kind === "allow_once") ||
          params.options[0];

        if (!preferred) {
          return { outcome: { outcome: "cancelled" } };
        }

        return {
          outcome: {
            outcome: "selected",
            optionId: preferred.optionId,
          },
        };
      },
      async sessionUpdate(params: schema.SessionNotification): Promise<void> {
        await input.onSessionUpdate?.(params);
      },
      async readTextFile(params: schema.ReadTextFileRequest): Promise<schema.ReadTextFileResponse> {
        assertAllowedPath(params.path, input.allowedRoots);
        const raw = await fs.readFile(params.path, "utf8");
        if (!params.line && !params.limit) {
          return { content: raw };
        }

        const lines = raw.split("\n");
        const startIndex = Math.max((params.line || 1) - 1, 0);
        const endIndex =
          typeof params.limit === "number" && params.limit > 0
            ? startIndex + params.limit
            : lines.length;

        return {
          content: lines.slice(startIndex, endIndex).join("\n"),
        };
      },
      async writeTextFile(params: schema.WriteTextFileRequest): Promise<schema.WriteTextFileResponse> {
        assertAllowedPath(params.path, input.allowedRoots);
        await fs.mkdir(path.dirname(params.path), { recursive: true });
        await fs.writeFile(params.path, params.content, "utf8");
        return {};
      },
      async createTerminal(params: schema.CreateTerminalRequest): Promise<schema.CreateTerminalResponse> {
        const terminalId = createTerminalId(params.sessionId);
        const cwd =
          params.cwd && path.isAbsolute(params.cwd)
            ? params.cwd
            : input.allowedRoots[0];

        if (cwd) {
          assertAllowedPath(cwd, input.allowedRoots);
        }

        const env = {
          ...getProviderEnv(),
          ...(params.env || []).reduce<Record<string, string>>((acc, entry) => {
            acc[entry.name] = entry.value;
            return acc;
          }, {}),
        };

        let resolveExit: (status: schema.TerminalExitStatus) => void = () => {};
        const exitPromise = new Promise<schema.TerminalExitStatus>((resolve) => {
          resolveExit = resolve;
        });

        const proc = spawn(params.command, params.args || [], {
          cwd,
          env,
          stdio: ["ignore", "pipe", "pipe"],
        });

        const terminal: LocalTerminal = {
          id: terminalId,
          process: proc,
          output: "",
          truncated: false,
          outputByteLimit: params.outputByteLimit || 256_000,
          exitPromise,
          resolveExit,
        };

        const append = (chunk: Buffer) => {
          const combined = `${terminal.output}${chunk.toString()}`;
          const trimmed = trimOutputToByteLimit(combined, terminal.outputByteLimit);
          terminal.output = trimmed.output;
          terminal.truncated = terminal.truncated || trimmed.truncated;
        };

        proc.stdout.on("data", append);
        proc.stderr.on("data", append);
        proc.on("close", (code, signal) => {
          const status = normalizeTerminalExitStatus(code, signal);
          terminal.exitStatus = status;
          terminal.resolveExit(status);
        });
        proc.on("error", (error) => {
          append(Buffer.from(`\n${error.message}\n`));
          const status = normalizeTerminalExitStatus(1, null);
          terminal.exitStatus = status;
          terminal.resolveExit(status);
        });

        terminals.set(terminalId, terminal);
        return { terminalId };
      },
      async terminalOutput(params: schema.TerminalOutputRequest): Promise<schema.TerminalOutputResponse> {
        const terminal = terminals.get(params.terminalId);
        if (!terminal) {
          throw RequestError.resourceNotFound(params.terminalId);
        }

        return {
          output: terminal.output,
          truncated: terminal.truncated,
          exitStatus: terminal.exitStatus,
        };
      },
      async waitForTerminalExit(params: schema.WaitForTerminalExitRequest): Promise<schema.WaitForTerminalExitResponse> {
        const terminal = terminals.get(params.terminalId);
        if (!terminal) {
          throw RequestError.resourceNotFound(params.terminalId);
        }

        const status = terminal.exitStatus || await terminal.exitPromise;
        return {
          exitCode: status.exitCode,
          signal: status.signal,
        };
      },
      async releaseTerminal(params: schema.ReleaseTerminalRequest): Promise<schema.ReleaseTerminalResponse> {
        const terminal = terminals.get(params.terminalId);
        if (!terminal) {
          return {};
        }

        if (!terminal.exitStatus) {
          try {
            terminal.process.kill();
          } catch {}
        }
        terminals.delete(params.terminalId);
        return {};
      },
      async killTerminal(params: schema.KillTerminalRequest): Promise<schema.KillTerminalResponse> {
        const terminal = terminals.get(params.terminalId);
        if (!terminal) {
          return {};
        }
        if (!terminal.exitStatus) {
          try {
            terminal.process.kill();
          } catch {}
        }
        return {};
      },
    },
  };
}

async function spawnAcpConnection(
  provider: AgentProvider,
  input: AcpRunInput
): Promise<{
  process: ChildProcessWithoutNullStreams;
  connection: ClientSideConnection;
  init: schema.InitializeResponse;
  cleanup: () => Promise<void>;
}> {
  const command = resolveCliCommand(provider);
  const proc = spawn(command, provider.commandArgs || [], {
    cwd: input.cwd,
    env: getProviderEnv(),
    stdio: ["pipe", "pipe", "pipe"],
  }) as ChildProcessWithoutNullStreams;

  let settled = false;
  let stderr = "";
  proc.stderr.on("data", (chunk: Buffer) => {
    const text = chunk.toString();
    stderr += text;
    input.onStderr?.(text);
  });

  const { client, terminals } = buildClientHandlers({
    allowedRoots: normalizeAllowedRoots(input.cwd, input.allowedRoots),
    onSessionUpdate: input.onSessionUpdate,
  });
  const stream = ndJsonStream(
    Writable.toWeb(proc.stdin),
    Readable.toWeb(proc.stdout) as ReadableStream<Uint8Array>,
  );
  const connection = new ClientSideConnection(() => client, stream);

  try {
    const init = await connection.initialize({
      protocolVersion: PROTOCOL_VERSION,
      clientInfo: {
        name: "cabinet",
        title: "Cabinet",
        version: "0.2.4",
      },
      clientCapabilities: {
        auth: { terminal: true },
        fs: {
          readTextFile: true,
          writeTextFile: true,
        },
        terminal: true,
      },
    });

    const cleanup = async () => {
      if (settled) return;
      settled = true;
      for (const terminal of terminals.values()) {
        if (!terminal.exitStatus) {
          try {
            terminal.process.kill();
          } catch {}
        }
      }
      try {
        proc.kill();
      } catch {}
    };

    proc.on("exit", () => {
      settled = true;
    });

    return { process: proc, connection, init, cleanup };
  } catch (error) {
    try {
      proc.kill();
    } catch {}
    const message = error instanceof Error ? error.message : "ACP initialize failed";
    throw new Error(stderr.trim() ? `${message}\n${stderr.trim()}` : message);
  }
}

export async function probeAcpProvider(provider: AgentProvider): Promise<AcpProbeResult> {
  const runtime = await spawnAcpConnection(provider, {
    cwd: process.cwd(),
  });

  try {
    return {
      provider: {
        name: runtime.init.agentInfo?.title || runtime.init.agentInfo?.name,
        version: runtime.init.agentInfo?.version,
      },
      authMethods: runtime.init.authMethods || [],
      capabilities: runtime.init.agentCapabilities,
    };
  } finally {
    await runtime.cleanup();
  }
}

export async function checkAcpProviderHealth(provider: AgentProvider): Promise<ProviderStatus> {
  try {
    const available = await provider.isAvailable();
    if (!available) {
      return {
        available: false,
        authenticated: false,
        error: provider.installMessage,
        runtime: "acp",
        adapterKind: provider.adapterKind,
      };
    }

    const probe = await probeAcpProvider(provider);

    return {
      available: true,
      authenticated: true,
      version: probe.provider.version || probe.provider.name || provider.name,
      runtime: "acp",
      adapterKind: provider.adapterKind,
      authMethods: probe.authMethods.map((method) => ({
        id: method.id,
        name: method.name,
        type: "type" in method ? method.type : "agent",
      })),
      acpCapabilities: {
        loadSession: probe.capabilities?.loadSession === true,
        listSessions: !!probe.capabilities?.sessionCapabilities?.list,
        promptEmbeddedContext: probe.capabilities?.promptCapabilities?.embeddedContext === true,
        promptImage: probe.capabilities?.promptCapabilities?.image === true,
        readTextFile: true,
        writeTextFile: true,
        terminal: true,
      },
    };
  } catch (error) {
    return {
      available: false,
      authenticated: false,
      error: error instanceof Error ? error.message : "Unknown ACP error",
      runtime: "acp",
      adapterKind: provider.adapterKind,
    };
  }
}

export async function startAcpSession(
  provider: AgentProvider,
  input: AcpRunInput
): Promise<AcpRunSession> {
  const runtime = await spawnAcpConnection(provider, input);

  try {
    const session = await runtime.connection.newSession({
      cwd: input.cwd,
      mcpServers: [],
    });

    return {
      providerId: provider.id,
      providerName: provider.name,
      acpSessionId: session.sessionId,
      capabilities: runtime.init.agentCapabilities,
      authMethods: runtime.init.authMethods || [],
      async close() {
        await runtime.cleanup();
      },
      async prompt(text: string) {
        return runtime.connection.prompt({
          sessionId: session.sessionId,
          prompt: [{
            type: "text",
            text,
          }],
        });
      },
      kill() {
        try {
          runtime.process.kill();
        } catch {}
      },
    };
  } catch (error) {
    await runtime.cleanup();
    const message =
      error instanceof RequestError && error.code === -32000
        ? "ACP agent requires authentication before Cabinet can create a session"
        : error instanceof Error
          ? error.message
          : "Failed to create ACP session";
    throw new Error(message);
  }
}

export async function runAcpOneShotPrompt(
  provider: AgentProvider,
  input: {
    cwd: string;
    prompt: string;
    timeoutMs?: number;
  }
): Promise<string> {
  let assistantOutput = "";
  const session = await startAcpSession(provider, {
    cwd: input.cwd,
    onSessionUpdate(params) {
      const update = params.update;
      if (update.sessionUpdate === "agent_message_chunk" && update.content.type === "text") {
        assistantOutput += update.content.text;
      }
    },
  });

  const timeoutHandle = setTimeout(() => {
    session.kill();
  }, input.timeoutMs || 120_000);

  try {
    await session.prompt(input.prompt);
    return assistantOutput.trim();
  } finally {
    clearTimeout(timeoutHandle);
    await session.close();
  }
}

function renderToolContent(content: schema.ToolCallContent): string {
  if (content.type === "diff") {
    return `\n[diff] ${content.path}\n`;
  }
  if (content.type === "terminal") {
    return `\n[terminal] ${content.terminalId}\n`;
  }
  if (content.content.type === "text") {
    return content.content.text;
  }
  return "";
}

export function formatAcpSessionUpdate(params: schema.SessionNotification): string {
  const update = params.update;

  switch (update.sessionUpdate) {
    case "agent_message_chunk":
    case "agent_thought_chunk":
    case "user_message_chunk":
      return update.content.type === "text" ? update.content.text : "";
    case "tool_call":
      return [
        `\n[tool] ${update.title}${update.status ? ` (${update.status})` : ""}\n`,
        ...(update.content || []).map(renderToolContent),
      ].join("");
    case "tool_call_update":
      return [
        `\n[tool] ${update.title || update.toolCallId}${update.status ? ` (${update.status})` : ""}\n`,
        ...((update.content || []).map(renderToolContent)),
      ].join("");
    case "plan":
      return `\n[plan]\n${update.entries.map((entry) => `- [${entry.status}] ${entry.content}`).join("\n")}\n`;
    case "current_mode_update":
      return `\n[mode] ${update.currentModeId}\n`;
    case "session_info_update":
      return update.title ? `\n[session] ${update.title}\n` : "";
    default:
      return "";
  }
}
