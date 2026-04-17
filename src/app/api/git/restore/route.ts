import { restoreFileFromCommit } from "@/lib/git/git-service";
import path from "path";
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
      const { hash, pagePath } = await req.json();
      if (!hash || !pagePath) {
        throw new HttpError(400, "hash and pagePath are required");
      }

      // Try both directory index.md and standalone .md
      const candidates = [
        path.join(pagePath, "index.md"),
        `${pagePath}.md`,
      ];

      let restored = false;
      for (const candidate of candidates) {
        restored = await restoreFileFromCommit(hash, candidate);
        if (restored) break;
      }

      if (!restored) {
        throw new HttpError(404, "Failed to restore — file may not exist at that commit");
      }

      return { ok: true };
    } catch (error) {
      if (error instanceof HttpError) {
        throw error;
      }

      throw new HttpError(500, getErrorMessage(error));
    }
  },
});
