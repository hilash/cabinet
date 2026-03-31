import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { DATA_DIR } from "@/lib/storage/path-utils";
import { ensureDirectory } from "@/lib/storage/fs-operations";
import {
  listPersonas,
  writePersona,
  registerAllHeartbeats,
  getRegisteredHeartbeats,
} from "@/lib/agents/persona-manager";

// Initialize heartbeats on first request
let initialized = false;

export async function GET() {
  if (!initialized) {
    await registerAllHeartbeats();
    initialized = true;
  }

  const personas = await listPersonas();
  const activeHeartbeats = getRegisteredHeartbeats();

  return NextResponse.json({
    personas,
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

  // Create workspace directory for the agent
  const wsDir = path.join(DATA_DIR, ".agents", slug, "workspace");
  await ensureDirectory(wsDir);

  // Re-register heartbeats
  await registerAllHeartbeats();

  return NextResponse.json({ ok: true }, { status: 201 });
}
