import { NextRequest, NextResponse } from "next/server";
import {
  KB_AUTH_COOKIE,
  expectedToken,
  isAuthEnabled,
  timingSafeEqualHex,
} from "@/lib/auth/kb-auth";

export async function proxy(req: NextRequest) {
  // Auth disabled — no password set
  if (!isAuthEnabled()) {
    return NextResponse.next();
  }

  const { pathname } = req.nextUrl;

  // Allow login page and login API
  if (pathname === "/login" || pathname === "/api/auth/login" || pathname === "/api/auth/check") {
    return NextResponse.next();
  }

  // Allow health check
  if (pathname.startsWith("/api/health")) {
    return NextResponse.next();
  }

  // Check auth cookie (constant-time; expected token is memoized so this is
  // O(1) per request — PBKDF2 runs once per process, not per request).
  const token = req.cookies.get(KB_AUTH_COOKIE)?.value ?? "";
  const expected = await expectedToken();

  if (!timingSafeEqualHex(token, expected)) {
    // API routes return 401
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // Pages redirect to login
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Protect all routes except static files and Next.js internals
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
