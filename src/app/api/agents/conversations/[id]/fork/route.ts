import { NextRequest, NextResponse } from "next/server";
import { forkConversationRun } from "@/lib/agents/conversation-runner";
import { readConversationMeta } from "@/lib/agents/conversation-store";
import {
  restrictedAgentRuntimeDenial,
  restrictedModeDenialResponse,
} from "@/lib/optale/restricted-customer-mode";

interface ForkBody {
  fromTurn?: number;
  userMessage?: string;
  cabinetPath?: string;
  reason?: "retry" | "branch";
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  let body: ForkBody = {};
  try {
    body = (await req.json()) as ForkBody;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  if (
    typeof body.fromTurn !== "number" ||
    !Number.isInteger(body.fromTurn) ||
    body.fromTurn < 1
  ) {
    return NextResponse.json(
      { ok: false, error: "fromTurn must be a positive integer" },
      { status: 400 }
    );
  }

  if (typeof body.userMessage === "string" && !body.userMessage.trim()) {
    return NextResponse.json(
      { ok: false, error: "userMessage cannot be empty" },
      { status: 400 }
    );
  }

  const cabinetPath =
    typeof body.cabinetPath === "string" && body.cabinetPath.trim()
      ? body.cabinetPath.trim()
      : req.nextUrl.searchParams.get("cabinetPath") || undefined;

  const existing = await readConversationMeta(id, cabinetPath);
  if (!existing) {
    return NextResponse.json(
      { ok: false, error: "Conversation not found" },
      { status: 404 }
    );
  }
  if (existing.status === "running") {
    return NextResponse.json(
      { ok: false, error: "Cannot fork a conversation while it is running" },
      { status: 409 }
    );
  }

  const restricted = restrictedModeDenialResponse(
    restrictedAgentRuntimeDenial({
      providerId: existing.providerId,
      adapterType: existing.adapterType,
    })
  );
  if (restricted) return restricted;

  try {
    const conversation = await forkConversationRun(id, {
      fromTurn: body.fromTurn,
      userMessage: body.userMessage,
      cabinetPath: existing.cabinetPath ?? cabinetPath,
      reason: body.reason === "branch" ? "branch" : "retry",
    });
    if (!conversation) {
      return NextResponse.json(
        { ok: false, error: "Conversation not found" },
        { status: 404 }
      );
    }
    return NextResponse.json({ ok: true, conversation }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to fork conversation",
      },
      { status: 400 }
    );
  }
}
