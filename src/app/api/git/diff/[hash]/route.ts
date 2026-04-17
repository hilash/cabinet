import { getDiff } from "@/lib/git/git-service";
import {
  HttpError,
  createGetHandler,
} from "@/lib/http/create-handler";

type RouteParams = { params: Promise<{ hash: string }> };

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error";
}

export async function GET(req: Request, { params }: RouteParams) {
  const { hash } = await params;
  return createGetHandler({
    handler: async () => {
      try {
        const diff = await getDiff(hash);
        return { diff };
      } catch (error) {
        throw new HttpError(500, getErrorMessage(error));
      }
    },
  })(req);
}
