import { NextResponse } from "next/server";
import { getOrCreateDaemonToken } from "@/lib/agents/daemon-auth";
import { getPublicDaemonWsOrigin } from "@/lib/runtime/runtime-config";
import {
  restrictedCustomerModeResponse,
} from "@/lib/optale/restricted-customer-mode";
import { isOptaleRestrictedCustomerMode } from "@/lib/optale/runtime-mode";

export async function GET() {
  if (isOptaleRestrictedCustomerMode()) {
    return restrictedCustomerModeResponse(
      "daemon.auth_token",
      "Raw daemon tokens are operator-only and are not exposed in restricted customer mode.",
    );
  }

  const token = await getOrCreateDaemonToken();
  return NextResponse.json({ token, wsOrigin: getPublicDaemonWsOrigin() });
}
