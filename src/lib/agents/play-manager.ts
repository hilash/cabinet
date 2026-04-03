import path from "path";
import matter from "gray-matter";
import cron from "node-cron";
import { spawn } from "child_process";
import { DATA_DIR } from "@/lib/storage/path-utils";
import {
  readFileContent,
  writeFileContent,
  fileExists,
  ensureDirectory,
  listDirectory,
} from "@/lib/storage/fs-operations";
import type { PlayDefinition } from "@/types/agents";
import { updateGoal } from "./goal-manager";

// Track scheduled play cron tasks
const scheduledPlayJobs = new Map<string, ReturnType<typeof cron.schedule>>();

const PLAYBOOKS_DIR = path.join(DATA_DIR, ".playbooks");
const PLAYS_DIR = path.join(PLAYBOOKS_DIR, "plays");
const HISTORY_DIR = path.join(PLAYBOOKS_DIR, ".history");

export interface PlayExecutionRecord {
  playSlug: string;
  agentSlug?: string;
  timestamp: string;
  duration: number;
  status: "completed" | "failed";
  summary: string;
  trigger: string;
}

function slugFromFilename(filename: string): string {
  return filename.replace(/\.md$/, "");
}

async function initPlayDirs(): Promise<void> {
  await ensureDirectory(PLAYS_DIR);
  await ensureDirectory(HISTORY_DIR);
}

export async function listPlays(): Promise<PlayDefinition[]> {
  await initPlayDirs();
  const entries = await listDirectory(PLAYS_DIR);
  const plays: PlayDefinition[] = [];

  for (const entry of entries) {
    if (!entry.name.endsWith(".md") || entry.isDirectory) continue;
    const play = await readPlay(slugFromFilename(entry.name));
    if (play) plays.push(play);
  }

  return plays;
}

export async function readPlay(slug: string): Promise<PlayDefinition | null> {
  const filePath = path.join(PLAYS_DIR, `${slug}.md`);
  if (!(await fileExists(filePath))) return null;

  const raw = await readFileContent(filePath);
  const { data, content } = matter(raw);

  const play: PlayDefinition = {
    name: (data.name as string) || slug,
    title: (data.title as string) || slug,
    category: (data.category as string) || "general",
    schedule: data.schedule as PlayDefinition["schedule"],
    triggers: (data.triggers as PlayDefinition["triggers"]) || [{ type: "manual" }],
    tools: (data.tools as string[]) || undefined,
    timeout: (data.timeout as number) || 300,
    estimated_duration: (data.estimated_duration as string) || undefined,
    slug,
    body: content.trim(),
  };

  return play;
}

export async function writePlay(
  slug: string,
  play: Partial<PlayDefinition> & { body?: string }
): Promise<void> {
  await initPlayDirs();
  const filePath = path.join(PLAYS_DIR, `${slug}.md`);

  const existing = await readPlay(slug);
  const merged = { ...existing, ...play };

  const frontmatter: Record<string, unknown> = {
    name: merged.name || slug,
    title: merged.title || slug,
    category: merged.category || "general",
    ...(merged.schedule ? { schedule: merged.schedule } : {}),
    triggers: merged.triggers || [{ type: "manual" }],
    ...(merged.tools && merged.tools.length > 0 ? { tools: merged.tools } : {}),
    ...(merged.timeout && merged.timeout !== 300 ? { timeout: merged.timeout } : {}),
    ...(merged.estimated_duration ? { estimated_duration: merged.estimated_duration } : {}),
  };

  const md = matter.stringify(merged.body || "", frontmatter);
  await writeFileContent(filePath, md);
}

export async function deletePlay(slug: string): Promise<void> {
  const filePath = path.join(PLAYS_DIR, `${slug}.md`);
  const fs = await import("fs/promises");
  await fs.unlink(filePath).catch(() => {});
}

export async function executePlay(
  slug: string,
  agentContext?: { agentSlug: string; persona: string }
): Promise<PlayExecutionRecord> {
  const play = await readPlay(slug);
  if (!play) {
    throw new Error(`Play not found: ${slug}`);
  }

  const startTime = Date.now();
  const timestamp = new Date().toISOString();

  // Build the prompt
  const parts: string[] = [];

  if (agentContext) {
    parts.push(`You are agent "${agentContext.agentSlug}".`);
    parts.push(`Persona context:\n${agentContext.persona}`);
    parts.push("---");
  }

  parts.push(`# Play: ${play.title}`);
  parts.push(`Category: ${play.category}`);
  if (play.timeout) {
    parts.push(`Timeout: ${play.timeout}s`);
  }
  parts.push("");
  parts.push(play.body);
  parts.push("");
  parts.push(
    "Execute this play now. Be concise in your output. " +
    "Report what you did and any results found."
  );

  const prompt = parts.join("\n");

  // Spawn Claude CLI
  const result = await new Promise<{ stdout: string; stderr: string; exitCode: number }>(
    (resolve) => {
      const proc = spawn(
        "claude",
        ["--dangerously-skip-permissions", "-p", prompt, "--output-format", "text"],
        {
          cwd: DATA_DIR,
          timeout: (play.timeout || 300) * 1000,
          env: { ...process.env },
        }
      );

      let stdout = "";
      let stderr = "";

      proc.stdout.on("data", (data: Buffer) => {
        stdout += data.toString();
      });

      proc.stderr.on("data", (data: Buffer) => {
        stderr += data.toString();
      });

      proc.on("close", (code) => {
        resolve({ stdout, stderr, exitCode: code ?? 1 });
      });

      proc.on("error", (err) => {
        resolve({ stdout, stderr: err.message, exitCode: 1 });
      });
    }
  );

  const duration = Math.round((Date.now() - startTime) / 1000);
  const status = result.exitCode === 0 ? "completed" : "failed";
  const summary =
    status === "completed"
      ? result.stdout.trim().slice(0, 2000)
      : `Error (exit ${result.exitCode}): ${(result.stderr || result.stdout).trim().slice(0, 1000)}`;

  const record: PlayExecutionRecord = {
    playSlug: slug,
    agentSlug: agentContext?.agentSlug,
    timestamp,
    duration,
    status,
    summary,
    trigger: agentContext ? "agent" : "manual",
  };

  // Parse goal updates from output
  if (agentContext && status === "completed") {
    const goalMatches = result.stdout.matchAll(/GOAL_UPDATE\s+\[([^\]]+)\]:\s*\+?(\d+)/g);
    for (const match of goalMatches) {
      const metric = match[1].trim();
      const increment = parseInt(match[2], 10);
      if (increment > 0) {
        await updateGoal(agentContext.agentSlug, metric, increment);
      }
    }
  }

  // Log to history
  await recordPlayExecution(record);

  // Fire on_complete triggers for downstream plays
  try {
    const { emitPlayCompleted } = await import("./trigger-engine");
    await emitPlayCompleted(record);
  } catch { /* trigger engine errors shouldn't fail play execution */ }

  return record;
}

async function recordPlayExecution(record: PlayExecutionRecord): Promise<void> {
  await initPlayDirs();
  const historyFile = path.join(HISTORY_DIR, `${record.playSlug}.jsonl`);
  const line = JSON.stringify(record) + "\n";
  const fs = await import("fs/promises");
  await fs.appendFile(historyFile, line).catch(async () => {
    await ensureDirectory(HISTORY_DIR);
    await fs.writeFile(historyFile, line);
  });
}

export async function getPlayHistory(
  slug?: string,
  limit = 50
): Promise<PlayExecutionRecord[]> {
  await initPlayDirs();

  if (slug) {
    // History for a specific play
    const historyFile = path.join(HISTORY_DIR, `${slug}.jsonl`);
    if (!(await fileExists(historyFile))) return [];
    return parseHistoryFile(historyFile, limit);
  }

  // All play history — read all .jsonl files
  const entries = await listDirectory(HISTORY_DIR);
  const allRecords: PlayExecutionRecord[] = [];

  for (const entry of entries) {
    if (!entry.name.endsWith(".jsonl") || entry.isDirectory) continue;
    const filePath = path.join(HISTORY_DIR, entry.name);
    const records = await parseHistoryFile(filePath, 0);
    allRecords.push(...records);
  }

  // Sort by timestamp descending, apply limit
  return allRecords
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .slice(0, limit);
}

async function parseHistoryFile(
  filePath: string,
  limit: number
): Promise<PlayExecutionRecord[]> {
  const raw = await readFileContent(filePath);
  const lines = raw.trim().split("\n").filter(Boolean);
  const records = lines
    .map((l) => {
      try {
        return JSON.parse(l) as PlayExecutionRecord;
      } catch {
        return null;
      }
    })
    .filter((r): r is PlayExecutionRecord => r !== null)
    .reverse();

  return limit > 0 ? records.slice(0, limit) : records;
}

// ---------------------------------------------------------------------------
// Cron scheduler for plays with schedule triggers
// ---------------------------------------------------------------------------

function getCronExpression(play: PlayDefinition): string | null {
  // First check schedule triggers for explicit cron
  for (const trigger of play.triggers) {
    if (trigger.type === "schedule") {
      const t = trigger as PlayTrigger & { cron?: string };
      if (t.cron) return t.cron;
    }
  }
  // Fall back to the play-level schedule
  if (play.schedule?.cron) return play.schedule.cron;
  return null;
}

// Re-import PlayTrigger so we can extend it
type PlayTrigger = PlayDefinition["triggers"][number];

function schedulePlay(play: PlayDefinition, cronExpr: string): void {
  unschedulePlay(play.slug);
  if (!cron.validate(cronExpr)) {
    console.warn(`Invalid cron for play ${play.slug}: ${cronExpr}`);
    return;
  }

  const task = cron.schedule(cronExpr, () => {
    console.log(`Cron firing play: ${play.slug}`);
    executePlay(play.slug).catch((err) => {
      console.error(`Scheduled play ${play.slug} failed:`, err);
    });
  });

  scheduledPlayJobs.set(play.slug, task);
  console.log(`  Scheduled play: ${play.slug} (${cronExpr})`);
}

function unschedulePlay(slug: string): void {
  const existing = scheduledPlayJobs.get(slug);
  if (existing) {
    existing.stop();
    scheduledPlayJobs.delete(slug);
  }
}

export async function registerScheduledPlays(): Promise<void> {
  const plays = await listPlays();
  let count = 0;

  for (const play of plays) {
    const hasScheduleTrigger = play.triggers.some((t) => t.type === "schedule");
    if (!hasScheduleTrigger) continue;

    const cronExpr = getCronExpression(play);
    if (cronExpr) {
      schedulePlay(play, cronExpr);
      count++;
    }
  }

  console.log(`Registered ${count} scheduled plays.`);
}

export function getRegisteredScheduledPlays(): string[] {
  return Array.from(scheduledPlayJobs.keys());
}
