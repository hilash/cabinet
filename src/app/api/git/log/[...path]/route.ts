import { getPageHistory } from "@/lib/git/git-service";
import {
  HttpError,
  createGetHandler,
} from "@/lib/http/create-handler";

type RouteParams = { params: Promise<{ path: string[] }> };

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error";
}

export async function GET(req: Request, { params }: RouteParams) {
  const { path: segments } = await params;
  const virtualPath = segments.join("/");
  return createGetHandler({
    handler: async () => {
      try {
        return await getPageHistory(virtualPath);
      } catch (error) {
        throw new HttpError(500, getErrorMessage(error));
      }
    },
  })(req);
}
