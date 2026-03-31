import path from "path";
import { DATA_DIR } from "@/lib/storage/path-utils";
import {
  readFileContent,
  writeFileContent,
  fileExists,
  ensureDirectory,
} from "@/lib/storage/fs-operations";
import type { GoalMetric } from "@/types/agents";

const MEMORY_DIR = path.join(DATA_DIR, ".agents", ".memory");

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface GoalHistoryEntry {
  period: string;
  actual: number;
  target: number;
}

interface GoalEntry {
  current: number;
  target: number;
  period_start: string;
  period_end: string;
  history: GoalHistoryEntry[];
}

interface GoalState {
  goals: Record<string, GoalEntry>;
}

export type GoalStatus = "on-track" | "behind" | "critical" | "exceeded";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function statePath(slug: string): string {
  return path.join(MEMORY_DIR, slug, "state.json");
}

async function readState(slug: string): Promise<GoalState> {
  const fp = statePath(slug);
  if (!(await fileExists(fp))) {
    return { goals: {} };
  }
  const raw = await readFileContent(fp);
  try {
    const parsed = JSON.parse(raw);
    return { goals: parsed.goals ?? {} };
  } catch {
    return { goals: {} };
  }
}

async function writeState(slug: string, state: GoalState): Promise<void> {
  const dir = path.join(MEMORY_DIR, slug);
  await ensureDirectory(dir);
  await writeFileContent(statePath(slug), JSON.stringify(state, null, 2));
}

// ---------------------------------------------------------------------------
// Get goal state
// ---------------------------------------------------------------------------

export async function getGoalState(
  slug: string
): Promise<Record<string, GoalEntry>> {
  const state = await readState(slug);
  return state.goals;
}

// ---------------------------------------------------------------------------
// Update goal — increment current value
// ---------------------------------------------------------------------------

export async function updateGoal(
  slug: string,
  metric: string,
  increment: number = 1
): Promise<GoalEntry> {
  const state = await readState(slug);

  if (!state.goals[metric]) {
    const now = new Date();
    const weekEnd = new Date(now);
    weekEnd.setDate(weekEnd.getDate() + (7 - weekEnd.getDay()));
    const weekStart = new Date(weekEnd);
    weekStart.setDate(weekStart.getDate() - 6);

    state.goals[metric] = {
      current: 0,
      target: 0,
      period_start: weekStart.toISOString().slice(0, 10),
      period_end: weekEnd.toISOString().slice(0, 10),
      history: [],
    };
  }

  state.goals[metric].current += increment;
  await writeState(slug, state);
  return state.goals[metric];
}

// ---------------------------------------------------------------------------
// Reset goal period — archive current, reset to 0
// ---------------------------------------------------------------------------

export async function resetGoalPeriod(
  slug: string,
  metric: string
): Promise<GoalEntry | null> {
  const state = await readState(slug);
  const goal = state.goals[metric];
  if (!goal) return null;

  // Archive current period
  goal.history.push({
    period: goal.period_start,
    actual: goal.current,
    target: goal.target,
  });

  // Calculate new period dates (advance by 7 days from current period_end)
  const oldEnd = new Date(goal.period_end);
  const newStart = new Date(oldEnd);
  newStart.setDate(newStart.getDate() + 1);
  const newEnd = new Date(newStart);
  newEnd.setDate(newEnd.getDate() + 6);

  goal.current = 0;
  goal.period_start = newStart.toISOString().slice(0, 10);
  goal.period_end = newEnd.toISOString().slice(0, 10);

  await writeState(slug, state);
  return goal;
}

// ---------------------------------------------------------------------------
// Get goal history for trend charts
// ---------------------------------------------------------------------------

export async function getGoalHistory(
  slug: string
): Promise<Record<string, { current: number; target: number; period_start: string; period_end: string; history: GoalHistoryEntry[] }>> {
  const state = await readState(slug);
  return state.goals;
}

// ---------------------------------------------------------------------------
// Compute status for each goal
// ---------------------------------------------------------------------------

export function getGoalStatus(
  slug: string,
  goals: GoalMetric[]
): Record<string, GoalStatus> {
  // This is a sync computation against the provided GoalMetric data
  const result: Record<string, GoalStatus> = {};

  for (const g of goals) {
    const ratio = g.target > 0 ? g.current / g.target : 0;

    if (g.current === 0) {
      result[g.metric] = "on-track"; // No data yet — don't mark as critical
    } else if (ratio >= 1) {
      result[g.metric] = "exceeded";
    } else if (ratio >= 0.4) {
      result[g.metric] = "on-track";
    } else if (ratio >= 0.2) {
      result[g.metric] = "behind";
    } else {
      result[g.metric] = "critical";
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Summary across all goals
// ---------------------------------------------------------------------------

export function getAllGoalsSummary(
  slug: string,
  goals: GoalMetric[]
): { total: number; onTrack: number; behind: number; critical: number } {
  const statuses = getGoalStatus(slug, goals);
  const values = Object.values(statuses);

  return {
    total: values.length,
    onTrack: values.filter((s) => s === "on-track" || s === "exceeded").length,
    behind: values.filter((s) => s === "behind").length,
    critical: values.filter((s) => s === "critical").length,
  };
}
