/**
 * Route handler wrapper — identity in OSS, replaced by the cloud edition.
 *
 * Cabinet OSS uses this as a no-op. Multi-tenant editions (Cabinet Cloud)
 * override this file to wrap each handler invocation in `withTenantContext`,
 * which establishes per-request `AsyncLocalStorage` scope so cabinet's lib
 * code (`getDataDir()`, etc.) can read the tenant id synchronously.
 *
 * Usage at the top of every API route:
 *
 *   import { route } from "@/lib/runtime/route-wrapper";
 *   export const POST = route(async (req: NextRequest) => { ... });
 *
 * In OSS this collapses to `export const POST = handler` at runtime.
 */

import type { NextRequest, NextResponse } from "next/server";

type RouteHandler<Args extends unknown[]> = (
  req: NextRequest,
  ...args: Args
) => Promise<Response | NextResponse>;

export function route<Args extends unknown[]>(
  handler: RouteHandler<Args>
): RouteHandler<Args> {
  return handler;
}
