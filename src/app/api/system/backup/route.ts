import { createDataBackup, createProjectSnapshotBackup } from "@/lib/system/backup";
import {
  HttpError,
  createHandler,
} from "@/lib/http/create-handler";

export const dynamic = "force-dynamic";

export const POST = createHandler({
  handler: async (_input, req) => {
    try {
      const body = (await req.json().catch(() => ({}))) as { scope?: "data" | "project" };
      const scope = body.scope === "project" ? "project" : "data";
      const backupPath =
        scope === "project"
          ? await createProjectSnapshotBackup("manual-project-backup")
          : await createDataBackup("manual-data-backup");

      return { ok: true, scope, backupPath };
    } catch (error) {
      throw new HttpError(
        500,
        error instanceof Error ? error.message : "Backup failed"
      );
    }
  },
});
