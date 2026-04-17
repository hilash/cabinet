import { exec } from "child_process";
import { resolveContentPath } from "@/lib/storage/path-utils";
import { fileExists } from "@/lib/storage/fs-operations";
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
      const { path: filePath } = await req.json();
      if (typeof filePath !== "string" || !filePath) {
        throw new HttpError(400, "Missing path");
      }

      const resolved = resolveContentPath(filePath);
      if (!(await fileExists(resolved))) {
        throw new HttpError(404, "File not found");
      }

      // macOS: reveal in Finder. On other platforms this is a no-op.
      if (process.platform === "darwin") {
        exec(`open -R "${resolved}"`);
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
