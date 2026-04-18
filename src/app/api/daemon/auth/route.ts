import { NextRequest } from "next/server";
import { getOrCreateDaemonToken } from "@/lib/agents/runtime/daemon-auth";
import { getPublicDaemonWsOrigin } from "@/lib/runtime/runtime-config";
import {
  HttpError,
  createGetHandler,
} from "@/lib/http/create-handler";

function getClientIp(request: NextRequest): string | null {
  const nextRequest = request as NextRequest & { ip?: string | null };
  if (typeof nextRequest.ip === "string" && nextRequest.ip.trim()) {
    return nextRequest.ip.trim();
  }

  const forwardedFor = request.headers.get("x-forwarded-for");
  if (!forwardedFor) {
    return null;
  }

  const [firstIp] = forwardedFor.split(",", 1);
  return firstIp?.trim() || null;
}

function isLoopbackIp(ip: string): boolean {
  const normalized = ip.trim().toLowerCase();
  return normalized === "127.0.0.1" || normalized === "::1" || normalized === "::ffff:127.0.0.1";
}

export async function GET(request: NextRequest) {
  return createGetHandler({
    handler: async () => {
      const clientIp = getClientIp(request);

      // Local-only tool: if Next.js exposes a client IP (or forwarded loopback IP), require loopback.
      // When local Electron requests do not include source IP metadata, stay permissive rather than
      // trusting the client-controlled Host header.
      if (clientIp && !isLoopbackIp(clientIp)) {
        throw new HttpError(403, "Forbidden");
      }

      const token = await getOrCreateDaemonToken();
      return { token, wsOrigin: getPublicDaemonWsOrigin() };
    },
  })(request);
}
