import { NextResponse } from "next/server";
import { listAllPersonas } from "@/lib/agents/persona-manager";
import { getGoalState } from "@/lib/agents/goal-manager";
import { getMessages } from "@/lib/agents/slack-manager";
import { getRespondingAgents } from "@/app/api/agents/slack/route";
import fs from "fs/promises";
import path from "path";
import { DATA_DIR } from "@/lib/storage/path-utils";
import { getRunningConversationCounts, drainConversationNotifications } from "@/lib/agents/conversation-store";

async function getDataDirVersion(): Promise<string> {
  try {
    const stat = await fs.stat(DATA_DIR);
    const entries = await fs.readdir(DATA_DIR, { recursive: false });

    // Also watch .agents dir so agent add/remove triggers a refresh
    let agentsSig = "";
    try {
      const agentsDir = path.join(DATA_DIR, ".agents");
      const agentStat = await fs.stat(agentsDir);
      const agentEntries = await fs.readdir(agentsDir);
      agentsSig = `${agentStat.mtimeMs}-${agentEntries.length}`;
    } catch { /* ignore if .agents doesn't exist yet */ }

    return `${stat.mtimeMs}-${entries.length}-${agentsSig}`;
  } catch {
    return "0";
  }
}

/**
 * GET /api/agents/events — Server-Sent Events for real-time Mission Control updates.
 * Pushes agent status, goal progress, and new Slack messages every 3 seconds.
 */
export async function GET() {
  const encoder = new TextEncoder();
  let closed = false;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        } catch {
          closed = true;
        }
      };

      // Track last known state for diffing
      let lastSlackCounts: Record<string, number> = {};
      let lastDataVersion = await getDataDirVersion();

      const tick = async () => {
        if (closed) return;

        try {
          // Gather current state
          const personas = await listAllPersonas();
          const registered = personas
            .filter((persona) => persona.active && !!persona.heartbeat)
            .map((persona) => persona.slug);
          const runningCounts = await getRunningConversationCounts();

          // Agent statuses
          const agentStatuses = personas.map((p) => ({
            slug: p.slug,
            active: p.active,
            scheduled: registered.includes(p.slug),
            running: (runningCounts[p.slug] || 0) > 0,
            runningCount: runningCounts[p.slug] || 0,
            lastHeartbeat: p.lastHeartbeat,
            nextHeartbeat: p.nextHeartbeat,
          }));

          send("agent_status", agentStatuses);

          // Conversation completion notifications
          const completedNotifications = drainConversationNotifications();
          if (completedNotifications.length > 0) {
            const enriched = completedNotifications.map((n) => {
              const persona = personas.find(
                (p) =>
                  p.slug === n.agentSlug &&
                  (typeof n.cabinetPath !== "string" ||
                    !n.cabinetPath ||
                    p.cabinetPath === n.cabinetPath)
              ) || personas.find((p) => p.slug === n.agentSlug);
              return {
                ...n,
                agentName: persona?.name || n.agentSlug,
                agentEmoji: persona?.emoji || "🤖",
              };
            });
            send("conversation_completed", enriched);
          }

          // Goal progress (only for agents with goals)
          const goalUpdates: { slug: string; goals: Record<string, { current: number; target: number }> }[] = [];
          for (const p of personas) {
            if (p.goals && p.goals.length > 0) {
              const state = await getGoalState(p.slug);
              const goals: Record<string, { current: number; target: number }> = {};
              for (const g of p.goals) {
                const s = state[g.metric];
                goals[g.metric] = {
                  current: s?.current ?? g.current ?? 0,
                  target: g.target,
                };
              }
              goalUpdates.push({ slug: p.slug, goals });
            }
          }
          if (goalUpdates.length > 0) {
            send("goal_update", goalUpdates);
          }

          // New Slack messages (check for new messages per channel)
          const channels = ["general", "marketing", "engineering", "operations", "alerts"];
          const newSlackCounts: Record<string, number> = {};
          for (const ch of channels) {
            try {
              const msgs = await getMessages(ch, 1);
              newSlackCounts[ch] = msgs.length > 0 ? msgs.length : 0;
            } catch {
              newSlackCounts[ch] = 0;
            }
          }

          // Detect if any channel has new messages
          for (const ch of channels) {
            if (lastSlackCounts[ch] !== undefined && newSlackCounts[ch] > lastSlackCounts[ch]) {
              // Include latest message content for @human detection
              try {
                const latestMsgs = await getMessages(ch, 1);
                const latest = latestMsgs[latestMsgs.length - 1];
                const hasHumanMention = latest?.content?.includes("@human") || latest?.mentions?.includes("human");
                send("slack_activity", {
                  channel: ch,
                  hasHumanMention,
                  agentName: latest?.displayName || latest?.agent,
                  agentEmoji: latest?.emoji,
                  preview: latest?.content?.slice(0, 120),
                });
              } catch {
                send("slack_activity", { channel: ch });
              }
            }
          }
          lastSlackCounts = newSlackCounts;

          // Pulse metrics summary
          const allGoals = personas.flatMap((p) => p.goals || []);
          const goalsOnTrack = allGoals.filter((g) => {
            if (g.target === 0) return true;
            return (g.current ?? 0) / g.target >= 0.4;
          }).length;

          // Responding agents (typing indicator for Slack)
          const responding = getRespondingAgents();
          const respondingList = [...responding.entries()].map(([slug, info]) => {
            const p = personas.find((a) => a.slug === slug);
            return {
              slug,
              channel: info.channel,
              emoji: p?.emoji || "🤖",
              name: p?.name || slug,
            };
          });
          // Always send — empty array clears the typing indicator
          send("agent_responding", respondingList);

          send("pulse", {
            totalAgents: personas.length,
            activeAgents: personas.filter((p) => p.active).length,
            scheduledAgents: registered.length,
            runningPlays: Object.values(runningCounts).reduce((sum, count) => sum + count, 0),
            goalsOnTrack,
            totalGoals: allGoals.length,
          });

          // Tree change detection — notify client to reload sidebar
          const currentDataVersion = await getDataDirVersion();
          if (currentDataVersion !== lastDataVersion) {
            lastDataVersion = currentDataVersion;
            send("tree_changed", {});
          }
        } catch {
          // Ignore errors in SSE tick
        }
      };

      // Initial tick
      await tick();

      // Poll every 3 seconds
      const interval = setInterval(tick, 3000);

      // Cleanup when client disconnects
      const cleanup = () => {
        closed = true;
        clearInterval(interval);
        try { controller.close(); } catch { /* already closed */ }
      };

      // Auto-close after 5 minutes to prevent zombie connections
      setTimeout(cleanup, 5 * 60 * 1000);
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
