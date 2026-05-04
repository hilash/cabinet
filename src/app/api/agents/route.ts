import { NextRequest, NextResponse } from "next/server";
import {
  getActiveSessions,
  getRecentSessions,
  runAgent,
  getAgentStats,
} from "@/lib/agents/agent-manager";
import {
  restrictedCustomerModeResponse,
} from "@/lib/optale/restricted-customer-mode";
import { isOptaleRestrictedCustomerMode } from "@/lib/optale/runtime-mode";

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
  if (isOptaleRestrictedCustomerMode()) {
    return restrictedCustomerModeResponse(
      "agents.legacy_run",
      "Direct legacy agent runs are operator-only in restricted customer mode.",
    );
  }

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
