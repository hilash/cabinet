import test, { beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  clientKeyFromForwardedFor,
  getLoginRateLimitStatus,
  recordFailedLogin,
  resetLoginFailures,
  resetLoginRateLimit,
} from "./login-rate-limit";

beforeEach(() => {
  resetLoginRateLimit();
  process.env.CABINET_LOGIN_MAX_ATTEMPTS = "3";
  process.env.CABINET_LOGIN_GLOBAL_MAX = "100";
  process.env.CABINET_LOGIN_WINDOW_MS = "60000";
  process.env.CABINET_LOGIN_LOCKOUT_MS = "60000";
});

test("clientKeyFromForwardedFor: first hop, trimmed, or 'unknown'", () => {
  assert.equal(clientKeyFromForwardedFor("1.2.3.4, 5.6.7.8"), "1.2.3.4");
  assert.equal(clientKeyFromForwardedFor("  9.9.9.9 "), "9.9.9.9");
  assert.equal(clientKeyFromForwardedFor(null), "unknown");
  assert.equal(clientKeyFromForwardedFor(""), "unknown");
});

test("locks a client after MAX failed attempts", () => {
  const k = "client-a";
  assert.equal(getLoginRateLimitStatus(k).limited, false);
  for (let i = 0; i < 3; i++) recordFailedLogin(k);
  const s = getLoginRateLimitStatus(k);
  assert.equal(s.limited, true);
  assert.ok(s.retryAfterSec > 0, "Retry-After is positive when locked");
});

test("a success reset clears the client's failure budget", () => {
  const k = "client-b";
  recordFailedLogin(k);
  recordFailedLogin(k); // 2 < 3 → not locked
  assert.equal(getLoginRateLimitStatus(k).limited, false);
  resetLoginFailures(k);
  recordFailedLogin(k);
  recordFailedLogin(k); // 2 again → still under the limit
  assert.equal(getLoginRateLimitStatus(k).limited, false, "counter rewound on reset");
});

test("global bucket trips even when client keys rotate (spoof-resistant)", () => {
  process.env.CABINET_LOGIN_GLOBAL_MAX = "5";
  process.env.CABINET_LOGIN_MAX_ATTEMPTS = "1000"; // per-client never locks here
  for (let i = 0; i < 5; i++) recordFailedLogin(`rotating-${i}`);
  // A brand-new client key is still limited because the global bucket is locked.
  assert.equal(getLoginRateLimitStatus("fresh-client").limited, true);
});
