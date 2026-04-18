import { createGetHandler } from "@/lib/http/create-handler";
import { listLibraryTemplates } from "@/lib/agents/library";

export const GET = createGetHandler({
  handler: async () => ({ templates: await listLibraryTemplates() }),
});
