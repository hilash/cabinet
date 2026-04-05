import { NextRequest, NextResponse } from "next/server";
import {
  getActiveSessions,
  getRecentSessions,
  runAgent,
  getAgentStats,
} from "@/lib/agents/agent-manager";

export async function GET() {
  try {
    const active = getActiveSessions();
    const recent = getRecentSessions();
    const stats = getAgentStats();
    return NextResponse.json({ active, recent, stats });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { taskTitle, prompt, taskId, workdir, providerId } = body;

    if (!prompt) {
      return NextResponse.json(
        { error: "prompt is required" },
        { status: 400 }
      );
    }

    const sessionId = await runAgent(
      taskTitle || "Manual agent run",
      prompt,
      taskId,
      workdir,
      providerId
    );

    return NextResponse.json({ ok: true, sessionId }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
