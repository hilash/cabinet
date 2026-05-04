import { NextRequest, NextResponse } from "next/server";
import { parseCabinetVisibilityMode } from "@/lib/cabinets/visibility";
import { requireOptaleControlPlaneRequest } from "@/lib/optale/control-plane-auth";
import { restrictedCustomerVisibilityMode } from "@/lib/optale/restricted-customer-mode";
import { readOptaleAuditEventLog } from "@/lib/optale/audit-event-log";

export const dynamic = "force-dynamic";

function trimString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export async function GET(request: NextRequest) {
  const unauthorized = await requireOptaleControlPlaneRequest(request);
  if (unauthorized) return unauthorized;

  const limit = Number.parseInt(
    request.nextUrl.searchParams.get("limit") || "250",
    10,
  );
  const log = await readOptaleAuditEventLog({
    cabinetPath:
      trimString(request.nextUrl.searchParams.get("cabinetPath")) ||
      trimString(request.nextUrl.searchParams.get("path")),
    visibilityMode: restrictedCustomerVisibilityMode(
      parseCabinetVisibilityMode(
        request.nextUrl.searchParams.get("visibilityMode") ||
          request.nextUrl.searchParams.get("visibility"),
      ),
    ),
    limit: Number.isFinite(limit) ? limit : 250,
  });

  return NextResponse.json(log, {
    headers: { "Cache-Control": "no-store" },
  });
}
