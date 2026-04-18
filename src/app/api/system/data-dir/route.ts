import { DATA_DIR } from "@/lib/storage/path-utils";
import {
  clearPersistedDataDir,
  setPersistedDataDir,
} from "@/lib/system/install-config";
import {
  HttpError,
  createGetHandler,
  createHandler,
} from "@/lib/http/create-handler";

export const dynamic = "force-dynamic";

export const GET = createGetHandler({
  handler: async () => ({ dataDir: DATA_DIR }),
});

export const PUT = createHandler({
  handler: async (_input, req) => {
    const body = await req.json();
    const newDir = body.dataDir?.trim();
    if (!newDir) {
      throw new HttpError(400, "dataDir is required");
    }

    try {
      const resolved = await setPersistedDataDir(newDir);
      return { ok: true, dataDir: resolved, restartRequired: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      throw new HttpError(
        message === "Path must be an existing directory." ? 400 : 500,
        message,
      );
    }
  },
});

export const DELETE = createGetHandler({
  handler: async () => {
    try {
      await clearPersistedDataDir();
      return { ok: true, restartRequired: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      throw new HttpError(500, message);
    }
  },
});
