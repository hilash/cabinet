import { NextResponse } from "next/server";
import { DATA_DIR } from "@/lib/storage/path-utils";
import { providerRegistry } from "@/lib/agents/provider-registry";
import { probeProviderSessionOptions } from "@/lib/agents/provider-runtime";
import { getConfiguredProviderModel, readProviderSettings } from "@/lib/agents/provider-settings";

type RouteParams = { params: Promise<{ providerId: string }> };

export async function GET(_req: Request, { params }: RouteParams) {
  const { providerId } = await params;
  const provider = providerRegistry.get(providerId);
  if (!provider) {
    return NextResponse.json({ error: "Provider not found" }, { status: 404 });
  }

  try {
    const settings = await readProviderSettings();
    const probe = await probeProviderSessionOptions({
      providerId,
      cwd: DATA_DIR,
      allowedRoots: [DATA_DIR],
    });
    const configuredModel = getConfiguredProviderModel(providerId, settings);

    return NextResponse.json({
      providerId,
      supportsModelSelection: (probe.modelMetadata?.options.length || 0) > 0,
      modelOptions: probe.modelMetadata?.options || [],
      currentModelId: probe.modelMetadata?.currentModelId,
      configuredModel,
      effectiveModelId: configuredModel || probe.modelMetadata?.currentModelId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load provider model options";
    return NextResponse.json({
      providerId,
      supportsModelSelection: false,
      modelOptions: [],
      error: message,
    }, { status: 500 });
  }
}
