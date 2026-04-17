import { createHandler } from "@/lib/http/create-handler";
import { markdownToHtml } from "@/lib/markdown/to-html";

export const POST = createHandler({
  handler: async (_input, req) => {
    try {
      const { markdown } = await req.json();
      if (!markdown) return { html: "" };
      const html = await markdownToHtml(markdown);
      return { html };
    } catch {
      return { html: "" };
    }
  },
});
