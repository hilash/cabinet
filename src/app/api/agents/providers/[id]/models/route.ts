import { NextResponse } from "next/server";
import { providerRegistry } from "@/lib/agents/provider-registry";
import type { ProviderModel } from "@/lib/agents/provider-interface";
import { route } from "@/lib/runtime/route-wrapper";

interface CachedModels {
  models: ProviderModel[];
  fetchedAt: number;
}

const CACHE_TTL_MS = 60_000;
const cache = new Map<string, CachedModels>();

export const GET = route(async (
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) => {
  const { id } = await ctx.params;
  const provider = providerRegistry.get(id);
  if (!provider) {
    return NextResponse.json({ error: `Unknown provider: ${id}` }, { status: 404 });
  }

  const now = Date.now();
  const cached = cache.get(id);
  if (cached && now - cached.fetchedAt < CACHE_TTL_MS) {
    return NextResponse.json({
      providerId: id,
      models: cached.models,
      cached: true,
      ageMs: now - cached.fetchedAt,
    });
  }

  let models: ProviderModel[];
  let dynamic = false;
  if (provider.listModels) {
    try {
      models = await provider.listModels();
      dynamic = true;
    } catch {
      models = provider.models || [];
    }
  } else {
    models = provider.models || [];
  }

  cache.set(id, { models, fetchedAt: now });

  return NextResponse.json({
    providerId: id,
    models,
    cached: false,
    dynamic,
    ttlMs: CACHE_TTL_MS,
  });
});
