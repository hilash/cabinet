import { manualCommit, getStatus } from "@/lib/git/git-service";
import {
  HttpError,
  createGetHandler,
  createHandler,
} from "@/lib/http/create-handler";

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error";
}

export const POST = createHandler({
  handler: async (_input, req) => {
    try {
      const body = await req.json();
      const message = body.message || "Manual commit from KB";
      const committed = await manualCommit(message);
      return { ok: true, committed };
    } catch (error) {
      throw new HttpError(500, getErrorMessage(error));
    }
  },
});

export const GET = createGetHandler({
  handler: async () => {
    try {
      return await getStatus();
    } catch (error) {
      throw new HttpError(500, getErrorMessage(error));
    }
  },
});
