import {
  listPersonas,
  writePersona,
} from "@/lib/agents/persona/persona-manager";
import { reloadDaemonSchedules } from "@/lib/agents/runtime/daemon-client";
import {
  HttpError,
  createGetHandler,
  createHandler,
} from "@/lib/http/create-handler";
import { assertValidSlug } from "@/lib/agents/persona/slug-utils";

/**
 * GET /api/agents/scheduler — Get scheduler status
 */
export const GET = createGetHandler({
  handler: async () => {
    const personas = await listPersonas();
    const registered = personas
      .filter((persona) => persona.active && !!persona.heartbeat)
      .map((persona) => persona.slug);

    const active = personas.filter((p) => p.active);
    const paused = personas.filter((p) => !p.active);

    return {
      status: registered.length > 0 ? "running" : "stopped",
      scheduledAgents: registered,
      totalAgents: personas.length,
      activeCount: active.length,
      pausedCount: paused.length,
      agents: personas.map((p) => ({
        slug: p.slug,
        name: p.name,
        emoji: p.emoji,
        active: p.active,
        scheduled: registered.includes(p.slug),
        heartbeat: p.heartbeat,
        lastHeartbeat: p.lastHeartbeat,
        nextHeartbeat: p.nextHeartbeat,
      })),
    };
  },
});

/**
 * POST /api/agents/scheduler — Control the scheduler
 * body.action: "start-all" | "stop-all" | "activate" | "pause"
 * body.slugs?: string[] — specific agents to activate/pause (default: all)
 * body.exclude?: string[] — agents to exclude from bulk operations
 */
export const POST = createHandler({
  handler: async (_input, req) => {
    const body = await req.json();
    const { action, slugs, exclude = [] } = body;
    const targetSlugs = slugs ?? [];

    if (!Array.isArray(targetSlugs)) {
      throw new HttpError(400, "slugs must be an array");
    }
    if (!Array.isArray(exclude)) {
      throw new HttpError(400, "exclude must be an array");
    }
    for (const slug of targetSlugs) {
      if (typeof slug !== "string") {
        throw new HttpError(400, "slugs must contain strings");
      }
      assertValidSlug(slug);
    }
    for (const slug of exclude) {
      if (typeof slug !== "string") {
        throw new HttpError(400, "exclude must contain strings");
      }
      assertValidSlug(slug, "exclude");
    }

    const personas = await listPersonas();

    switch (action) {
      case "start-all": {
        // Activate and register all agents (except excluded ones)
        const toActivate = personas.filter(
          (p) => !p.active && !exclude.includes(p.slug)
        );
        for (const p of toActivate) {
          await writePersona(p.slug, { active: true });
        }
        await reloadDaemonSchedules().catch(() => {});
        const newRegistered = personas
          .filter((p) => (p.active || toActivate.some((agent) => agent.slug === p.slug)) && !exclude.includes(p.slug))
          .map((p) => p.slug);
        return {
          ok: true,
          activated: toActivate.length,
          totalScheduled: newRegistered.length,
        };
      }

      case "stop-all": {
        // Pause and unregister all agents
        for (const p of personas) {
          if (p.active) {
            await writePersona(p.slug, { active: false });
          }
        }
        await reloadDaemonSchedules().catch(() => {});
        return { ok: true, paused: personas.filter((p) => p.active).length };
      }

      case "activate": {
        // Activate specific agents
        let count = 0;
        for (const slug of targetSlugs) {
          const p = personas.find((pp) => pp.slug === slug);
          if (p && !p.active) {
            await writePersona(slug, { active: true });
            count++;
          }
        }
        await reloadDaemonSchedules().catch(() => {});
        return { ok: true, activated: count };
      }

      case "pause": {
        // Pause specific agents
        let count = 0;
        for (const slug of targetSlugs) {
          const p = personas.find((pp) => pp.slug === slug);
          if (p && p.active) {
            await writePersona(slug, { active: false });
            count++;
          }
        }
        await reloadDaemonSchedules().catch(() => {});
        return { ok: true, paused: count };
      }

      default:
        throw new HttpError(400, "Unknown action");
    }
  },
});
