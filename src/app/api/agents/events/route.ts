import { NextResponse } from "next/server";
import { listPersonas, getRegisteredHeartbeats, getRunningHeartbeats } from "@/lib/agents/persona-manager";
import { getGoalState } from "@/lib/agents/goal-manager";
import { getMessages } from "@/lib/agents/slack-manager";
import { getRespondingAgents } from "@/app/api/agents/slack/route";

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

      const tick = async () => {
        if (closed) return;

        try {
          // Gather current state
          const personas = await listPersonas();
          const registered = getRegisteredHeartbeats();
          const running = getRunningHeartbeats();

          // Agent statuses
          const agentStatuses = personas.map((p) => ({
            slug: p.slug,
            active: p.active,
            scheduled: registered.includes(p.slug),
            running: running.includes(p.slug),
            lastHeartbeat: p.lastHeartbeat,
            nextHeartbeat: p.nextHeartbeat,
          }));

          send("agent_status", agentStatuses);

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
            runningPlays: running.length,
            goalsOnTrack,
            totalGoals: allGoals.length,
          });
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
