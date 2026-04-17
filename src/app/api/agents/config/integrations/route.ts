import {
  parseIntegrationConfig,
  type CabinetIntegrationConfig,
} from "@/lib/config/schema";
import { ZodError } from "zod";
import { redactSecrets, restoreRedactedSecrets } from "@/lib/config/redact";
import { DATA_DIR } from "@/lib/storage/path-utils";
import { loadCabinetConfig, saveCabinetConfig } from "@/lib/config/cabinet-config";
import {
  HttpError,
  createGetHandler,
  createHandler,
} from "@/lib/http/create-handler";

export type IntegrationConfig = CabinetIntegrationConfig;

export const GET = createGetHandler({
  handler: async () => {
    const config = await loadCabinetConfig(DATA_DIR);
    return redactSecrets(config.integrations);
  },
});

export const PUT = createHandler({
  handler: async (_input, req) => {
    const body = await req.json();
    const current = await loadCabinetConfig(DATA_DIR);
    const restored = restoreRedactedSecrets(
      current.integrations as unknown as Record<string, unknown>,
      body,
    ) as Partial<IntegrationConfig>;

    const merged: IntegrationConfig = {
      mcp_servers: { ...current.integrations.mcp_servers, ...restored?.mcp_servers },
      notifications: { ...current.integrations.notifications, ...restored?.notifications },
    };

    let validated: CabinetIntegrationConfig;
    try {
      validated = parseIntegrationConfig(merged);
    } catch (err) {
      if (err instanceof ZodError) {
        throw new HttpError(
          400,
          `Invalid integration config: ${err.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`).join("; ")}`,
        );
      }
      throw err;
    }

    try {
      await saveCabinetConfig(DATA_DIR, { ...current, integrations: validated });
    } catch (err) {
      throw new HttpError(500, String(err));
    }

    return { ok: true };
  },
});
