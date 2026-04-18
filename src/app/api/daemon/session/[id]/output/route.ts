import { getDaemonSessionOutput } from "@/lib/agents/runtime/daemon-client";
import {
  HttpError,
  createGetHandler,
} from "@/lib/http/create-handler";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(
  req: Request,
  { params }: RouteParams
) {
  const { id } = await params;
  return createGetHandler({
    handler: async () => {
      try {
        return await getDaemonSessionOutput(id);
      } catch (error) {
        throw new HttpError(
          500,
          error instanceof Error ? error.message : "Failed to load daemon output"
        );
      }
    },
  })(req);
}
