import { NextResponse } from "next/server";
import { listDaemonSessions } from "@/lib/agents/daemon-client";
import { hasOptaleCapability } from "@/lib/optale/capabilities";
import { restrictedCustomerModeResponse } from "@/lib/optale/restricted-customer-mode";

export async function GET() {
  if (!hasOptaleCapability("diagnostics.raw")) {
    return restrictedCustomerModeResponse(
      "daemon.sessions",
      "Raw daemon session diagnostics are operator-only in the partner-safe desktop profile.",
    );
  }

  try {
    const sessions = await listDaemonSessions();
    return NextResponse.json(sessions);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to list daemon sessions";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
