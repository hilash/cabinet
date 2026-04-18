import { HttpError, createHandler } from "@/lib/http/create-handler";
import { importAgentBundle } from "@/lib/agents/import-bundle";

export const POST = createHandler({
  handler: async (_input, req) => {
    try {
      const bundle = await req.json();
      const { slug, displayName } = await importAgentBundle(bundle);
      return {
        success: true,
        slug,
        message: `Agent "${displayName}" imported successfully (paused by default).`,
      };
    } catch (err) {
      if (err instanceof HttpError) throw err;
      throw new HttpError(
        500,
        `Import failed: ${err instanceof Error ? err.message : "unknown error"}`,
      );
    }
  },
});
