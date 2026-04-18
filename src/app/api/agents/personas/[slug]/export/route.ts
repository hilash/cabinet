import { NextRequest, NextResponse } from "next/server";
import { exportPersonaBundle } from "@/lib/agents/persona/persona-manager";
import { HttpError } from "@/lib/http/create-handler";
import { assertValidSlug } from "@/lib/agents/persona/slug-utils";

type RouteParams = { params: Promise<{ slug: string }> };

export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params;
    assertValidSlug(slug);

    const bundle = await exportPersonaBundle(slug);
    if (!bundle) {
      return NextResponse.json({ error: "Agent file not found" }, { status: 404 });
    }

    return NextResponse.json(bundle, {
      headers: {
        "Content-Disposition": `attachment; filename="${slug}-agent-bundle.json"`,
      },
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: "internal_error", message }, { status: 500 });
  }
}
