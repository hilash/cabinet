import { NextRequest, NextResponse } from "next/server";
import {
  deleteConversation,
  finalizeConversation,
  readConversationDetail,
} from "@/lib/agents/conversation-store";
import { stopDaemonSession } from "@/lib/agents/daemon-client";
import { startConversationRun } from "@/lib/agents/conversation-runner";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const cabinetPath = req.nextUrl.searchParams.get("cabinetPath") || undefined;
  const detail = await readConversationDetail(id, cabinetPath);

  if (!detail) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  }

  return NextResponse.json(detail);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const cabinetPath = req.nextUrl.searchParams.get("cabinetPath") || undefined;
  const deleted = await deleteConversation(id, cabinetPath);

  if (!deleted) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const cabinetPath = req.nextUrl.searchParams.get("cabinetPath") || undefined;

  let body: { action?: string } = {};
  try {
    body = (await req.json()) as { action?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { action } = body;

  if (action === "stop") {
    await stopDaemonSession(id);
    await finalizeConversation(id, { status: "failed", exitCode: 1 }, cabinetPath);
    return NextResponse.json({ ok: true });
  }

  if (action === "restart") {
    // Stop if still running
    await stopDaemonSession(id);
    await finalizeConversation(id, { status: "failed", exitCode: 1 }, cabinetPath);

    // Read original conversation to get prompt/agent
    const detail = await readConversationDetail(id, cabinetPath);
    if (!detail) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    const { meta, prompt } = detail;
    const newConversation = await startConversationRun({
      agentSlug: meta.agentSlug,
      title: meta.title,
      trigger: meta.trigger,
      prompt,
      cabinetPath: meta.cabinetPath ?? cabinetPath,
      jobId: meta.jobId,
      jobName: meta.jobName,
    });

    return NextResponse.json({ ok: true, conversation: newConversation });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
