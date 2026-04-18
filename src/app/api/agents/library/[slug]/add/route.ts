import { NextRequest } from "next/server";
import { createHandler } from "@/lib/http/create-handler";
import { instantiateFromLibrary } from "@/lib/agents/library";

type RouteParams = { params: Promise<{ slug: string }> };

export async function POST(req: NextRequest, { params }: RouteParams) {
  const { slug } = await params;
  return createHandler({
    handler: async () => {
      await instantiateFromLibrary(slug);
      return { ok: true, slug };
    },
  })(req);
}
