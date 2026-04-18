import { listPersonaWorkspaceFiles } from "@/lib/agents/persona-manager";
import {
  HttpError,
  createGetHandler,
} from "@/lib/http/create-handler";
import { assertValidSlug } from "@/lib/agents/persona/slug-utils";

type RouteParams = { params: Promise<{ slug: string }> };

export async function GET(req: Request, { params }: RouteParams) {
  const { slug } = await params;
  return createGetHandler({
    handler: async () => {
      assertValidSlug(slug);
      const listing = await listPersonaWorkspaceFiles(slug);
      if (!listing) {
        throw new HttpError(404, "Not found");
      }
      return listing;
    },
  })(req);
}
