import { NextRequest, NextResponse } from "next/server";
import {
  listPersonas,
  writePersona,
  registerHeartbeat,
  unregisterHeartbeat,
  registerAllHeartbeats,
  getRegisteredHeartbeats,
} from "@/lib/agents/persona-manager";

/**
 * GET /api/agents/scheduler — Get scheduler status
 */
export async function GET() {
  const personas = await listPersonas();
  const registered = getRegisteredHeartbeats();

  const active = personas.filter((p) => p.active);
  const paused = personas.filter((p) => !p.active);

  return NextResponse.json({
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
  });
}

/**
 * POST /api/agents/scheduler — Control the scheduler
 * body.action: "start-all" | "stop-all" | "activate" | "pause"
 * body.slugs?: string[] — specific agents to activate/pause (default: all)
 * body.exclude?: string[] — agents to exclude from bulk operations
 */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { action, slugs, exclude = [] } = body;

  const personas = await listPersonas();

  switch (action) {
    case "start-all": {
      // Activate and register all agents (except excluded ones)
      const toActivate = personas.filter(
        (p) => !p.active && !exclude.includes(p.slug)
      );
      for (const p of toActivate) {
        await writePersona(p.slug, { active: true });
        registerHeartbeat(p.slug, p.heartbeat);
      }
      // Also register already-active agents that somehow weren't scheduled
      const registered = getRegisteredHeartbeats();
      for (const p of personas) {
        if (p.active && !registered.includes(p.slug) && !exclude.includes(p.slug)) {
          registerHeartbeat(p.slug, p.heartbeat);
        }
      }
      const newRegistered = getRegisteredHeartbeats();
      return NextResponse.json({
        ok: true,
        activated: toActivate.length,
        totalScheduled: newRegistered.length,
      });
    }

    case "stop-all": {
      // Pause and unregister all agents
      for (const p of personas) {
        if (p.active) {
          await writePersona(p.slug, { active: false });
          unregisterHeartbeat(p.slug);
        }
      }
      return NextResponse.json({ ok: true, paused: personas.filter((p) => p.active).length });
    }

    case "activate": {
      // Activate specific agents
      const targetSlugs = slugs || [];
      let count = 0;
      for (const slug of targetSlugs) {
        const p = personas.find((pp) => pp.slug === slug);
        if (p && !p.active) {
          await writePersona(slug, { active: true });
          registerHeartbeat(slug, p.heartbeat);
          count++;
        }
      }
      return NextResponse.json({ ok: true, activated: count });
    }

    case "pause": {
      // Pause specific agents
      const targetSlugs = slugs || [];
      let count = 0;
      for (const slug of targetSlugs) {
        const p = personas.find((pp) => pp.slug === slug);
        if (p && p.active) {
          await writePersona(slug, { active: false });
          unregisterHeartbeat(slug);
          count++;
        }
      }
      return NextResponse.json({ ok: true, paused: count });
    }

    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }
}
