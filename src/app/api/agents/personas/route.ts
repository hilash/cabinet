import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { DATA_DIR } from "@/lib/storage/path-utils";
import {
  listPersonas,
  writePersona,
} from "@/lib/agents/persona-manager";
import { reloadDaemonSchedules } from "@/lib/agents/daemon-client";
import { getRunningConversationCounts } from "@/lib/agents/conversation-store";
import { ensureAgentScaffold } from "@/lib/agents/scaffold";

// Initialize heartbeats on first request
let initialized = false;

export async function GET() {
  if (!initialized) {
    await reloadDaemonSchedules().catch(() => {});
    initialized = true;
  }

  const personas = await listPersonas();
  const activeHeartbeats = personas
    .filter((persona) => persona.active && !!persona.heartbeat)
    .map((persona) => persona.slug);
  const runningCounts = await getRunningConversationCounts();

  return NextResponse.json({
    personas: personas.map((persona) => ({
      ...persona,
      runningCount: runningCounts[persona.slug] || 0,
    })),
    activeHeartbeats,
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { slug, ...personaData } = body;

  if (!slug) {
    return NextResponse.json({ error: "slug is required" }, { status: 400 });
  }

  await writePersona(slug, personaData);

  const agentDir = path.join(DATA_DIR, ".agents", slug);
  await ensureAgentScaffold(agentDir);

  await reloadDaemonSchedules().catch(() => {});

  return NextResponse.json({ ok: true }, { status: 201 });
}
