import { createGetHandler, createHandler, HttpError } from "@/lib/http/create-handler";
import {
  buildEditorConversationPrompt,
  buildManualConversationPrompt,
  startConversationRun,
} from "@/lib/agents/conversation-runner";
import { listConversationMetas } from "@/lib/agents/conversation-store";
import { readMemory, writeMemory } from "@/lib/agents/persona-manager";
import { assertValidSlug } from "@/lib/agents/persona/slug-utils";

export const GET = createGetHandler({
  handler: async (req) => {
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

    if (agentSlug && agentSlug !== "all") {
      assertValidSlug(agentSlug, "agent");
    }

    const conversations = await listConversationMetas({
      agentSlug: agentSlug && agentSlug !== "all" ? agentSlug : undefined,
      pagePath: pagePath || undefined,
      trigger: trigger || undefined,
      status: status || undefined,
      limit,
    });

    return { conversations };
  },
});

export const POST = createHandler({
  handler: async (_input, req) => {
    const body = await req.json();
    const source = body.source === "editor" ? "editor" : "manual";
    const agentSlug = source === "editor" ? "editor" : body.agentSlug || "general";
    const userMessage = (body.userMessage || "").trim();
    const mentionedPaths = Array.isArray(body.mentionedPaths)
      ? body.mentionedPaths.filter(
          (value: unknown): value is string => typeof value === "string",
        )
      : [];
    const pagePath =
      typeof body.pagePath === "string" && body.pagePath.trim()
        ? body.pagePath.trim()
        : undefined;

    if (!userMessage) {
      throw new HttpError(400, "userMessage is required");
    }

    if (source === "editor" && !pagePath) {
      throw new HttpError(400, "pagePath is required for editor conversations");
    }

    assertValidSlug(agentSlug, "agentSlug");

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
      onComplete: async (completion) => {
        if (agentSlug === "general" || !completion.meta.contextSummary) return;
        const timestamp = new Date().toISOString();
        const existingContext = await readMemory(agentSlug, "context.md");
        const nextEntry = `\n\n## ${timestamp}\n${completion.meta.contextSummary}`;
        await writeMemory(agentSlug, "context.md", existingContext + nextEntry);
      },
    });

    return { ok: true, conversation };
  },
});
