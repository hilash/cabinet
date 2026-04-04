import { NextResponse } from "next/server";
import { providerRegistry } from "@/lib/agents/provider-registry";
import {
  getConfiguredDefaultProviderId,
  isProviderEnabled,
  readProviderSettings,
  writeProviderSettings,
} from "@/lib/agents/provider-settings";

export async function GET() {
  try {
    const providers = providerRegistry.listAll();
    const settings = await readProviderSettings();

    const results = await Promise.all(
      providers.map(async (p) => {
        const status = await p.healthCheck();
        return {
          id: p.id,
          name: p.name,
          type: p.type,
          icon: p.icon,
          enabled: isProviderEnabled(p.id, settings),
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
    const settings = await writeProviderSettings({
      defaultProvider:
        typeof body.defaultProvider === "string"
          ? body.defaultProvider
          : providerRegistry.defaultProvider,
      disabledProviderIds: Array.isArray(body.disabledProviderIds)
        ? body.disabledProviderIds.filter((value: unknown): value is string => typeof value === "string")
        : [],
    });

    return NextResponse.json({
      ok: true,
      settings,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
