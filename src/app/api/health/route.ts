import { DATA_DIR } from "@/lib/storage/path-utils";
import {
  detectInstallKind,
  readInstallMetadata,
} from "@/lib/system/install-metadata";
import { readBundledReleaseManifest } from "@/lib/system/release-manifest";
import { createGetHandler } from "@/lib/http/create-handler";

export const dynamic = "force-dynamic";

export const GET = createGetHandler({
  handler: async () => {
    const [metadata, manifest] = await Promise.all([
      readInstallMetadata(),
      readBundledReleaseManifest(),
    ]);

    return {
      status: "ok",
      timestamp: new Date().toISOString(),
      version: manifest.version,
      installKind: detectInstallKind(metadata),
      dataDir: DATA_DIR,
    };
  },
});
