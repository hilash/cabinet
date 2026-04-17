import { createHandler, HttpError } from "@/lib/http/create-handler";
import { gitPull } from "@/lib/git/git-service";

export const POST = createHandler({
  handler: async () => {
    try {
      return await gitPull();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      throw new HttpError(500, message);
    }
  },
});
