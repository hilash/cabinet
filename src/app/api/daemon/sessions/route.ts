import { NextResponse } from "next/server";
import { listDaemonSessions } from "@/lib/agents/daemon-client";
import { route } from "@/lib/runtime/route-wrapper";

export const GET = route(async () => {
  try {
    const sessions = await listDaemonSessions();
    return NextResponse.json(sessions);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to list daemon sessions";
    return NextResponse.json({ error: message }, { status: 500 });
  }
});
