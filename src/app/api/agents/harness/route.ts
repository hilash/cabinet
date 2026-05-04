import { NextResponse } from "next/server";
import { buildAgentHarnessAdminSnapshot } from "@/lib/optale/agent-harness/admin-status";
import {
  restrictedCapabilityDenial,
  restrictedModeDenialResponse,
} from "@/lib/optale/restricted-customer-mode";

export async function GET() {
  const restricted = restrictedModeDenialResponse(
    restrictedCapabilityDenial("diagnostics.raw"),
  );
  if (restricted) return restricted;

  const snapshot = await buildAgentHarnessAdminSnapshot();
  return NextResponse.json(snapshot);
}
