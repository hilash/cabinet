import { NextRequest, NextResponse } from "next/server";
import {
  buildEditorConversationPrompt,
  buildManualConversationPrompt,
  startConversationRun,
} from "@/lib/agents/conversation-runner";
import { listConversationMetas } from "@/lib/agents/conversation-store";
import { readMemory, writeMemory } from "@/lib/agents/persona-manager";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const agentSlug = searchParams.get("agent") || undefined;
  const pagePath = searchParams.get("pagePath") || undefined;
  const trigger = searchParams.get("trigger") as
    | "manual"
    | "job"
    | "heartbeat"
    | null;
  const status = searchParams.get("status") as
    | "running"
    | "completed"
    | "failed"
    | "cancelled"
    | null;
  const limit = parseInt(searchParams.get("limit") || "200", 10);

  const conversations = await listConversationMetas({
    agentSlug: agentSlug && agentSlug !== "all" ? agentSlug : undefined,
    pagePath: pagePath || undefined,
    trigger: trigger || undefined,
    status: status || undefined,
    limit,
  });

  return NextResponse.json({ conversations });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const source = body.source === "editor" ? "editor" : "manual";
    const agentSlug = source === "editor" ? "editor" : body.agentSlug || "general";
    const userMessage = (body.userMessage || "").trim();
    const mentionedPaths = Array.isArray(body.mentionedPaths)
      ? body.mentionedPaths.filter((value: unknown): value is string => typeof value === "string")
      : [];
    const pagePath =
      typeof body.pagePath === "string" && body.pagePath.trim()
        ? body.pagePath.trim()
        : undefined;

    if (!userMessage) {
      return NextResponse.json(
        { error: "userMessage is required" },
        { status: 400 }
      );
    }

    if (source === "editor" && !pagePath) {
      return NextResponse.json(
        { error: "pagePath is required for editor conversations" },
        { status: 400 }
      );
    }

    const conversationInput =
      source === "editor" && pagePath
        ? await buildEditorConversationPrompt({
            pagePath,
            userMessage,
            mentionedPaths,
          })
        : await buildManualConversationPrompt({
            agentSlug,
            userMessage,
            mentionedPaths,
          });

    const conversation = await startConversationRun({
      agentSlug,
      title: conversationInput.title,
      trigger: "manual",
      prompt: conversationInput.prompt,
      providerId: conversationInput.providerId,
      mentionedPaths:
        "mentionedPaths" in conversationInput
          ? conversationInput.mentionedPaths
          : mentionedPaths,
      cwd: conversationInput.cwd,
      allowedRoots: conversationInput.allowedRoots,
      onComplete: async (completion) => {
        if (agentSlug === "general" || !completion.meta.contextSummary) return;
        const timestamp = new Date().toISOString();
        const existingContext = await readMemory(agentSlug, "context.md");
        const nextEntry = `\n\n## ${timestamp}\n${completion.meta.contextSummary}`;
        await writeMemory(agentSlug, "context.md", existingContext + nextEntry);
      },
    });

    return NextResponse.json({ ok: true, conversation }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
