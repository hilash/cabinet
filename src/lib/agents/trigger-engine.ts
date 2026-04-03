/**
 * Trigger Engine — fires play executions in response to events.
 *
 * Supports:
 * - on_complete: when a play finishes, trigger dependent plays
 * - goal_behind: when a goal falls behind pace, trigger corrective plays
 * - webhook: external HTTP POST triggers a specific play
 * - file_changed: when a KB file changes, trigger plays watching that path
 *
 * The engine is a singleton that listens for events and evaluates trigger rules.
 */

import { listPlays, executePlay, type PlayExecutionRecord } from "./play-manager";
import { getGoalState } from "./goal-manager";
import { readPersona, listPersonas } from "./persona-manager";
import { postMessage } from "./slack-manager";
import type { PlayTrigger, PlayDefinition } from "@/types/agents";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TriggerEvent {
  type: PlayTrigger["type"];
  payload: Record<string, unknown>;
  timestamp: string;
}

interface TriggerLogEntry {
  event: TriggerEvent;
  playSlug: string;
  agentSlug?: string;
  fired: boolean;
  reason: string;
  timestamp: string;
}

// ---------------------------------------------------------------------------
// In-memory state
// ---------------------------------------------------------------------------

const triggerLog: TriggerLogEntry[] = [];
const MAX_LOG = 200;

// Debounce map: prevent the same play from firing multiple times in quick succession
const lastFired: Map<string, number> = new Map();
const DEBOUNCE_MS = 30_000; // 30 second debounce per play

// Track which plays are currently running to prevent duplicate triggers
const runningPlays: Set<string> = new Set();

// ---------------------------------------------------------------------------
// Core: evaluate triggers and fire plays
// ---------------------------------------------------------------------------

async function evaluateTriggers(event: TriggerEvent): Promise<TriggerLogEntry[]> {
  const plays = await listPlays();
  const entries: TriggerLogEntry[] = [];

  for (const play of plays) {
    const matchingTriggers = play.triggers.filter((t) => t.type === event.type);
    if (matchingTriggers.length === 0) continue;

    for (const trigger of matchingTriggers) {
      const shouldFire = shouldTriggerFire(trigger, event, play);
      if (!shouldFire.fire) {
        entries.push(logEntry(event, play.slug, undefined, false, shouldFire.reason));
        continue;
      }

      // Debounce check
      const key = `${play.slug}:${event.type}`;
      const lastTime = lastFired.get(key) || 0;
      if (Date.now() - lastTime < DEBOUNCE_MS) {
        entries.push(logEntry(event, play.slug, undefined, false, "debounced"));
        continue;
      }

      // Check if already running
      if (runningPlays.has(play.slug)) {
        entries.push(logEntry(event, play.slug, undefined, false, "already running"));
        continue;
      }

      // Find an agent that has this play assigned
      const agentSlug = await findAgentForPlay(play.slug);

      // Fire the play
      lastFired.set(key, Date.now());
      entries.push(logEntry(event, play.slug, agentSlug || undefined, true, "triggered"));

      // Execute async (don't block the trigger evaluation)
      firePlay(play.slug, agentSlug, event).catch(() => {});
    }
  }

  return entries;
}

function shouldTriggerFire(
  trigger: PlayTrigger,
  event: TriggerEvent,
  _play: PlayDefinition
): { fire: boolean; reason: string } {
  switch (trigger.type) {
    case "on_complete": {
      const completedPlay = event.payload.playSlug as string;
      if (trigger.play && trigger.play !== completedPlay) {
        return { fire: false, reason: `on_complete: waiting for ${trigger.play}, got ${completedPlay}` };
      }
      const status = event.payload.status as string;
      if (status !== "completed") {
        return { fire: false, reason: `on_complete: play ${completedPlay} failed` };
      }
      return { fire: true, reason: "on_complete matched" };
    }

    case "goal_behind": {
      return { fire: true, reason: "goal_behind event" };
    }

    case "webhook": {
      return { fire: true, reason: "webhook received" };
    }

    case "file_changed": {
      if (trigger.path) {
        const changedPath = event.payload.path as string;
        if (!changedPath?.includes(trigger.path)) {
          return { fire: false, reason: `file_changed: path ${changedPath} doesn't match ${trigger.path}` };
        }
      }
      return { fire: true, reason: "file_changed matched" };
    }

    case "agent_message": {
      return { fire: true, reason: "agent_message received" };
    }

    case "schedule": {
      return { fire: true, reason: "schedule triggered" };
    }

    default:
      return { fire: false, reason: `unhandled trigger type: ${trigger.type}` };
  }
}

async function findAgentForPlay(playSlug: string): Promise<string | null> {
  const personas = await listPersonas();
  for (const persona of personas) {
    if (persona.active && persona.plays?.includes(playSlug)) {
      return persona.slug;
    }
  }
  return null;
}

async function firePlay(
  playSlug: string,
  agentSlug: string | null,
  event: TriggerEvent
): Promise<void> {
  runningPlays.add(playSlug);
  try {
    const agentContext = agentSlug
      ? await buildAgentContext(agentSlug)
      : undefined;

    const record = await executePlay(playSlug, agentContext);

    // Post trigger info to Agent Slack
    if (agentSlug) {
      const persona = await readPersona(agentSlug);
      const channel = persona?.channels?.[0] || "general";
      await postMessage({
        channel,
        agent: agentSlug,
        emoji: persona?.emoji || "⚡",
        displayName: persona?.name || agentSlug,
        type: "message",
        content: `Auto-triggered **${playSlug}** (${event.type}). ${record.status === "completed" ? "Completed" : "Failed"} in ${record.duration}s.`,
        mentions: [],
        kbRefs: [],
      });
    }

    // Fire on_complete triggers for downstream plays
    await emitPlayCompleted(record);
  } finally {
    runningPlays.delete(playSlug);
  }
}

async function buildAgentContext(
  agentSlug: string
): Promise<{ agentSlug: string; persona: string } | undefined> {
  const persona = await readPersona(agentSlug);
  if (!persona) return undefined;
  return { agentSlug, persona: persona.body };
}

function logEntry(
  event: TriggerEvent,
  playSlug: string,
  agentSlug: string | undefined,
  fired: boolean,
  reason: string
): TriggerLogEntry {
  const entry: TriggerLogEntry = {
    event,
    playSlug,
    agentSlug,
    fired,
    reason,
    timestamp: new Date().toISOString(),
  };
  triggerLog.unshift(entry);
  if (triggerLog.length > MAX_LOG) triggerLog.length = MAX_LOG;
  return entry;
}

// ---------------------------------------------------------------------------
// Public API: emit events
// ---------------------------------------------------------------------------

/**
 * Call after a play completes to fire on_complete triggers.
 */
export async function emitPlayCompleted(record: PlayExecutionRecord): Promise<void> {
  const event: TriggerEvent = {
    type: "on_complete",
    payload: {
      playSlug: record.playSlug,
      agentSlug: record.agentSlug,
      status: record.status,
      duration: record.duration,
    },
    timestamp: new Date().toISOString(),
  };
  await evaluateTriggers(event);
}

/**
 * Call when an external webhook is received.
 */
export async function emitWebhook(
  playSlug?: string,
  payload?: Record<string, unknown>
): Promise<TriggerLogEntry[]> {
  const event: TriggerEvent = {
    type: "webhook",
    payload: { playSlug, ...payload },
    timestamp: new Date().toISOString(),
  };

  // If a specific play is targeted, fire it directly
  if (playSlug) {
    const agentSlug = await findAgentForPlay(playSlug);
    const entry = logEntry(event, playSlug, agentSlug || undefined, true, "webhook direct");
    firePlay(playSlug, agentSlug, event).catch(() => {});
    return [entry];
  }

  return evaluateTriggers(event);
}

/**
 * Call when a KB file changes to fire file_changed triggers.
 */
export async function emitFileChanged(filePath: string): Promise<void> {
  const event: TriggerEvent = {
    type: "file_changed",
    payload: { path: filePath },
    timestamp: new Date().toISOString(),
  };
  await evaluateTriggers(event);
}

/**
 * Call when an agent sends a message to fire agent_message triggers.
 */
export async function emitAgentMessage(
  fromAgent: string,
  toAgent: string,
  message: string
): Promise<void> {
  const event: TriggerEvent = {
    type: "agent_message",
    payload: { fromAgent, toAgent, message },
    timestamp: new Date().toISOString(),
  };
  await evaluateTriggers(event);
}

/**
 * Check all agents for goals behind pace and fire goal_behind triggers.
 * Call periodically (e.g., every heartbeat cycle or every 15 minutes).
 */
export async function checkGoalBehindTriggers(): Promise<void> {
  const allPersonas = await listPersonas();

  for (const persona of allPersonas) {
    const slug = persona.slug;
    if (!persona.active || !persona.goals?.length) continue;

    const goalState = await getGoalState(slug);

    for (const goal of persona.goals) {
      const state = goalState[goal.metric];
      if (!state) continue;

      const current = state.current ?? 0;
      const target = goal.target;
      if (target <= 0) continue;

      // Calculate expected progress based on time elapsed in period
      const periodStart = new Date(state.period_start).getTime();
      const periodEnd = new Date(state.period_end).getTime();
      const now = Date.now();
      const periodDuration = periodEnd - periodStart;
      if (periodDuration <= 0) continue;

      const elapsed = Math.min(now - periodStart, periodDuration);
      const expectedProgress = (elapsed / periodDuration) * target;
      const behindBy = expectedProgress - current;

      // Fire if behind by more than 20% of target
      if (behindBy > target * 0.2) {
        const event: TriggerEvent = {
          type: "goal_behind",
          payload: {
            agentSlug: slug,
            metric: goal.metric,
            current,
            target,
            expectedProgress: Math.round(expectedProgress),
            behindBy: Math.round(behindBy),
          },
          timestamp: new Date().toISOString(),
        };
        await evaluateTriggers(event);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Public API: query trigger log
// ---------------------------------------------------------------------------

export function getTriggerLog(limit = 50): TriggerLogEntry[] {
  return triggerLog.slice(0, limit);
}

export function getRunningTriggers(): string[] {
  return Array.from(runningPlays);
}
