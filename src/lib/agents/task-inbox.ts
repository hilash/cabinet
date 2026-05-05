import path from "path";
import {
  fileExists,
  ensureDirectory,
  listDirectory,
  readFileContent,
  writeFileContent,
} from "@/lib/storage/fs-operations";
import { discoverCabinetPaths } from "@/lib/cabinets/discovery";
import { normalizeCabinetPath } from "@/lib/cabinets/paths";
import { resolveCabinetDir } from "@/lib/cabinets/server-paths";

export interface AgentTask {
  id: string;
  fromAgent: string;         // slug of sender
  fromEmoji?: string;
  fromName?: string;
  toAgent: string;           // slug of recipient
  channel?: string;          // Slack channel where it was announced
  title: string;
  description: string;
  kbRefs: string[];          // KB paths referenced
  status: "pending" | "in_progress" | "completed" | "failed";
  priority: number;          // 1=highest, 5=lowest
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  result?: string;           // Completion summary
  cabinetPath?: string;
  linkedConversationId?: string;
  linkedConversationCabinetPath?: string;
  startedAt?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function taskDir(agentSlug: string, cabinetPath?: string): string {
  return path.join(resolveCabinetDir(cabinetPath), ".agents", agentSlug, "tasks");
}

async function initTaskDir(agentSlug: string, cabinetPath?: string): Promise<void> {
  await ensureDirectory(taskDir(agentSlug, cabinetPath));
}

function taskFilePath(agentSlug: string, taskId: string, cabinetPath?: string): string {
  return path.join(taskDir(agentSlug, cabinetPath), `${taskId}.json`);
}

// ---------------------------------------------------------------------------
// Create a task (agent→agent handoff)
// ---------------------------------------------------------------------------

export async function createTask(
  task: Omit<AgentTask, "id" | "createdAt" | "updatedAt" | "status">
): Promise<AgentTask> {
  const cabinetPath = normalizeCabinetPath(task.cabinetPath, true);
  await initTaskDir(task.toAgent, cabinetPath);

  const full: AgentTask = {
    ...task,
    cabinetPath,
    id: crypto.randomUUID(),
    status: "pending",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await writeFileContent(
    taskFilePath(task.toAgent, full.id, cabinetPath),
    JSON.stringify(full, null, 2)
  );

  return full;
}

// ---------------------------------------------------------------------------
// Read tasks for an agent
// ---------------------------------------------------------------------------

export async function getTasksForAgent(
  agentSlug: string,
  statusFilter?: AgentTask["status"],
  cabinetPath?: string
): Promise<AgentTask[]> {
  const dir = taskDir(agentSlug, cabinetPath);
  if (!(await fileExists(dir))) return [];

  const entries = await listDirectory(dir);
  const tasks: AgentTask[] = [];

  for (const entry of entries) {
    if (entry.isDirectory || !entry.name.endsWith(".json")) continue;
    try {
      const raw = await readFileContent(path.join(dir, entry.name));
      const task: AgentTask = JSON.parse(raw);
      if (!statusFilter || task.status === statusFilter) {
        tasks.push(task);
      }
    } catch {
      // skip malformed
    }
  }

  // Sort by priority (1=first), then by creation date (newest first)
  tasks.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return tasks;
}

// ---------------------------------------------------------------------------
// Get a single task
// ---------------------------------------------------------------------------

export async function getTask(
  agentSlug: string,
  taskId: string,
  cabinetPath?: string
): Promise<AgentTask | null> {
  const filePath = taskFilePath(agentSlug, taskId, cabinetPath);
  if (!(await fileExists(filePath))) return null;

  try {
    const raw = await readFileContent(filePath);
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Update task status
// ---------------------------------------------------------------------------

export async function updateTask(
  agentSlug: string,
  taskId: string,
  updates: Partial<
    Pick<
      AgentTask,
      | "status"
      | "result"
      | "linkedConversationId"
      | "linkedConversationCabinetPath"
      | "startedAt"
    >
  >,
  cabinetPath?: string
): Promise<AgentTask | null> {
  const task = await getTask(agentSlug, taskId, cabinetPath);
  if (!task) return null;

  const updated: AgentTask = {
    ...task,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  if (updates.status === "completed" || updates.status === "failed") {
    updated.completedAt = new Date().toISOString();
  } else if (updates.status === "pending" || updates.status === "in_progress") {
    delete updated.completedAt;
  }

  await writeFileContent(
    taskFilePath(agentSlug, taskId, cabinetPath),
    JSON.stringify(updated, null, 2)
  );

  return updated;
}

// ---------------------------------------------------------------------------
// Get all tasks across all agents (for dashboard views)
// ---------------------------------------------------------------------------

export async function getAllTasks(
  statusFilter?: AgentTask["status"],
  cabinetPath?: string
): Promise<AgentTask[]> {
  const allTasks: AgentTask[] = [];
  const cabinetPaths = cabinetPath
    ? [normalizeCabinetPath(cabinetPath, true)]
    : await discoverCabinetPaths();

  for (const resolvedCabinetPath of cabinetPaths) {
    const agentsDir = path.join(resolveCabinetDir(resolvedCabinetPath), ".agents");
    if (!(await fileExists(agentsDir))) continue;

    const entries = await listDirectory(agentsDir);
    for (const entry of entries) {
      if (!entry.isDirectory || entry.name.startsWith(".")) continue;
      const tasks = await getTasksForAgent(
        entry.name,
        statusFilter,
        resolvedCabinetPath
      );
      allTasks.push(...tasks);
    }
  }

  allTasks.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return allTasks;
}

// ---------------------------------------------------------------------------
// Get pending task count for an agent (for badges)
// ---------------------------------------------------------------------------

export async function getPendingTaskCount(
  agentSlug: string,
  cabinetPath?: string
): Promise<number> {
  const tasks = await getTasksForAgent(agentSlug, "pending", cabinetPath);
  return tasks.length;
}
