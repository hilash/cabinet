import { NextResponse } from "next/server";
import { providerRegistry } from "@/lib/agents/provider-registry";

export async function GET() {
  try {
    const providers = providerRegistry.listAll();

    const results = await Promise.all(
      providers.map(async (p) => {
        const status = await p.healthCheck();
        return {
          id: p.id,
          name: p.name,
          type: p.type,
          icon: p.icon,
          ...status,
        };
      })
    );

    return NextResponse.json({
      providers: results,
      defaultProvider: providerRegistry.defaultProvider,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
