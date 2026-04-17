import fs from "fs/promises";
import path from "path";
import { DATA_DIR } from "@/lib/storage/path-utils";
import { INSTALL_CONFIG_PATH } from "@/lib/runtime/runtime-config";
import {
  HttpError,
  createGetHandler,
  createHandler,
} from "@/lib/http/create-handler";

export const dynamic = "force-dynamic";

/** GET — return the current data directory */
export const GET = createGetHandler({
  handler: async () => ({ dataDir: DATA_DIR }),
});

/** PUT — persist a new data directory (requires restart) */
function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error";
}

export const PUT = createHandler({
  handler: async (_input, req) => {
    try {
      const body = await req.json();
      const newDir = body.dataDir?.trim();

      if (!newDir) {
        throw new HttpError(400, "dataDir is required");
      }

      const resolved = path.resolve(newDir);

      // Verify the directory exists
      const stat = await fs.stat(resolved).catch(() => null);
      if (!stat || !stat.isDirectory()) {
        throw new HttpError(400, "Path must be an existing directory.");
      }

      // Read existing config, merge in the new dataDir
      let config: Record<string, unknown> = {};
      try {
        const raw = await fs.readFile(INSTALL_CONFIG_PATH, "utf-8");
        config = JSON.parse(raw);
      } catch {
        // File doesn't exist or is invalid — start fresh
      }

      config.dataDir = resolved;

      await fs.writeFile(
        INSTALL_CONFIG_PATH,
        JSON.stringify(config, null, 2) + "\n",
        "utf-8"
      );

      return {
        ok: true,
        dataDir: resolved,
        restartRequired: true,
      };
    } catch (error) {
      if (error instanceof HttpError) {
        throw error;
      }

      throw new HttpError(500, getErrorMessage(error));
    }
  },
});

/** DELETE — remove persisted data dir (revert to default, requires restart) */
export const DELETE = createGetHandler({
  handler: async () => {
    try {
      let config: Record<string, unknown> = {};
      try {
        const raw = await fs.readFile(INSTALL_CONFIG_PATH, "utf-8");
        config = JSON.parse(raw);
      } catch {
        return { ok: true };
      }

      delete config.dataDir;

      if (Object.keys(config).length === 0) {
        await fs.unlink(INSTALL_CONFIG_PATH).catch(() => {});
      } else {
        await fs.writeFile(
          INSTALL_CONFIG_PATH,
          JSON.stringify(config, null, 2) + "\n",
          "utf-8"
        );
      }

      return { ok: true, restartRequired: true };
    } catch (error) {
      throw new HttpError(500, getErrorMessage(error));
    }
  },
});
