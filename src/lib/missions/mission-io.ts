import path from "path";
import fs from "fs/promises";
import matter from "gray-matter";
import { DATA_DIR } from "@/lib/storage/path-utils";
import { getDb } from "@/lib/db";

const MISSIONS_DIR = path.join(DATA_DIR, ".missions");

export interface Mission {
  id: string;
  title: string;
  status: "active" | "completed" | "archived";
  progress: number; // 0-100
  outputPath?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  body: string; // goal description markdown
}

export interface MissionTask {
  id: string;
  missionId: string;
  agentSlug?: string;
  title: string;
  description?: string;
  status: "pending" | "assigned" | "in_progress" | "completed" | "failed" | "blocked";
  orderNum: number;
  outputPath?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

// --- Mission File I/O ---

async function ensureMissionsDir(): Promise<void> {
  await fs.mkdir(MISSIONS_DIR, { recursive: true });
}

export async function listMissions(): Promise<Mission[]> {
  await ensureMissionsDir();
  const entries = await fs.readdir(MISSIONS_DIR, { withFileTypes: true });
  const missions: Mission[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const mission = await getMission(entry.name);
    if (mission) missions.push(mission);
  }

  return missions.sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

export async function getMission(id: string): Promise<Mission | null> {
  const missionPath = path.join(MISSIONS_DIR, id, "mission.md");
  try {
    const raw = await fs.readFile(missionPath, "utf-8");
    const { data, content } = matter(raw);

    // Calculate progress from SQLite tasks
    const tasks = getMissionTasks(id);
    const total = tasks.length;
    const completed = tasks.filter((t) => t.status === "completed").length;
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      id,
      title: (data.title as string) || id,
      status: (data.status as Mission["status"]) || "active",
      progress,
      outputPath: data.output_path as string | undefined,
      createdAt: (data.created as string) || new Date().toISOString(),
      updatedAt: (data.modified as string) || new Date().toISOString(),
      completedAt: data.completed_at as string | undefined,
      body: content.trim(),
    };
  } catch {
    return null;
  }
}

export async function createMission(
  title: string,
  body: string,
  outputPath?: string
): Promise<Mission> {
  await ensureMissionsDir();
  const id = `mission-${Date.now()}`;
  const now = new Date().toISOString();

  const missionDir = path.join(MISSIONS_DIR, id);
  await fs.mkdir(missionDir, { recursive: true });
  await fs.mkdir(path.join(missionDir, "tasks"), { recursive: true });

  const frontmatter: Record<string, unknown> = {
    title,
    status: "active",
    created: now,
    modified: now,
  };
  if (outputPath) frontmatter.output_path = outputPath;

  const md = matter.stringify(body, frontmatter);
  await fs.writeFile(path.join(missionDir, "mission.md"), md);

  return {
    id,
    title,
    status: "active",
    progress: 0,
    outputPath,
    createdAt: now,
    updatedAt: now,
    body,
  };
}

export async function updateMission(
  id: string,
  updates: Partial<Pick<Mission, "title" | "status" | "body" | "outputPath">>
): Promise<Mission | null> {
  const mission = await getMission(id);
  if (!mission) return null;

  const now = new Date().toISOString();
  const merged = { ...mission, ...updates, updatedAt: now };
  if (updates.status === "completed") merged.completedAt = now;

  const frontmatter: Record<string, unknown> = {
    title: merged.title,
    status: merged.status,
    created: merged.createdAt,
    modified: now,
  };
  if (merged.outputPath) frontmatter.output_path = merged.outputPath;
  if (merged.completedAt) frontmatter.completed_at = merged.completedAt;

  const md = matter.stringify(merged.body, frontmatter);
  await fs.writeFile(path.join(MISSIONS_DIR, id, "mission.md"), md);

  return merged;
}

export async function deleteMission(id: string): Promise<void> {
  const missionDir = path.join(MISSIONS_DIR, id);
  await fs.rm(missionDir, { recursive: true, force: true });

  // Clean up SQLite tasks
  const db = getDb();
  db.prepare("DELETE FROM mission_tasks WHERE mission_id = ?").run(id);
}

// --- Task SQLite Operations ---

export function getMissionTasks(missionId: string): MissionTask[] {
  const db = getDb();
  const rows = db
    .prepare(
      "SELECT * FROM mission_tasks WHERE mission_id = ? ORDER BY order_num ASC"
    )
    .all(missionId) as Array<{
    id: string;
    mission_id: string;
    agent_slug: string | null;
    title: string;
    description: string | null;
    status: string;
    order_num: number;
    output_path: string | null;
    created_at: string;
    updated_at: string;
    completed_at: string | null;
  }>;

  return rows.map((r) => ({
    id: r.id,
    missionId: r.mission_id,
    agentSlug: r.agent_slug || undefined,
    title: r.title,
    description: r.description || undefined,
    status: r.status as MissionTask["status"],
    orderNum: r.order_num,
    outputPath: r.output_path || undefined,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    completedAt: r.completed_at || undefined,
  }));
}

export function createMissionTask(
  missionId: string,
  title: string,
  options?: {
    agentSlug?: string;
    description?: string;
    orderNum?: number;
    outputPath?: string;
  }
): MissionTask {
  const db = getDb();
  const id = `task-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const now = new Date().toISOString();

  // Get next order number if not provided
  const orderNum =
    options?.orderNum ??
    ((
      db
        .prepare(
          "SELECT COALESCE(MAX(order_num), -1) + 1 as next FROM mission_tasks WHERE mission_id = ?"
        )
        .get(missionId) as { next: number }
    )?.next ?? 0);

  db.prepare(
    `INSERT INTO mission_tasks (id, mission_id, agent_slug, title, description, status, order_num, output_path, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?)`
  ).run(
    id,
    missionId,
    options?.agentSlug || null,
    title,
    options?.description || null,
    orderNum,
    options?.outputPath || null,
    now,
    now
  );

  return {
    id,
    missionId,
    agentSlug: options?.agentSlug,
    title,
    description: options?.description,
    status: "pending",
    orderNum,
    outputPath: options?.outputPath,
    createdAt: now,
    updatedAt: now,
  };
}

export function updateMissionTask(
  taskId: string,
  updates: Partial<Pick<MissionTask, "status" | "agentSlug" | "title" | "description" | "outputPath">>
): MissionTask | null {
  const db = getDb();
  const now = new Date().toISOString();

  const existing = db
    .prepare("SELECT * FROM mission_tasks WHERE id = ?")
    .get(taskId) as { mission_id: string } | undefined;
  if (!existing) return null;

  const sets: string[] = ["updated_at = ?"];
  const values: (string | number | null)[] = [now];

  if (updates.status !== undefined) {
    sets.push("status = ?");
    values.push(updates.status);
    if (updates.status === "completed") {
      sets.push("completed_at = ?");
      values.push(now);
    }
  }
  if (updates.agentSlug !== undefined) {
    sets.push("agent_slug = ?");
    values.push(updates.agentSlug || null);
  }
  if (updates.title !== undefined) {
    sets.push("title = ?");
    values.push(updates.title);
  }
  if (updates.description !== undefined) {
    sets.push("description = ?");
    values.push(updates.description || null);
  }
  if (updates.outputPath !== undefined) {
    sets.push("output_path = ?");
    values.push(updates.outputPath || null);
  }

  values.push(taskId);
  db.prepare(`UPDATE mission_tasks SET ${sets.join(", ")} WHERE id = ?`).run(
    ...values
  );

  // Return updated task
  const tasks = getMissionTasks(existing.mission_id);
  return tasks.find((t) => t.id === taskId) || null;
}

export function deleteMissionTask(taskId: string): void {
  const db = getDb();
  db.prepare("DELETE FROM mission_tasks WHERE id = ?").run(taskId);
}
