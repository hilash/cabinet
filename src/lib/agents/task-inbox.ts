import path from "path";
import fs from "fs/promises";
import { DATA_DIR } from "@/lib/storage/path-utils";
import { fileExists, ensureDirectory } from "@/lib/storage/fs-operations";

const AGENTS_DIR = path.join(DATA_DIR, ".agents");

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
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function taskDir(agentSlug: string): string {
  return path.join(AGENTS_DIR, agentSlug, "tasks");
}

async function initTaskDir(agentSlug: string): Promise<void> {
  await ensureDirectory(taskDir(agentSlug));
}

function taskFilePath(agentSlug: string, taskId: string): string {
  return path.join(taskDir(agentSlug), `${taskId}.json`);
}

// ---------------------------------------------------------------------------
// Create a task (agent→agent handoff)
// ---------------------------------------------------------------------------

export async function createTask(
  task: Omit<AgentTask, "id" | "createdAt" | "updatedAt" | "status">
): Promise<AgentTask> {
  await initTaskDir(task.toAgent);

  const full: AgentTask = {
    ...task,
    id: crypto.randomUUID(),
    status: "pending",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await fs.writeFile(
    taskFilePath(task.toAgent, full.id),
    JSON.stringify(full, null, 2),
    "utf-8"
  );

  return full;
}

// ---------------------------------------------------------------------------
// Read tasks for an agent
// ---------------------------------------------------------------------------

export async function getTasksForAgent(
  agentSlug: string,
  statusFilter?: AgentTask["status"]
): Promise<AgentTask[]> {
  const dir = taskDir(agentSlug);
  if (!(await fileExists(dir))) return [];

  const entries = await fs.readdir(dir, { withFileTypes: true });
  const tasks: AgentTask[] = [];

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".json")) continue;
    try {
      const raw = await fs.readFile(path.join(dir, entry.name), "utf-8");
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
  taskId: string
): Promise<AgentTask | null> {
  const filePath = taskFilePath(agentSlug, taskId);
  if (!(await fileExists(filePath))) return null;

  try {
    const raw = await fs.readFile(filePath, "utf-8");
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
  updates: Partial<Pick<AgentTask, "status" | "result">>
): Promise<AgentTask | null> {
  const task = await getTask(agentSlug, taskId);
  if (!task) return null;

  const updated: AgentTask = {
    ...task,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  if (updates.status === "completed" || updates.status === "failed") {
    updated.completedAt = new Date().toISOString();
  }

  await fs.writeFile(
    taskFilePath(agentSlug, taskId),
    JSON.stringify(updated, null, 2),
    "utf-8"
  );

  return updated;
}

// ---------------------------------------------------------------------------
// Get all tasks across all agents (for dashboard views)
// ---------------------------------------------------------------------------

export async function getAllTasks(
  statusFilter?: AgentTask["status"]
): Promise<AgentTask[]> {
  if (!(await fileExists(AGENTS_DIR))) return [];

  const entries = await fs.readdir(AGENTS_DIR, { withFileTypes: true });
  const allTasks: AgentTask[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith(".")) continue;
    const tasks = await getTasksForAgent(entry.name, statusFilter);
    allTasks.push(...tasks);
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

export async function getPendingTaskCount(agentSlug: string): Promise<number> {
  const tasks = await getTasksForAgent(agentSlug, "pending");
  return tasks.length;
}
