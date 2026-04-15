import path from "path";
import matter from "gray-matter";
import cron from "node-cron";
import { DATA_DIR } from "@/lib/storage/path-utils";
import {
  readFileContent,
  writeFileContent,
  fileExists,
  ensureDirectory,
  listDirectory,
} from "@/lib/storage/fs-operations";
import { runHeartbeat } from "./heartbeat";
import { getGoalState } from "./goal-manager";
import type { GoalMetric, AgentType } from "@/types/agents";
import { getDefaultProviderId } from "./provider-runtime";
import { resolveEnabledProviderId } from "./provider-settings";

const AGENTS_DIR = path.join(DATA_DIR, ".agents");
const MEMORY_DIR = path.join(AGENTS_DIR, ".memory");
const MESSAGES_DIR = path.join(AGENTS_DIR, ".messages");
const HISTORY_DIR = path.join(AGENTS_DIR, ".history");

// Track currently running heartbeats
const runningHeartbeats = new Set<string>();

export function markHeartbeatRunning(slug: string): void {
  runningHeartbeats.add(slug);
}

export function markHeartbeatComplete(slug: string): void {
  runningHeartbeats.delete(slug);
}

export function getRunningHeartbeats(): string[] {
  return Array.from(runningHeartbeats);
}

export interface AgentPersona {
  name: string;
  role: string;
  provider: string;
  heartbeat: string; // cron expression
  budget: number; // max heartbeats per month
  active: boolean;
  workdir: string;
  focus: string[];
  tags: string[];
  // New fields (all optional for backward compat)
  emoji: string;
  department: string;
  type: AgentType;
  goals: GoalMetric[];
  channels: string[];     // Agent Slack channels
  workspace: string;      // relative path under data/.agents/{slug}/
  setupComplete: boolean; // false until agent settings are saved for the first time
  // Multica integration
  multica_runtime_id?: string; // Multica runtime ID — enables task polling when set
  // Computed
  slug: string;
  body: string; // markdown body (persona instructions)
  heartbeatsUsed?: number;
  lastHeartbeat?: string;
  nextHeartbeat?: string;
}

export interface HeartbeatRecord {
  agentSlug: string;
  timestamp: string;
  duration: number;
  status: "completed" | "failed";
  summary: string;
}

/**
 * Compute the next run time from a cron expression after a given date.
 * Simple approach: iterate minute-by-minute from `after` until we find a match.
 * Handles standard 5-field cron (minute, hour, dom, month, dow).
 */
function computeNextCronRun(cronExpr: string, after: Date): Date | null {
  const parts = cronExpr.trim().split(/\s+/);
  if (parts.length < 5) return null;

  const parseField = (field: string, max: number): number[] | null => {
    if (field === "*") return null; // any
    const values: number[] = [];
    for (const part of field.split(",")) {
      const stepMatch = part.match(/^(\*|\d+(?:-\d+)?)\/(\d+)$/);
      if (stepMatch) {
        const step = parseInt(stepMatch[2]);
        const rangeMatch = stepMatch[1].match(/^(\d+)-(\d+)$/);
        const start = stepMatch[1] === "*" ? 0 : rangeMatch ? parseInt(rangeMatch[1]) : parseInt(stepMatch[1]);
        const end = rangeMatch ? parseInt(rangeMatch[2]) : max;
        for (let i = start; i <= end; i += step) values.push(i);
      } else {
        const rangeMatch = part.match(/^(\d+)-(\d+)$/);
        if (rangeMatch) {
          for (let i = parseInt(rangeMatch[1]); i <= parseInt(rangeMatch[2]); i++) values.push(i);
        } else {
          values.push(parseInt(part));
        }
      }
    }
    return values;
  };

  const minutes = parseField(parts[0], 59);
  const hours = parseField(parts[1], 23);
  const doms = parseField(parts[2], 31);
  const months = parseField(parts[3], 12);
  const dows = parseField(parts[4], 6);

  const matches = (d: Date) => {
    if (minutes && !minutes.includes(d.getMinutes())) return false;
    if (hours && !hours.includes(d.getHours())) return false;
    if (doms && !doms.includes(d.getDate())) return false;
    if (months && !months.includes(d.getMonth() + 1)) return false;
    if (dows && !dows.includes(d.getDay())) return false;
    return true;
  };

  // Start from next minute after `after`
  const candidate = new Date(after);
  candidate.setSeconds(0, 0);
  candidate.setMinutes(candidate.getMinutes() + 1);

  // Search up to 7 days ahead
  const limit = after.getTime() + 7 * 24 * 60 * 60 * 1000;
  while (candidate.getTime() < limit) {
    if (matches(candidate)) return candidate;
    candidate.setMinutes(candidate.getMinutes() + 1);
  }
  return null;
}

// Active cron jobs for agents
const heartbeatJobs = new Map<string, ReturnType<typeof cron.schedule>>();

function slugFromFilename(filename: string): string {
  return filename.replace(/\.md$/, "");
}

export async function initAgentsDir(): Promise<void> {
  await ensureDirectory(AGENTS_DIR);
  await ensureDirectory(MEMORY_DIR);
  await ensureDirectory(MESSAGES_DIR);
  await ensureDirectory(HISTORY_DIR);
}

export async function listPersonas(): Promise<AgentPersona[]> {
  await initAgentsDir();
  const entries = await listDirectory(AGENTS_DIR);
  const personas: AgentPersona[] = [];

  for (const entry of entries) {
    // Directory-based agents: {slug}/persona.md (PRD format)
    if (entry.isDirectory && !entry.name.startsWith(".")) {
      const personaPath = path.join(AGENTS_DIR, entry.name, "persona.md");
      if (await fileExists(personaPath)) {
        const persona = await readPersona(entry.name);
        if (persona && persona.role) personas.push(persona);
      }
      continue;
    }
    // Legacy flat-file agents: {slug}.md
    if (!entry.name.endsWith(".md") || entry.isDirectory) continue;
    const persona = await readPersona(slugFromFilename(entry.name));
    if (persona && persona.role) personas.push(persona);
  }

  return personas;
}

export async function readPersona(slug: string): Promise<AgentPersona | null> {
  // Try directory-based first: {slug}/persona.md
  let filePath = path.join(AGENTS_DIR, slug, "persona.md");
  if (!(await fileExists(filePath))) {
    // Fall back to legacy flat file: {slug}.md
    filePath = path.join(AGENTS_DIR, `${slug}.md`);
    if (!(await fileExists(filePath))) return null;
  }

  const raw = await readFileContent(filePath);
  const { data, content } = matter(raw);

  const persona: AgentPersona = {
    name: (data.name as string) || slug,
    role: (data.role as string) || "",
    provider: resolveEnabledProviderId(
      typeof data.provider === "string" ? data.provider : getDefaultProviderId()
    ),
    heartbeat: (data.heartbeat as string) || "0 8 * * *",
    budget: (data.budget as number) || 100,
    active: data.active !== false,
    workdir: (data.workdir as string) || "/data",
    focus: (data.focus as string[]) || [],
    tags: (data.tags as string[]) || [],
    // New fields with backward-compatible defaults
    emoji: (data.emoji as string) || "🤖",
    department: (data.department as string) || "general",
    type: (data.type as AgentPersona["type"]) || "specialist",
    goals: (data.goals as AgentPersona["goals"]) || [],
    channels: (data.channels as string[]) || ["general"],
    workspace: (data.workspace as string) || `workspace`,
    setupComplete: data.setupComplete === true,
    multica_runtime_id: typeof data.multica_runtime_id === "string" ? data.multica_runtime_id.trim() || undefined : undefined,
    slug,
    body: content.trim(),
  };

  // Load stats — check agent dir first, then legacy shared dir
  const agentStatsPath = path.join(AGENTS_DIR, slug, "memory", "stats.json");
  const legacyStatsPath = path.join(MEMORY_DIR, slug, "stats.json");
  const statsPath = (await fileExists(agentStatsPath)) ? agentStatsPath : legacyStatsPath;
  if (await fileExists(statsPath)) {
    try {
      const stats = JSON.parse(await readFileContent(statsPath));
      persona.heartbeatsUsed = stats.heartbeatsUsed || 0;
      persona.lastHeartbeat = stats.lastHeartbeat;
    } catch { /* ignore */ }
  }

  // Compute nextHeartbeat from cron expression + lastHeartbeat
  if (persona.active && persona.heartbeat && persona.lastHeartbeat) {
    try {
      const nextRun = computeNextCronRun(persona.heartbeat, new Date(persona.lastHeartbeat));
      if (nextRun) persona.nextHeartbeat = nextRun.toISOString();
    } catch { /* ignore */ }
  }

  // Merge goal state from disk (overwrites static frontmatter values)
  if (persona.goals.length > 0) {
    try {
      const goalState = await getGoalState(slug);
      persona.goals = persona.goals.map((g) => {
        const state = goalState[g.metric];
        return state ? { ...g, current: state.current } : g;
      });
    } catch { /* ignore */ }
  }

  return persona;
}

export async function writePersona(slug: string, persona: Partial<AgentPersona> & { body?: string }): Promise<void> {
  await initAgentsDir();
  // Use directory-based structure: {slug}/persona.md
  const agentDir = path.join(AGENTS_DIR, slug);
  await ensureDirectory(agentDir);
  const filePath = path.join(agentDir, "persona.md");

  const existing = await readPersona(slug);
  const merged = { ...existing, ...persona };

  const frontmatter: Record<string, unknown> = {
    name: merged.name,
    role: merged.role,
    provider: resolveEnabledProviderId(merged.provider),
    heartbeat: merged.heartbeat,
    budget: merged.budget,
    active: merged.active,
    workdir: merged.workdir,
    focus: merged.focus,
    tags: merged.tags,
    // Always write these fields for consistency
    emoji: merged.emoji || "🤖",
    department: merged.department || "general",
    type: merged.type || "specialist",
    workspace: merged.workspace || "workspace",
    setupComplete: merged.setupComplete === true,
    ...(merged.goals && merged.goals.length > 0 ? { goals: merged.goals } : {}),
    ...(merged.channels && merged.channels.length > 0 ? { channels: merged.channels } : {}),
  };

  const md = matter.stringify(merged.body || "", frontmatter);
  await writeFileContent(filePath, md);
}

export async function deletePersona(slug: string): Promise<void> {
  const fs = await import("fs/promises");
  // Try directory-based first
  const agentDir = path.join(AGENTS_DIR, slug);
  try {
    await fs.rm(agentDir, { recursive: true, force: true });
  } catch {
    // Fall back to legacy flat file
    const filePath = path.join(AGENTS_DIR, `${slug}.md`);
    await fs.unlink(filePath).catch(() => {});
  }
  unregisterHeartbeat(slug);
}

// --- Memory ---

export async function readMemory(slug: string, file: string): Promise<string> {
  const memDir = path.join(MEMORY_DIR, slug);
  await ensureDirectory(memDir);
  const filePath = path.join(memDir, file);
  if (!(await fileExists(filePath))) return "";
  return readFileContent(filePath);
}

export async function writeMemory(slug: string, file: string, content: string): Promise<void> {
  const memDir = path.join(MEMORY_DIR, slug);
  await ensureDirectory(memDir);
  await writeFileContent(path.join(memDir, file), content);
}

export async function listMemoryFiles(slug: string): Promise<string[]> {
  const memDir = path.join(MEMORY_DIR, slug);
  await ensureDirectory(memDir);
  const entries = await listDirectory(memDir);
  return entries.filter((e) => !e.isDirectory).map((e) => e.name);
}

// --- Messages ---

export async function sendMessage(from: string, to: string, message: string): Promise<void> {
  const inboxDir = path.join(MESSAGES_DIR, to);
  await ensureDirectory(inboxDir);
  const timestamp = new Date().toISOString();
  const filename = `${timestamp.replace(/[:.]/g, "-")}_from_${from}.md`;
  const content = `---\nfrom: ${from}\nto: ${to}\ntimestamp: ${timestamp}\n---\n\n${message}\n`;
  await writeFileContent(path.join(inboxDir, filename), content);
}

export async function readInbox(slug: string): Promise<Array<{ from: string; timestamp: string; message: string; filename: string }>> {
  const inboxDir = path.join(MESSAGES_DIR, slug);
  await ensureDirectory(inboxDir);
  const entries = await listDirectory(inboxDir);
  const messages: Array<{ from: string; timestamp: string; message: string; filename: string }> = [];

  for (const entry of entries) {
    if (!entry.name.endsWith(".md")) continue;
    const raw = await readFileContent(path.join(inboxDir, entry.name));
    const { data, content } = matter(raw);
    messages.push({
      from: (data.from as string) || "unknown",
      timestamp: (data.timestamp as string) || "",
      message: content.trim(),
      filename: entry.name,
    });
  }

  return messages.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

export async function clearInbox(slug: string): Promise<void> {
  const inboxDir = path.join(MESSAGES_DIR, slug);
  const fs = await import("fs/promises");
  const entries = await listDirectory(inboxDir).catch(() => []);
  for (const entry of entries) {
    if (entry.name.endsWith(".md")) {
      await fs.unlink(path.join(inboxDir, entry.name)).catch(() => {});
    }
  }
}

// --- Heartbeat History ---

export async function recordHeartbeat(record: HeartbeatRecord): Promise<void> {
  const slug = record.agentSlug;

  // Append to history log
  const historyFile = path.join(HISTORY_DIR, `${slug}.jsonl`);
  const line = JSON.stringify(record) + "\n";
  const fs = await import("fs/promises");
  await fs.appendFile(historyFile, line).catch(async () => {
    await ensureDirectory(HISTORY_DIR);
    await fs.writeFile(historyFile, line);
  });

  // Update stats
  const memDir = path.join(MEMORY_DIR, slug);
  await ensureDirectory(memDir);
  const statsPath = path.join(memDir, "stats.json");
  let stats = { heartbeatsUsed: 0, lastHeartbeat: "" };
  if (await fileExists(statsPath)) {
    try { stats = JSON.parse(await readFileContent(statsPath)); } catch { /* ignore */ }
  }
  stats.heartbeatsUsed++;
  stats.lastHeartbeat = record.timestamp;
  await writeFileContent(statsPath, JSON.stringify(stats, null, 2));
}

export async function getHeartbeatHistory(slug: string, limit = 20): Promise<HeartbeatRecord[]> {
  const historyFile = path.join(HISTORY_DIR, `${slug}.jsonl`);
  if (!(await fileExists(historyFile))) return [];

  const raw = await readFileContent(historyFile);
  const lines = raw.trim().split("\n").filter(Boolean);
  return lines
    .map((l) => { try { return JSON.parse(l); } catch { return null; } })
    .filter(Boolean)
    .reverse()
    .slice(0, limit);
}

// --- Heartbeat Scheduler ---

export function registerHeartbeat(slug: string, cronExpr: string): void {
  unregisterHeartbeat(slug);
  if (!cron.validate(cronExpr)) return;

  const job = cron.schedule(cronExpr, () => {
    runHeartbeat(slug).catch((err) => {
      console.error(`Heartbeat failed for ${slug}:`, err);
    });
  });

  heartbeatJobs.set(slug, job);
}

export function unregisterHeartbeat(slug: string): void {
  const existing = heartbeatJobs.get(slug);
  if (existing) {
    existing.stop();
    heartbeatJobs.delete(slug);
  }
}

export async function registerAllHeartbeats(): Promise<void> {
  const personas = await listPersonas();
  for (const persona of personas) {
    if (persona.active && persona.heartbeatsUsed !== undefined && persona.heartbeatsUsed < persona.budget) {
      registerHeartbeat(persona.slug, persona.heartbeat);
    }
  }
}

export function getRegisteredHeartbeats(): string[] {
  return Array.from(heartbeatJobs.keys());
}
