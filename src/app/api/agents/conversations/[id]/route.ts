import { NextRequest, NextResponse } from "next/server";
import {
  deleteConversation,
  finalizeConversation,
  readConversationDetail,
  readConversationMeta,
  writeConversationMeta,
} from "@/lib/agents/conversation-store";
import { closeDaemonSession, stopDaemonSession } from "@/lib/agents/daemon-client";
import { startConversationRun } from "@/lib/agents/conversation-runner";
import { publishConversationEvent } from "@/lib/agents/conversation-events";
import type { ConversationMeta } from "@/types/conversations";
import { route } from "@/lib/runtime/route-wrapper";

export const GET = route(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { id } = await params;
  const cabinetPath = req.nextUrl.searchParams.get("cabinetPath") || undefined;
  const withTurns = req.nextUrl.searchParams.get("withTurns") === "1";
  const detail = await readConversationDetail(id, cabinetPath, { withTurns });

  if (!detail) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  }

  return NextResponse.json(detail);
});

export const DELETE = route(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { id } = await params;
  const cabinetPath = req.nextUrl.searchParams.get("cabinetPath") || undefined;
  const deleted = await deleteConversation(id, cabinetPath);

  if (!deleted) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
});

interface PatchBody {
  action?: string;
  title?: string;
  summary?: string;
  doneAt?: string | null;
  archivedAt?: string | null;
  titlePinned?: boolean;
  // `done` / `archived` shortcuts that set the corresponding timestamp
  done?: boolean;
  archived?: boolean;
  // v2 board: within-lane sort index.
  boardOrder?: number;
  // v2 board: reassign the conversation to a different agent.
  agentSlug?: string;
  // v2 board: mute the task so done runs skip Just Finished.
  muted?: boolean;
}

export const PATCH = route(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { id } = await params;
  const cabinetPath = req.nextUrl.searchParams.get("cabinetPath") || undefined;

  let body: PatchBody = {};
  try {
    body = (await req.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { action } = body;

  if (action === "stop") {
    await stopDaemonSession(id);
    await finalizeConversation(id, { status: "failed", exitCode: 1 }, cabinetPath);
    publishConversationEvent({
      type: "task.updated",
      taskId: id,
      cabinetPath,
      payload: { action: "stop" },
    });
    return NextResponse.json({ ok: true });
  }

  // Graceful close for manual terminal-mode sessions. Writes `/exit` into
  // the PTY's stdin; the CLI shuts down cleanly, the PTY exits code 0,
  // and the daemon's `onExit` handler runs `finalizeConversation` with
  // `status: "completed"`. We intentionally do NOT call finalize here —
  // doing so would race the natural path and could flip the task to
  // failed before the PTY's exit handler lands.
  if (action === "close") {
    const ok = await closeDaemonSession(id);
    publishConversationEvent({
      type: "task.updated",
      taskId: id,
      cabinetPath,
      payload: { action: "close", ok },
    });
    return NextResponse.json({ ok });
  }

  if (action === "restart") {
    await stopDaemonSession(id);
    await finalizeConversation(id, { status: "failed", exitCode: 1 }, cabinetPath);

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
      adapterType: meta.adapterType,
      adapterConfig: meta.adapterConfig,
      providerId: meta.providerId,
      cabinetPath: meta.cabinetPath ?? cabinetPath,
      jobId: meta.jobId,
      jobName: meta.jobName,
    });

    return NextResponse.json({ ok: true, conversation: newConversation });
  }

  if (action) {
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  // Field-level update path (no action): summary, title, done/archived flags.
  const existing = await readConversationMeta(id, cabinetPath);
  if (!existing) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  }

  const updates: Partial<ConversationMeta> = {};
  if (typeof body.title === "string") {
    updates.title = body.title;
    if (body.titlePinned === true) updates.titlePinned = true;
  }
  if (typeof body.summary === "string") {
    updates.summary = body.summary;
    updates.summaryEditedAt = new Date().toISOString();
  }
  if (body.done === true) updates.doneAt = new Date().toISOString();
  else if (body.done === false) updates.doneAt = undefined;
  if (body.doneAt !== undefined) {
    updates.doneAt = body.doneAt === null ? undefined : body.doneAt;
  }
  if (body.archived === true) updates.archivedAt = new Date().toISOString();
  else if (body.archived === false) updates.archivedAt = undefined;
  if (body.archivedAt !== undefined) {
    updates.archivedAt = body.archivedAt === null ? undefined : body.archivedAt;
  }
  if (typeof body.boardOrder === "number" && Number.isFinite(body.boardOrder)) {
    updates.boardOrder = body.boardOrder;
  }
  if (typeof body.agentSlug === "string" && body.agentSlug.trim()) {
    updates.agentSlug = body.agentSlug.trim();
  }
  if (typeof body.muted === "boolean") {
    updates.muted = body.muted;
  }

  const nextMeta: ConversationMeta = {
    ...existing,
    ...updates,
    lastActivityAt: new Date().toISOString(),
  };
  await writeConversationMeta(nextMeta);

  publishConversationEvent({
    type: "task.updated",
    taskId: id,
    cabinetPath,
    payload: updates as Record<string, unknown>,
  });

  return NextResponse.json({ ok: true, meta: nextMeta });
});
