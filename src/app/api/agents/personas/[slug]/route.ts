import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import { DATA_DIR } from "@/lib/storage/path-utils";
import {
  readPersona,
  writePersona,
  deletePersona,
  readMemory,
  writeMemory,
  listMemoryFiles,
  readInbox,
  sendMessage,
  getHeartbeatHistory,
  registerAllHeartbeats,
  registerHeartbeat,
  unregisterHeartbeat,
} from "@/lib/agents/persona-manager";
import { runHeartbeat, startManualHeartbeat } from "@/lib/agents/heartbeat";
import { updateGoal, getGoalHistory } from "@/lib/agents/goal-manager";

type RouteParams = { params: Promise<{ slug: string }> };

export async function GET(req: NextRequest, { params }: RouteParams) {
  const { slug } = await params;
  const { searchParams } = new URL(req.url);

  // Session output retrieval
  const sessionTs = searchParams.get("session");
  if (sessionTs) {
    const sessionsDir = path.join(DATA_DIR, ".agents", slug, "sessions");
    const sessionFile = path.join(sessionsDir, `${sessionTs.replace(/[:.]/g, "-")}.txt`);
    // Validate path stays within sessions dir
    if (!sessionFile.startsWith(sessionsDir)) {
      return NextResponse.json({ error: "Invalid path" }, { status: 400 });
    }
    try {
      const output = await fs.readFile(sessionFile, "utf-8");
      return NextResponse.json({ output });
    } catch {
      return NextResponse.json({ output: null });
    }
  }

  const persona = await readPersona(slug);
  if (!persona) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const memoryFiles = await listMemoryFiles(slug);
  const memory: Record<string, string> = {};
  for (const file of memoryFiles) {
    if (file.endsWith(".md")) {
      memory[file] = await readMemory(slug, file);
    }
  }

  const inbox = await readInbox(slug);
  const history = await getHeartbeatHistory(slug);
  const goalHistory = await getGoalHistory(slug);

  return NextResponse.json({ persona, memory, inbox, history, goalHistory });
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
  const { slug } = await params;
  const body = await req.json();

  // Handle different update types
  if (body.action === "toggle") {
    const persona = await readPersona(slug);
    if (!persona) return NextResponse.json({ error: "Not found" }, { status: 404 });
    await writePersona(slug, { active: !persona.active });
    if (!persona.active) {
      registerHeartbeat(slug, persona.heartbeat);
    } else {
      unregisterHeartbeat(slug);
    }
    return NextResponse.json({ ok: true, active: !persona.active });
  }

  if (body.action === "run") {
    const sessionId = await startManualHeartbeat(slug);
    if (!sessionId) {
      return NextResponse.json({ ok: false, message: "Agent inactive or over budget" }, { status: 400 });
    }
    return NextResponse.json({ ok: true, sessionId });
  }

  if (body.action === "updateMemory") {
    await writeMemory(slug, body.file, body.content);
    return NextResponse.json({ ok: true });
  }

  if (body.action === "sendMessage") {
    await sendMessage(slug, body.to, body.message);
    return NextResponse.json({ ok: true });
  }

  if (body.action === "updateGoal") {
    const result = await updateGoal(slug, body.metric, body.increment || 1);
    return NextResponse.json({ ok: true, goal: result });
  }

  // Default: update persona
  await writePersona(slug, body);
  await registerAllHeartbeats();
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const { slug } = await params;
  await deletePersona(slug);
  return NextResponse.json({ ok: true });
}
