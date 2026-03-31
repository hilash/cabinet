import { NextRequest, NextResponse } from "next/server";
import {
  emitWebhook,
  emitFileChanged,
  emitAgentMessage,
  checkGoalBehindTriggers,
  getTriggerLog,
  getRunningTriggers,
} from "@/lib/agents/trigger-engine";

/**
 * GET /api/agents/triggers — get trigger log and running triggers
 */
export async function GET(req: NextRequest) {
  const limit = parseInt(req.nextUrl.searchParams.get("limit") || "50", 10);
  const log = getTriggerLog(limit);
  const running = getRunningTriggers();
  return NextResponse.json({ log, running });
}

/**
 * POST /api/agents/triggers — emit a trigger event
 *
 * Body:
 *   { type: "webhook", playSlug?: string, payload?: object }
 *   { type: "file_changed", path: string }
 *   { type: "agent_message", fromAgent: string, toAgent: string, message: string }
 *   { type: "goal_behind" }  — checks all agents
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type } = body;

    switch (type) {
      case "webhook": {
        const entries = await emitWebhook(body.playSlug, body.payload);
        return NextResponse.json({ ok: true, triggered: entries.filter((e) => e.fired).length, entries });
      }

      case "file_changed": {
        if (!body.path) {
          return NextResponse.json({ error: "path required" }, { status: 400 });
        }
        await emitFileChanged(body.path);
        return NextResponse.json({ ok: true });
      }

      case "agent_message": {
        if (!body.fromAgent || !body.toAgent || !body.message) {
          return NextResponse.json(
            { error: "fromAgent, toAgent, and message required" },
            { status: 400 }
          );
        }
        await emitAgentMessage(body.fromAgent, body.toAgent, body.message);
        return NextResponse.json({ ok: true });
      }

      case "goal_behind": {
        await checkGoalBehindTriggers();
        return NextResponse.json({ ok: true });
      }

      default:
        return NextResponse.json(
          { error: `Unknown trigger type: ${type}` },
          { status: 400 }
        );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
