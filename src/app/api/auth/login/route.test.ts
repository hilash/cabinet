import test, { before, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { resetLoginRateLimit } from "@/lib/auth/login-rate-limit";

type Route = typeof import("./route");
let route: Route;

before(async () => {
  process.env.KB_PASSWORD = "s3cret";
  // Keep PBKDF2 cheap so the many derivations in these tests stay fast.
  process.env.CABINET_LOGIN_PBKDF2_ITERS = "1";
  // Small lockout threshold so the rate-limit test doesn't need many rounds.
  process.env.CABINET_LOGIN_MAX_ATTEMPTS = "3";
  process.env.CABINET_LOGIN_LOCKOUT_MS = "60000";
  route = await import("./route");
});

// Isolate rate-limit state (global + per-client buckets) between cases.
beforeEach(() => resetLoginRateLimit());

const URL = "http://127.0.0.1:4000/api/auth/login";

function formReq(password: string, headers: Record<string, string> = {}): NextRequest {
  return new NextRequest(URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", ...headers },
    body: new URLSearchParams({ password }).toString(),
  });
}

function jsonReq(password: string, headers: Record<string, string> = {}): NextRequest {
  return new NextRequest(URL, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify({ password }),
  });
}

test("form login: wrong password → 303 to RELATIVE /login?error=1", async () => {
  const res = await route.POST(formReq("nope"));
  assert.equal(res.status, 303);
  assert.equal(res.headers.get("location"), "/login?error=1");
});

test("form login: correct password → 303 to RELATIVE / with HttpOnly auth cookie", async () => {
  const res = await route.POST(formReq("s3cret"));
  assert.equal(res.status, 303);
  assert.equal(res.headers.get("location"), "/");
  const setCookie = res.headers.get("set-cookie") || "";
  assert.match(setCookie, /kb-auth=/);
  assert.match(setCookie, /HttpOnly/i);
});

test("redirect Location ignores spoofed Host / X-Forwarded-Host (no open redirect)", async () => {
  const res = await route.POST(
    formReq("s3cret", {
      "x-forwarded-host": "evil.example.com",
      "x-forwarded-proto": "https",
      host: "evil.example.com",
    })
  );
  const loc = res.headers.get("location") || "";
  assert.equal(loc, "/", "Location must stay a fixed relative path");
  assert.ok(!loc.includes("evil.example.com"), "spoofed host must not reach Location");
});

test("JSON login: correct → ok + cookie; wrong → 401", async () => {
  const ok = await route.POST(jsonReq("s3cret"));
  assert.equal(ok.status, 200);
  assert.match(ok.headers.get("set-cookie") || "", /kb-auth=/);

  const bad = await route.POST(jsonReq("nope"));
  assert.equal(bad.status, 401);
});

test("JSON login: locks out after N failed attempts (429 + Retry-After)", async () => {
  const xff = { "x-forwarded-for": "203.0.113.7" };
  // MAX_ATTEMPTS=3 → first 3 wrong return 401, then the client is locked.
  for (let i = 0; i < 3; i++) {
    const res = await route.POST(jsonReq("nope", xff));
    assert.equal(res.status, 401, `attempt ${i + 1} should be 401`);
  }
  const locked = await route.POST(jsonReq("nope", xff));
  assert.equal(locked.status, 429);
  assert.ok(Number(locked.headers.get("retry-after")) > 0, "Retry-After set");

  // Even the CORRECT password is refused while locked out.
  const lockedCorrect = await route.POST(jsonReq("s3cret", xff));
  assert.equal(lockedCorrect.status, 429);
});

test("form login: over-limit → 303 /login?error=rate with Retry-After", async () => {
  const xff = { "x-forwarded-for": "203.0.113.8" };
  for (let i = 0; i < 3; i++) await route.POST(formReq("nope", xff));
  const res = await route.POST(formReq("nope", xff));
  assert.equal(res.status, 303);
  assert.equal(res.headers.get("location"), "/login?error=rate");
  assert.ok(Number(res.headers.get("retry-after")) > 0, "Retry-After set");
});

test("a successful login resets the client's failure budget", async () => {
  const xff = { "x-forwarded-for": "203.0.113.9" };
  await route.POST(jsonReq("nope", xff)); // 1 failure
  await route.POST(jsonReq("nope", xff)); // 2 failures
  const good = await route.POST(jsonReq("s3cret", xff));
  assert.equal(good.status, 200, "correct password still allowed (under limit)");
  // Budget reset → two more failures don't immediately lock.
  const after = await route.POST(jsonReq("nope", xff));
  assert.equal(after.status, 401, "counter reset after success, not locked");
});
