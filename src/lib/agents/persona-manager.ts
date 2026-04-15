import path from "path";
import matter from "gray-matter";
import cron from "node-cron";
import { DATA_DIR } from "@/lib/storage/path-utils";
import { discoverCabinetPaths } from "@/lib/cabinets/discovery";
import { normalizeCabinetPath } from "@/lib/cabinets/paths";
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

function resolveAgentsDir(cabinetPath?: string): string {
  if (cabinetPath) return path.join(DATA_DIR, cabinetPath, ".agents");
  return AGENTS_DIR;
}

function resolveMemoryDir(cabinetPath?: string): string {
  return path.join(resolveAgentsDir(cabinetPath), ".memory");
}

function resolveMessagesDir(cabinetPath?: string): string {
  return path.join(resolveAgentsDir(cabinetPath), ".messages");
}

function resolveHistoryDir(cabinetPath?: string): string {
  return path.join(resolveAgentsDir(cabinetPath), ".history");
}

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
  adapterType?: string;
  adapterConfig?: Record<string, unknown>;
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
  cabinetPath?: string;
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

import { computeNextCronRun } from "./cron-compute";

// Active cron jobs for agents
const heartbeatJobs = new Map<string, ReturnType<typeof cron.schedule>>();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeAdapterConfig(value: unknown): Record<string, unknown> | undefined {
  if (!isRecord(value)) return undefined;
  return Object.keys(value).length > 0 ? value : undefined;
}

export async function initAgentsDir(): Promise<void> {
  await ensureDirectory(AGENTS_DIR);
  await ensureDirectory(MEMORY_DIR);
  await ensureDirectory(MESSAGES_DIR);
  await ensureDirectory(HISTORY_DIR);
}

export async function listPersonas(cabinetPath?: string): Promise<AgentPersona[]> {
  const agentsDir = resolveAgentsDir(cabinetPath);
  await ensureDirectory(agentsDir);
  const entries = await listDirectory(agentsDir);
  const personas: AgentPersona[] = [];

  for (const entry of entries) {
    if (entry.isDirectory && !entry.name.startsWith(".")) {
      const personaPath = path.join(agentsDir, entry.name, "persona.md");
      if (await fileExists(personaPath)) {
        const persona = await readPersona(entry.name, cabinetPath);
        if (persona && persona.role) personas.push(persona);
      }
    }
  }

  return personas;
}

export async function listAllPersonas(): Promise<AgentPersona[]> {
  const cabinetPaths = await discoverCabinetPaths();
  const personaGroups = await Promise.all(
    cabinetPaths.map((cabinetPath) => listPersonas(cabinetPath))
  );

  return personaGroups.flat().sort((left, right) => {
    if ((left.workdir || "").localeCompare(right.workdir || "") !== 0) {
      return (left.workdir || "").localeCompare(right.workdir || "");
    }
    return left.name.localeCompare(right.name);
  });
}

export async function readPersona(slug: string, cabinetPath?: string): Promise<AgentPersona | null> {
  const agentsDir = resolveAgentsDir(cabinetPath);
  const filePath = path.join(agentsDir, slug, "persona.md");
  if (!(await fileExists(filePath))) return null;

  const raw = await readFileContent(filePath);
  const { data, content } = matter(raw);

  const persona: AgentPersona = {
    name: (data.name as string) || slug,
    role: (data.role as string) || "",
    provider: resolveEnabledProviderId(
      typeof data.provider === "string" ? data.provider : getDefaultProviderId()
    ),
    adapterType:
      typeof data.adapterType === "string" && data.adapterType.trim()
        ? data.adapterType.trim()
        : undefined,
    adapterConfig: normalizeAdapterConfig(data.adapterConfig),
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
    cabinetPath: normalizeCabinetPath(cabinetPath, true),
    slug,
    body: content.trim(),
  };

  // Load stats — check agent dir first, then legacy shared dir
  const agentStatsPath = path.join(agentsDir, slug, "memory", "stats.json");
  const legacyStatsPath = path.join(resolveMemoryDir(cabinetPath), slug, "stats.json");
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

export async function writePersona(slug: string, persona: Partial<AgentPersona> & { body?: string }, cabinetPath?: string): Promise<void> {
  const agentsDir = resolveAgentsDir(cabinetPath);
  await ensureDirectory(agentsDir);
  // Use directory-based structure: {slug}/persona.md
  const agentDir = path.join(agentsDir, slug);
  await ensureDirectory(agentDir);
  const filePath = path.join(agentDir, "persona.md");

  const existing = await readPersona(slug, cabinetPath);
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
    ...(typeof merged.adapterType === "string" && merged.adapterType.trim()
      ? { adapterType: merged.adapterType.trim() }
      : {}),
    ...(normalizeAdapterConfig(merged.adapterConfig)
      ? { adapterConfig: normalizeAdapterConfig(merged.adapterConfig) }
      : {}),
  };

  const md = matter.stringify(merged.body || "", frontmatter);
  await writeFileContent(filePath, md);
}

export async function deletePersona(slug: string, cabinetPath?: string): Promise<void> {
  const fs = await import("fs/promises");
  const agentDir = path.join(resolveAgentsDir(cabinetPath), slug);
  await fs.rm(agentDir, { recursive: true, force: true });
  unregisterHeartbeat(slug);
}

// --- Memory ---

export async function readMemory(slug: string, file: string, cabinetPath?: string): Promise<string> {
  const memDir = path.join(resolveMemoryDir(cabinetPath), slug);
  await ensureDirectory(memDir);
  const filePath = path.join(memDir, file);
  if (!(await fileExists(filePath))) return "";
  return readFileContent(filePath);
}

export async function writeMemory(slug: string, file: string, content: string, cabinetPath?: string): Promise<void> {
  const memDir = path.join(resolveMemoryDir(cabinetPath), slug);
  await ensureDirectory(memDir);
  await writeFileContent(path.join(memDir, file), content);
}

export async function listMemoryFiles(slug: string, cabinetPath?: string): Promise<string[]> {
  const memDir = path.join(resolveMemoryDir(cabinetPath), slug);
  await ensureDirectory(memDir);
  const entries = await listDirectory(memDir);
  return entries.filter((e) => !e.isDirectory).map((e) => e.name);
}

// --- Messages ---

export async function sendMessage(
  from: string,
  to: string,
  message: string,
  cabinetPath?: string
): Promise<void> {
  const inboxDir = path.join(resolveMessagesDir(cabinetPath), to);
  await ensureDirectory(inboxDir);
  const timestamp = new Date().toISOString();
  const filename = `${timestamp.replace(/[:.]/g, "-")}_from_${from}.md`;
  const content = `---\nfrom: ${from}\nto: ${to}\ntimestamp: ${timestamp}\n---\n\n${message}\n`;
  await writeFileContent(path.join(inboxDir, filename), content);
}

export async function readInbox(slug: string, cabinetPath?: string): Promise<Array<{ from: string; timestamp: string; message: string; filename: string }>> {
  const inboxDir = path.join(resolveMessagesDir(cabinetPath), slug);
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

export async function clearInbox(slug: string, cabinetPath?: string): Promise<void> {
  const inboxDir = path.join(resolveMessagesDir(cabinetPath), slug);
  const fs = await import("fs/promises");
  const entries = await listDirectory(inboxDir).catch(() => []);
  for (const entry of entries) {
    if (entry.name.endsWith(".md")) {
      await fs.unlink(path.join(inboxDir, entry.name)).catch(() => {});
    }
  }
}

// --- Heartbeat History ---

export async function recordHeartbeat(record: HeartbeatRecord & { cabinetPath?: string }): Promise<void> {
  const slug = record.agentSlug;
  const histDir = resolveHistoryDir(record.cabinetPath);

  // Append to history log
  const historyFile = path.join(histDir, `${slug}.jsonl`);
  const line = JSON.stringify(record) + "\n";
  const fs = await import("fs/promises");
  await fs.appendFile(historyFile, line).catch(async () => {
    await ensureDirectory(histDir);
    await fs.writeFile(historyFile, line);
  });

  // Update stats
  const memDir = path.join(resolveMemoryDir(record.cabinetPath), slug);
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

export async function getHeartbeatHistory(slug: string, limit = 20, cabinetPath?: string): Promise<HeartbeatRecord[]> {
  const historyFile = path.join(resolveHistoryDir(cabinetPath), `${slug}.jsonl`);
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
