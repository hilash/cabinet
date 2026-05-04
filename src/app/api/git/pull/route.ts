import { NextResponse } from "next/server";
import { gitPull } from "@/lib/git/git-service";
import {
  restrictedCapabilityDenial,
  restrictedModeDenialResponse,
} from "@/lib/optale/restricted-customer-mode";

export async function POST() {
  const restricted = restrictedModeDenialResponse(
    restrictedCapabilityDenial("diagnostics.raw"),
  );
  if (restricted) return restricted;

  try {
    const result = await gitPull();
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ pulled: false, summary: message }, { status: 500 });
  }
}
