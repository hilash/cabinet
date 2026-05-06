import { NextRequest, NextResponse } from "next/server";
import { getSession, stopAgent } from "@/lib/agents/agent-manager";
import { route } from "@/lib/runtime/route-wrapper";

type RouteParams = { params: Promise<{ id: string }> };

export const GET = route(async (_req: NextRequest, { params }: RouteParams) => {
  try {
    const { id } = await params;
    const session = getSession(id);
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }
    return NextResponse.json(session);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
});

export const DELETE = route(async (_req: NextRequest, { params }: RouteParams) => {
  try {
    const { id } = await params;
    const stopped = stopAgent(id);
    return NextResponse.json({ ok: true, stopped });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
});
