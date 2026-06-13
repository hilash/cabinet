import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const KB_PASSWORD = process.env.KB_PASSWORD || "";
const AUTH_ENABLED = KB_PASSWORD.length > 0;

async function hashToken(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + "cabinet-salt");
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

function publicHost(req: NextRequest): string {
  // Prefer X-Forwarded-Host (proxy chains), then Host (raw), then fall back
  // to whatever nextUrl knows about. Cabinet runs Next behind src/proxy.ts
  // which rewrites the inner host to 127.0.0.1, so we must read the
  // outer header explicitly to preserve the original URL on redirects.
  const xfh = req.headers.get("x-forwarded-host");
  if (xfh) return xfh;
  const host = req.headers.get("host");
  if (host) return host;
  return req.nextUrl.host;
}

function publicOrigin(req: NextRequest): string {
  const proto = req.headers.get("x-forwarded-proto") || req.nextUrl.protocol.replace(/:$/, "");
  return `${proto}://${publicHost(req)}`;
}

export async function POST(req: NextRequest) {
  // Native form posts arrive with Content-Type: application/x-www-form-urlencoded
  // and expect a redirect; JS fetch posts JSON and expects a JSON reply.
  const contentType = req.headers.get("content-type") || "";
  const isForm = contentType.includes("application/x-www-form-urlencoded");

  let password = "";
  if (isForm) {
    const form = await req.formData();
    password = (form.get("password") as string) || "";
  } else {
    const body = await req.json().catch(() => ({} as { password?: string }));
    password = body.password || "";
  }

  if (!AUTH_ENABLED) {
    if (isForm) {
      return NextResponse.redirect(`${publicOrigin(req)}/`, { status: 303 });
    }
    return NextResponse.json({ ok: true });
  }

  if (password !== KB_PASSWORD) {
    if (isForm) {
      return NextResponse.redirect(`${publicOrigin(req)}/login?error=1`, { status: 303 });
    }
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  const token = await hashToken(password);
  const cookieStore = await cookies();
  cookieStore.set("kb-auth", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production" && process.env.KB_ALLOW_HTTP !== "1",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });

  if (isForm) {
    // 303 + Set-Cookie + Location → browser commits cookie and follows the
    // redirect to "/" with the cookie attached. Works without client JS and
    // sidesteps mobile-browser races between fetch-cookie commit and the
    // subsequent client-side navigation. publicOrigin() picks up the
    // browser-visible host from forwarding headers so the redirect points
    // back at the same hostname (Tailscale, LAN, localhost — all work).
    return NextResponse.redirect(`${publicOrigin(req)}/`, { status: 303 });
  }
  return NextResponse.json({ ok: true });
}
