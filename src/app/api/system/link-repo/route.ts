import {
  linkRepoAsKnowledgeFolder,
  type LinkRepoRequest,
} from "@/lib/knowledge/link-repo";
import { HttpError, createHandler } from "@/lib/http/create-handler";

export const dynamic = "force-dynamic";

export const POST = createHandler({
  handler: async (_input, req) => {
    const body = (await req.json()) as LinkRepoRequest;
    try {
      const result = await linkRepoAsKnowledgeFolder(body);
      return { ok: true, ...result };
    } catch (error) {
      if (error instanceof HttpError) throw error;
      const message = error instanceof Error ? error.message : "Unknown error";
      throw new HttpError(500, message);
    }
  },
});
