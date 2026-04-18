import { NextRequest, NextResponse } from "next/server";
import { exportPersonaBundle } from "@/lib/agents/persona/persona-manager";
import {
  createGetHandler,
  HttpError,
} from "@/lib/http/create-handler";
import { assertValidSlug } from "@/lib/agents/persona/slug-utils";

type RouteParams = { params: Promise<{ slug: string }> };

export async function GET(req: NextRequest, { params }: RouteParams) {
  const { slug } = await params;
  return createGetHandler({
    handler: async () => {
      assertValidSlug(slug);

      const bundle = await exportPersonaBundle(slug);
      if (!bundle) {
        throw new HttpError(404, "Agent file not found");
      }

      return NextResponse.json(bundle, {
        headers: {
          "Content-Disposition": `attachment; filename="${slug}-agent-bundle.json"`,
        },
      });
    },
  })(req);
}
