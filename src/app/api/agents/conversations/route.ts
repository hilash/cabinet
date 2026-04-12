import { NextRequest, NextResponse } from "next/server";
import {
  buildEditorConversationPrompt,
  buildManualConversationPrompt,
  startConversationRun,
} from "@/lib/agents/conversation-runner";
import { listConversationMetas } from "@/lib/agents/conversation-store";
import { readMemory, writeMemory } from "@/lib/agents/persona-manager";
import { readCabinetOverview } from "@/lib/cabinets/overview";
import type { CabinetVisibilityMode } from "@/types/cabinets";

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
  const cabinetPath = searchParams.get("cabinetPath") || undefined;
  const visibilityMode = (searchParams.get("visibilityMode") || "own") as CabinetVisibilityMode;
  const limit = parseInt(searchParams.get("limit") || "200", 10);

  const filters = {
    agentSlug: agentSlug && agentSlug !== "all" ? agentSlug : undefined,
    pagePath: pagePath || undefined,
    trigger: trigger || undefined,
    status: status || undefined,
    limit: 1000,
  };

  // When viewing a cabinet with visibility that includes descendants, aggregate
  // conversations from all visible cabinet directories.
  if (cabinetPath && visibilityMode !== "own") {
    try {
      const overview = await readCabinetOverview(cabinetPath, { visibilityMode });
      const visiblePaths = overview.visibleCabinets.map((c) => c.path);

      const all = await Promise.all(
        visiblePaths.map((cp) => listConversationMetas({ ...filters, cabinetPath: cp }))
      );

      const merged = all.flat();
      merged.sort(
        (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
      );

      return NextResponse.json({ conversations: merged.slice(0, limit) });
    } catch {
      // Fall through to single-cabinet fetch on error
    }
  }

  const conversations = await listConversationMetas({
    ...filters,
    cabinetPath,
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
    const cabinetPath =
      typeof body.cabinetPath === "string" && body.cabinetPath.trim()
        ? body.cabinetPath.trim()
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
            cabinetPath,
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
      cabinetPath: "cabinetPath" in conversationInput ? conversationInput.cabinetPath : cabinetPath,
      onComplete: async (completion) => {
        if (agentSlug === "general" || !completion.meta.contextSummary) return;
        const timestamp = new Date().toISOString();
        const completionCabinetPath = completion.meta.cabinetPath || cabinetPath;
        const existingContext = await readMemory(
          agentSlug,
          "context.md",
          completionCabinetPath
        );
        const nextEntry = `\n\n## ${timestamp}\n${completion.meta.contextSummary}`;
        await writeMemory(
          agentSlug,
          "context.md",
          existingContext + nextEntry,
          completionCabinetPath
        );
      },
    });

    return NextResponse.json({ ok: true, conversation }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
