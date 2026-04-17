import { NextRequest, NextResponse } from "next/server";
import { verifyPassword } from "@/lib/auth/password-hash";

export const runtime = "nodejs";

export async function middleware(req: NextRequest) {
  const password = process.env.KB_PASSWORD || "";

  if (!password) {
    return NextResponse.next();
  }

  const { pathname } = req.nextUrl;

  if (pathname === "/login" || pathname === "/api/auth/login" || pathname === "/api/auth/check") {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/health")) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/multica-api/") || pathname.startsWith("/multica-auth/")) {
    return NextResponse.next();
  }

  const token = req.cookies.get("kb-auth")?.value;
  const authenticated = token ? await verifyPassword(password, token) : false;

  if (!authenticated) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
