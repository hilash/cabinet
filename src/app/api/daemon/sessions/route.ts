import { listDaemonSessions } from "@/lib/agents/daemon-client";
import {
  HttpError,
  createGetHandler,
} from "@/lib/http/create-handler";

export const GET = createGetHandler({
  handler: async () => {
    try {
      return await listDaemonSessions();
    } catch (error) {
      throw new HttpError(
        500,
        error instanceof Error ? error.message : "Failed to list daemon sessions"
      );
    }
  },
});
