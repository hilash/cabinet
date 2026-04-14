import { NextRequest, NextResponse } from "next/server";

async function hashToken(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + "cabinet-salt");
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function proxy(req: NextRequest) {
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
  const expected = await hashToken(password);

  if (token !== expected) {
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
