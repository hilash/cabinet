import { NextRequest, NextResponse } from "next/server";
import {
  KB_AUTH_COOKIE,
  deriveAuthToken,
  expectedToken,
  getAuthSalt,
  isAuthEnabled,
  timingSafeEqualHex,
} from "@/lib/auth/kb-auth";
import {
  clientKeyFromForwardedFor,
  getLoginRateLimitStatus,
  recordFailedLogin,
  resetLoginFailures,
} from "@/lib/auth/login-rate-limit";

// Native form posts expect a redirect. Emit a RELATIVE Location: the browser
// resolves it against the address-bar origin, so it lands back on whatever host
// the user actually used (localhost / LAN / Tailscale) — WITHOUT trusting
// attacker-spoofable Host / X-Forwarded-Host headers, and without breaking on
// multi-hop proxies that append comma-separated forwarded values. The path is a
// fixed in-app route, so there is no open-redirect surface.
function seeOther(path: string): NextResponse {
  return new NextResponse(null, { status: 303, headers: { Location: path } });
}

function tooManyAttempts(isForm: boolean, retryAfterSec: number): NextResponse {
  if (isForm) {
    const res = seeOther("/login?error=rate");
    res.headers.set("Retry-After", String(retryAfterSec));
    return res;
  }
  return NextResponse.json(
    { error: "Too many attempts", retryAfter: retryAfterSec },
    { status: 429, headers: { "Retry-After": String(retryAfterSec) } },
  );
}

export async function POST(req: NextRequest) {
  // Native form posts arrive with Content-Type: application/x-www-form-urlencoded
  // and expect a redirect; JS fetch posts JSON and expects a JSON reply.
  const contentType = req.headers.get("content-type") || "";
  const isForm = contentType.includes("application/x-www-form-urlencoded");

  // Auth disabled — accept without parsing the body or deriving anything.
  if (!isAuthEnabled()) {
    return isForm ? seeOther("/") : NextResponse.json({ ok: true });
  }

  // Best-effort per-client key from the first X-Forwarded-For hop (spoofable on
  // direct access — the global bucket inside the limiter is the real guarantee).
  const clientKey = clientKeyFromForwardedFor(req.headers.get("x-forwarded-for"));

  // Already locked out → reject cheaply, before parsing the body or running
  // PBKDF2, so a flood of over-limit requests stays inexpensive.
  const pre = getLoginRateLimitStatus(clientKey);
  if (pre.limited) {
    return tooManyAttempts(isForm, pre.retryAfterSec);
  }

  let password = "";
  if (isForm) {
    const form = await req.formData();
    password = (form.get("password") as string) || "";
  } else {
    const body = await req.json().catch(() => ({} as { password?: string }));
    password = body.password || "";
  }

  // Derive the candidate token (slow PBKDF2 — intentional per-attempt cost) and
  // compare constant-time against the expected (memoized) token. Replaces the
  // old plaintext `password !== KB_PASSWORD`, so each guess is expensive and the
  // comparison leaks no timing about how many chars matched.
  const candidate = await deriveAuthToken(password, getAuthSalt());
  const ok = timingSafeEqualHex(candidate, await expectedToken());

  if (!ok) {
    recordFailedLogin(clientKey);
    return isForm
      ? seeOther("/login?error=1")
      : NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  // Success: clear this client's failure budget, then mint the cookie (reuse the
  // derived token) and 303 to "/" (form) so the browser commits the cookie
  // before navigating.
  resetLoginFailures(clientKey);
  const res = isForm ? seeOther("/") : NextResponse.json({ ok: true });
  res.cookies.set(KB_AUTH_COOKIE, candidate, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production" && process.env.KB_ALLOW_HTTP !== "1",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
  return res;
}
