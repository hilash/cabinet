import path from "path";
import { readPage, writePage } from "@/lib/storage/page-io";
import { fileExists, writeFileContent } from "@/lib/storage/fs-operations";
import { DATA_DIR } from "@/lib/storage/path-utils";
import { autoCommit } from "@/lib/git/git-service";
import {
  HttpError,
  createGetHandler,
  createHandler,
} from "@/lib/http/create-handler";

const ROOT_INDEX = path.join(DATA_DIR, "index.md");

async function ensureRootIndex() {
  if (!(await fileExists(ROOT_INDEX))) {
    const now = new Date().toISOString();
    await writeFileContent(
      ROOT_INDEX,
      `---\ntitle: Knowledge Base\ncreated: "${now}"\nmodified: "${now}"\ntags: []\n---\n`
    );
  }
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error";
}

export const GET = createGetHandler({
  handler: async () => {
    try {
      await ensureRootIndex();
      return await readPage("");
    } catch (error) {
      const message = getErrorMessage(error);
      throw new HttpError(message.includes("not found") ? 404 : 500, message);
    }
  },
});

export const PUT = createHandler({
  handler: async (_input, req) => {
    try {
      const body = await req.json();
      await writePage("", body.content, body.frontmatter);
      autoCommit("", "Update");
      return { ok: true };
    } catch (error) {
      throw new HttpError(500, getErrorMessage(error));
    }
  },
});
