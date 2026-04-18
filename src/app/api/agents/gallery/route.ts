import { createGetHandler } from "@/lib/http/create-handler";
import { listGalleryItems } from "@/lib/agents/persona/gallery";

export const GET = createGetHandler({
  handler: async () => ({ items: await listGalleryItems() }),
});
