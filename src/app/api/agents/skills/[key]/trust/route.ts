import { NextResponse } from "next/server";
import { readSkill } from "@/lib/agents/skills/loader";
import {
  loadCabinetTrustDecisions,
  saveCabinetTrustDecision,
  type CabinetTrustEntry,
} from "@/lib/agents/skills/trust";

interface RouteContext {
  params: Promise<{ key: string }>;
}

interface TrustRequest {
  status: "approved" | "revoked";
  cabinetPath?: string | null;
  reason?: string;
  decidedBy?: string;
}

export async function GET(request: Request, context: RouteContext): Promise<NextResponse> {
  const { key } = await context.params;
  const url = new URL(request.url);
  const cabinetPath = url.searchParams.get("cabinet") || null;
  const trust = await loadCabinetTrustDecisions(cabinetPath);
  return NextResponse.json({ key, decision: trust.decisions[key] ?? null });
}

export async function POST(request: Request, context: RouteContext): Promise<NextResponse> {
  const { key } = await context.params;
  const body = (await request.json().catch(() => ({}))) as TrustRequest;
  if (body.status !== "approved" && body.status !== "revoked") {
    return NextResponse.json(
      { error: "status must be 'approved' or 'revoked'" },
      { status: 400 },
    );
  }
  // Confirm the skill exists somewhere.
  const skill = await readSkill(key, { cabinetPath: body.cabinetPath ?? undefined });
  if (!skill) {
    return NextResponse.json({ error: "skill not found" }, { status: 404 });
  }

  const entry: CabinetTrustEntry = {
    status: body.status,
    decidedAt: new Date().toISOString(),
    decidedBy: body.decidedBy,
    reason: body.reason,
  };
  await saveCabinetTrustDecision(body.cabinetPath ?? null, key, entry);
  return NextResponse.json({ ok: true, key, decision: entry });
}
