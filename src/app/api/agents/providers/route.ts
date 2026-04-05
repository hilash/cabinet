import { NextResponse } from "next/server";
import { providerRegistry } from "@/lib/agents/provider-registry";
import {
  getConfiguredDefaultProviderId,
  isProviderEnabled,
  readProviderSettings,
} from "@/lib/agents/provider-settings";
import {
  ProviderSettingsConflictError,
  getProviderUsage,
  updateProviderSettingsWithMigrations,
} from "@/lib/agents/provider-management";

export async function GET() {
  try {
    const providers = providerRegistry.listAll();
    const settings = await readProviderSettings();
    const usage = await getProviderUsage();

    const results = await Promise.all(
      providers.map(async (p) => {
        const status = await p.healthCheck();
        return {
          id: p.id,
          name: p.name,
          type: p.type,
          icon: p.icon,
          enabled: isProviderEnabled(p.id, settings),
          usage: usage[p.id] || {
            agentSlugs: [],
            jobs: [],
            agentCount: 0,
            jobCount: 0,
            totalCount: 0,
          },
          ...status,
        };
      })
    );

    return NextResponse.json({
      providers: results,
      defaultProvider: getConfiguredDefaultProviderId(settings),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const result = await updateProviderSettingsWithMigrations({
      defaultProvider:
        typeof body.defaultProvider === "string"
          ? body.defaultProvider
          : providerRegistry.defaultProvider,
      disabledProviderIds: Array.isArray(body.disabledProviderIds)
        ? body.disabledProviderIds.filter((value: unknown): value is string => typeof value === "string")
        : [],
      migrations: Array.isArray(body.migrations)
        ? body.migrations.flatMap((value: unknown) => {
            if (!value || typeof value !== "object") return [];
            const migration = value as Record<string, unknown>;
            if (
              typeof migration.fromProviderId !== "string" ||
              typeof migration.toProviderId !== "string"
            ) {
              return [];
            }
            return [{
              fromProviderId: migration.fromProviderId,
              toProviderId: migration.toProviderId,
            }];
          })
        : [],
    });

    return NextResponse.json({
      ok: true,
      settings: result.settings,
      usage: result.usage,
      migrationsApplied: result.migrationsApplied,
    });
  } catch (error) {
    if (error instanceof ProviderSettingsConflictError) {
      return NextResponse.json({
        error: error.message,
        conflicts: error.conflicts,
      }, { status: 409 });
    }
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
