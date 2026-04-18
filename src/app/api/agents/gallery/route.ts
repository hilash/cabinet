import { createGetHandler } from "@/lib/http/create-handler";
import { listGalleryItems } from "@/lib/agents/gallery";

export const GET = createGetHandler({
  handler: async () => ({ items: await listGalleryItems() }),
});
