import { spawn } from "child_process";
import path from "path";
import { DATA_DIR } from "@/lib/storage/path-utils";
import {
  startOneShotProviderPrompt,
  type ProviderPromptRun,
} from "./provider-runtime";

export interface AgentSession {
  id: string;
  taskId?: string;
  taskTitle: string;
  status: "running" | "completed" | "failed";
  startedAt: string;
  completedAt?: string;
  output: string;
}

interface ManagedAgentSession extends AgentSession {
  liveRun?: ProviderPromptRun;
}

// In-memory session store
const sessions = new Map<string, ManagedAgentSession>();

let startAgentRun = startOneShotProviderPrompt;

function toPublicSession(session: ManagedAgentSession): AgentSession {
  const { liveRun: _liveRun, ...publicSession } = session;
  return publicSession;
}

export function getActiveSessions(): AgentSession[] {
  return Array.from(sessions.values())
    .filter((s) => s.status === "running")
    .map(toPublicSession);
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
    .map(toPublicSession);
}

export function getSession(id: string): AgentSession | undefined {
  const session = sessions.get(id);
  return session ? toPublicSession(session) : undefined;
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
  providerId?: string
): Promise<string> {
  const id = `agent-${Date.now()}`;

  const session: ManagedAgentSession = {
    id,
    taskId,
    taskTitle,
    status: "running",
    startedAt: new Date().toISOString(),
    output: "",
  };

  const cwd = workdir ? path.join(DATA_DIR, workdir) : DATA_DIR;
  const run = startAgentRun({
    providerId,
    prompt,
    cwd,
    timeoutMs: 120_000,
  });
  session.liveRun = run;
  sessions.set(id, session);

  void run.result.then((output) => {
    if (session.status !== "running") return;
    session.output = output;
    session.status = "completed";
    session.completedAt = new Date().toISOString();
    if (taskId) {
      void autoSummarize(session);
    }
  }).catch((error) => {
    if (session.status !== "running") return;
    session.output = error instanceof Error ? error.message : String(error);
    session.status = "failed";
    session.completedAt = new Date().toISOString();
  }).finally(() => {
    if (session.liveRun === run) {
      delete session.liveRun;
    }
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
  if (!session || session.status !== "running" || !session.liveRun) return false;
  session.liveRun.cancel();
  session.status = "failed";
  session.completedAt = new Date().toISOString();
  return true;
}

export function installAgentRunStarterForTests(
  starter: typeof startOneShotProviderPrompt
): void {
  startAgentRun = starter;
}

export function resetAgentManagerForTests(): void {
  sessions.clear();
  startAgentRun = startOneShotProviderPrompt;
}
