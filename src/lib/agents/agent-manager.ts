import { spawn, type ChildProcess } from "child_process";
import path from "path";
import { providerRegistry } from "./provider-registry";

const DATA_DIR = path.join(process.cwd(), "data");

export interface AgentSession {
  id: string;
  taskId?: string;
  taskTitle: string;
  status: "running" | "completed" | "failed";
  startedAt: string;
  completedAt?: string;
  output: string;
  process?: ChildProcess;
  provider?: string;
  profile?: string;
}

// In-memory session store
const sessions = new Map<string, AgentSession>();

export function getActiveSessions(): AgentSession[] {
  return Array.from(sessions.values())
    .filter((s) => s.status === "running")
    .map(({ process: _p, ...rest }) => rest);
}

export function getRecentSessions(limit = 10): AgentSession[] {
  return Array.from(sessions.values())
    .filter((s) => s.status !== "running")
    .sort(
      (a, b) =>
        new Date(b.completedAt || b.startedAt).getTime() -
        new Date(a.completedAt || a.startedAt).getTime()
    )
    .slice(0, limit)
    .map(({ process: _p, ...rest }) => rest);
}

export function getSession(id: string): AgentSession | undefined {
  const session = sessions.get(id);
  if (!session) return undefined;
  const { process: _p, ...rest } = session;
  return rest;
}

export function getAgentStats(): {
  active: number;
  completed: number;
  failed: number;
  totalRuns: number;
} {
  let active = 0;
  let completed = 0;
  let failed = 0;

  for (const session of sessions.values()) {
    if (session.status === "running") active++;
    else if (session.status === "completed") completed++;
    else if (session.status === "failed") failed++;
  }

  return { active, completed, failed, totalRuns: sessions.size };
}

export async function runAgent(
  taskTitle: string,
  prompt: string,
  taskId?: string,
  workdir?: string,
  profile?: string
): Promise<string> {
  const id = `agent-${Date.now()}`;

  // Get the default provider (Hermes Agent if available)
  const provider = providerRegistry.getDefault();
  if (!provider) {
    throw new Error("No agent provider available. Please install Hermes Agent or Claude Code.");
  }

  // Check if provider is available
  const isAvailable = await provider.isAvailable();
  if (!isAvailable) {
    throw new Error(`Provider ${provider.name} is not available. Please check installation.`);
  }

  const session: AgentSession = {
    id,
    taskId,
    taskTitle,
    status: "running",
    startedAt: new Date().toISOString(),
    output: "",
    provider: provider.id,
    profile: profile || undefined,
  };

  const cwd = workdir ? path.join(DATA_DIR, workdir) : DATA_DIR;
  
  // Build command based on provider type
  let command: string;
  let args: string[];
  
  if (provider.type === "cli" && provider.command && provider.buildArgs) {
    command = provider.command;
    // @ts-ignore - extended signature with profile
    args = provider.buildArgs(prompt, cwd, profile);
  } else if (provider.type === "api" && provider.runPrompt) {
    // API providers are handled differently
    session.status = "running";
    sessions.set(id, session);
    
    // Async execution for API providers
    provider.runPrompt(prompt, cwd).then((output) => {
      session.output = output;
      session.status = "completed";
      session.completedAt = new Date().toISOString();
      
      if (taskId) {
        autoSummarize(session).catch(() => {});
      }
    }).catch((error) => {
      session.output = String(error);
      session.status = "failed";
      session.completedAt = new Date().toISOString();
    });
    
    return id;
  } else {
    throw new Error(`Provider ${provider.name} is not properly configured.`);
  }

  const proc = spawn(command, args, {
    cwd,
    env: { ...process.env },
    stdio: ["pipe", "pipe", "pipe"],
    shell: true,
  });

  session.process = proc;
  sessions.set(id, session);

  proc.stdout?.on("data", (data: Buffer) => {
    session.output += data.toString();
  });

  proc.stderr?.on("data", (data: Buffer) => {
    session.output += data.toString();
  });

  proc.on("close", (code: number | null) => {
    session.status = code === 0 ? "completed" : "failed";
    session.completedAt = new Date().toISOString();
    delete session.process;

    // Auto-summarize on completion if linked to a task
    if (code === 0 && taskId) {
      autoSummarize(session).catch(() => {});
    }
  });

  proc.on("error", (error) => {
    session.output += `\nError: ${error.message}`;
    session.status = "failed";
    session.completedAt = new Date().toISOString();
    delete session.process;
  });

  return id;
}

async function autoSummarize(session: AgentSession): Promise<void> {
  try {
    // Get recent git diff
    const diffProc = spawn("git", ["diff", "HEAD~1", "--stat"], {
      cwd: DATA_DIR,
      stdio: ["pipe", "pipe", "pipe"],
    });

    let diffOutput = "";
    diffProc.stdout?.on("data", (d: Buffer) => { diffOutput += d.toString(); });
    await new Promise<void>((resolve) => diffProc.on("close", () => resolve()));

    if (diffOutput.trim()) {
      session.output += `\n\n--- Auto-Summary ---\nFiles changed:\n${diffOutput}`;
    }
  } catch {
    // ignore summarize errors
  }
}

export function stopAgent(id: string): boolean {
  const session = sessions.get(id);
  if (!session || !session.process) return false;

  session.process.kill();
  session.status = "failed";
  session.completedAt = new Date().toISOString();
  delete session.process;
  return true;
}

// New function to run agent with specific provider
export async function runAgentWithProvider(
  providerId: string,
  taskTitle: string,
  prompt: string,
  taskId?: string,
  workdir?: string,
  profile?: string
): Promise<string> {
  const provider = providerRegistry.get(providerId);
  if (!provider) {
    throw new Error(`Provider ${providerId} not found.`);
  }

  const isAvailable = await provider.isAvailable();
  if (!isAvailable) {
    throw new Error(`Provider ${provider.name} is not available.`);
  }

  // Temporarily override the default
  const originalDefault = providerRegistry.defaultProvider;
  providerRegistry.defaultProvider = providerId;
  
  try {
    return await runAgent(taskTitle, prompt, taskId, workdir, profile);
  } finally {
    providerRegistry.defaultProvider = originalDefault;
  }
}
