import path from "path";
import { DATA_DIR } from "@/lib/storage/path-utils";
import { runOneShotProviderPrompt } from "@/lib/agents/provider-runtime";
import {
  HttpError,
  createHandler,
} from "@/lib/http/create-handler";

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error";
}

export const POST = createHandler({
  handler: async (_input, req) => {
    try {
      const { prompt, workdir, providerId, captureOutput = true } = await req.json();

      if (!prompt) {
        throw new HttpError(400, "prompt is required");
      }

      const cwd = workdir ? path.join(DATA_DIR, workdir) : DATA_DIR;

      const result = await runOneShotProviderPrompt({
        providerId,
        prompt,
        cwd,
        timeoutMs: 120_000,
      });

      return {
        ok: true,
        output: captureOutput ? result : undefined,
        message: "Completed successfully",
      };
    } catch (error) {
      if (error instanceof HttpError) {
        throw error;
      }

      throw new HttpError(500, getErrorMessage(error));
    }
  },
});
