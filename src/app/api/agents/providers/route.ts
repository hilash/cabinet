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
import { NextResponse } from "next/server";
import { createGetHandler, createHandler } from "@/lib/http/create-handler";

export const GET = createGetHandler({
  handler: async () => {
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
          installMessage: p.installMessage,
          installSteps: p.installSteps,
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
      }),
    );

    return {
      providers: results,
      defaultProvider: getConfiguredDefaultProviderId(settings),
    };
  },
});

export const PUT = createHandler({
  handler: async (_input, req) => {
    const body = await req.json();
    try {
      const result = await updateProviderSettingsWithMigrations({
        defaultProvider:
          typeof body.defaultProvider === "string"
            ? body.defaultProvider
            : providerRegistry.defaultProvider,
        disabledProviderIds: Array.isArray(body.disabledProviderIds)
          ? body.disabledProviderIds.filter(
              (value: unknown): value is string => typeof value === "string",
            )
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
              return [
                {
                  fromProviderId: migration.fromProviderId,
                  toProviderId: migration.toProviderId,
                },
              ];
            })
          : [],
      });

      return {
        ok: true,
        settings: result.settings,
        usage: result.usage,
        migrationsApplied: result.migrationsApplied,
      };
    } catch (error) {
      if (error instanceof ProviderSettingsConflictError) {
        return NextResponse.json(
          { error: error.message, conflicts: error.conflicts },
          { status: 409 },
        );
      }
      throw error;
    }
  },
});
