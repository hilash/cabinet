import { providerRegistry } from "@/lib/agents/provider-registry";
import {
  HttpError,
  createGetHandler,
} from "@/lib/http/create-handler";

export const dynamic = "force-dynamic";

interface CachedStatus {
  providers: { id: string; name: string; available: boolean; authenticated: boolean }[];
  anyReady: boolean;
}

let cachedResult: CachedStatus | null = null;
let cachedAt = 0;
const CACHE_TTL = 30_000;

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error";
}

export const GET = createGetHandler({
  handler: async () => {
    try {
      const now = Date.now();
      if (cachedResult && now - cachedAt < CACHE_TTL) {
        return cachedResult;
      }

      const providers = providerRegistry.listAll();
      const results = await Promise.all(
        providers.map(async (p) => {
          const status = await p.healthCheck();
          return {
            id: p.id,
            name: p.name,
            available: status.available,
            authenticated: status.authenticated,
          };
        }),
      );

      const response: CachedStatus = {
        providers: results,
        anyReady: results.some((p) => p.available && p.authenticated),
      };

      cachedResult = response;
      cachedAt = now;

      return response;
    } catch (error) {
      throw new HttpError(500, getErrorMessage(error));
    }
  },
});
