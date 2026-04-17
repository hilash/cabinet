import { NextResponse } from "next/server";
import { createGetHandler } from "@/lib/http/create-handler";
import { getDaemonUrl } from "@/lib/runtime/runtime-config";

export const dynamic = "force-dynamic";

export const GET = createGetHandler({
  handler: async () => {
    try {
      const res = await fetch(`${getDaemonUrl()}/health`, {
        signal: AbortSignal.timeout(3000),
      });
      if (res.ok) {
        const data = await res.json();
        return { status: "ok", ...data };
      }
      return NextResponse.json({ status: "unreachable" }, { status: 502 });
    } catch {
      return NextResponse.json({ status: "unreachable" }, { status: 502 });
    }
  },
});
