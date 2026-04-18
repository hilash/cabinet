import path from "path";
import { DATA_DIR } from "@/lib/storage/path-utils";
import { listPersonas, writePersona } from "@/lib/agents/persona/persona-manager";
import { reloadDaemonSchedules } from "@/lib/agents/runtime/daemon-client";
import { getRunningConversationCounts } from "@/lib/agents/runtime/conversation-store";
import { ensureAgentScaffold } from "@/lib/agents/persona/scaffold";
import { getDefaultProviderId } from "@/lib/agents/runtime/provider-runtime";
import { assertValidSlug } from "@/lib/agents/persona/slug-utils";
import {
  createGetHandler,
  createHandler,
  HttpError,
} from "@/lib/http/create-handler";

let initialized = false;

export const GET = createGetHandler({
  handler: async () => {
    if (!initialized) {
      await reloadDaemonSchedules().catch(() => {});
      initialized = true;
    }

    const personas = await listPersonas();
    const activeHeartbeats = personas
      .filter((persona) => persona.active && !!persona.heartbeat)
      .map((persona) => persona.slug);
    const runningCounts = await getRunningConversationCounts();

    return {
      personas: personas.map((persona) => ({
        ...persona,
        runningCount: runningCounts[persona.slug] || 0,
      })),
      activeHeartbeats,
    };
  },
});

export const POST = createHandler({
  handler: async (_input, req) => {
    const body = await req.json();
    const { slug, ...personaData } = body;

    if (!slug) {
      throw new HttpError(400, "slug is required");
    }

    assertValidSlug(slug);

    await writePersona(slug, {
      provider: personaData.provider || getDefaultProviderId(),
      ...personaData,
    });

    const agentDir = path.join(DATA_DIR, ".agents", slug);
    await ensureAgentScaffold(agentDir);

    await reloadDaemonSchedules().catch(() => {});

    return { ok: true };
  },
});
