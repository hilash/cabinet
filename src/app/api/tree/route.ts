import { buildTree } from "@/lib/storage/tree-builder";
import { ensureDataDir } from "@/lib/storage/fs-operations";
import {
  HttpError,
  createGetHandler,
} from "@/lib/http/create-handler";

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error";
}

export const GET = createGetHandler({
  handler: async () => {
    try {
      await ensureDataDir();
      return await buildTree();
    } catch (error) {
      throw new HttpError(500, getErrorMessage(error));
    }
  },
});
