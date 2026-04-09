import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { betterFetch } from "@better-fetch/fetch";

const PUBLIC_PREFIXES = ["/login", "/api/auth", "/api/health", "/_next", "/favicon"];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

async function hashToken(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + "cabinet-salt");
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicPath(pathname)) return NextResponse.next();

  const hasOAuth = !!(process.env.GOOGLE_CLIENT_ID || process.env.GITHUB_CLIENT_ID);
  const legacyPassword = process.env.KB_PASSWORD ?? "";

  // Legacy mode: KB_PASSWORD set, no OAuth configured
  if (legacyPassword && !hasOAuth) {
    const token = request.cookies.get("kb-auth")?.value;
    const expected = await hashToken(legacyPassword);
    if (token !== expected) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return NextResponse.next();
  }

  // No auth configured — open access
  if (!legacyPassword && !hasOAuth) return NextResponse.next();

  // OAuth mode: validate better-auth session via lightweight fetch to own endpoint
  const { data: session } = await betterFetch<{ user: { id: string } }>(
    "/api/auth/get-session",
    {
      baseURL: request.nextUrl.origin,
      headers: { cookie: request.headers.get("cookie") ?? "" },
    }
  );

  if (!session?.user) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
