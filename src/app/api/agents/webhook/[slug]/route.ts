import { NextRequest, NextResponse } from "next/server";
import { emitWebhook } from "@/lib/agents/trigger-engine";

type RouteParams = { params: Promise<{ slug: string }> };

/**
 * POST /api/agents/webhook/:slug — external webhook to trigger a play
 *
 * External services (GitHub, Slack, etc.) can POST to this URL to trigger
 * a specific play. The request body is passed as payload to the trigger engine.
 *
 * Example:
 *   curl -X POST http://localhost:3000/api/agents/webhook/code-reviewer \
 *     -H "Content-Type: application/json" \
 *     -d '{"repo": "amazingg-ai/gpu-emulator", "pr": 42}'
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params;
    let payload: Record<string, unknown> = {};

    try {
      payload = await req.json();
    } catch {
      // No body or invalid JSON is fine — webhook can be a simple ping
    }

    const entries = await emitWebhook(slug, payload);
    const triggered = entries.filter((e) => e.fired).length;

    return NextResponse.json({
      ok: true,
      play: slug,
      triggered,
      entries,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * GET /api/agents/webhook/:slug — health check / info
 */
export async function GET(_req: NextRequest, { params }: RouteParams) {
  const { slug } = await params;
  return NextResponse.json({
    play: slug,
    webhook_url: `/api/agents/webhook/${slug}`,
    method: "POST",
    description: `Webhook endpoint to trigger the "${slug}" play. POST with optional JSON body.`,
  });
}
