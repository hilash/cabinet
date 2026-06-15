import test from "node:test";
import assert from "node:assert/strict";
import { pbkdf2Sync } from "node:crypto";
import {
  authCookieHeader,
  deriveAuthToken,
  expectedToken,
  getAuthSalt,
  getKbPassword,
  getPbkdf2Iterations,
  isAuthEnabled,
  timingSafeEqualHex,
} from "./kb-auth";

// Independent reference: node's pbkdf2Sync must agree with the module's
// Web-Crypto derivation, byte-for-byte. Catches any drift in algorithm, salt
// encoding, output length, or hex formatting.
function ref(pw: string, salt: string, iters: number): string {
  return pbkdf2Sync(
    Buffer.from(pw, "utf8"),
    Buffer.from(salt, "utf8"),
    iters,
    32,
    "sha256",
  ).toString("hex");
}

test("deriveAuthToken == PBKDF2-HMAC-SHA256 reference (algo/encoding/length)", async () => {
  for (const [pw, salt, iters] of [
    ["password", "cabinet-salt", 1],
    ["hunter2", "abc123", 7],
    ["", "s", 3],
    ["🔑-unicode", "🧂", 4],
  ] as const) {
    const got = await deriveAuthToken(pw, salt, iters);
    assert.equal(got, ref(pw, salt, iters), `${pw}/${salt}/${iters}`);
    assert.equal(got.length, 64, "256-bit token = 64 hex chars");
  }
});

test("getPbkdf2Iterations: default, override, invalid", () => {
  const prev = process.env.CABINET_LOGIN_PBKDF2_ITERS;
  try {
    delete process.env.CABINET_LOGIN_PBKDF2_ITERS;
    assert.equal(getPbkdf2Iterations(), 600_000);
    process.env.CABINET_LOGIN_PBKDF2_ITERS = "5";
    assert.equal(getPbkdf2Iterations(), 5);
    for (const bad of ["0", "-3", "abc", ""]) {
      process.env.CABINET_LOGIN_PBKDF2_ITERS = bad;
      assert.equal(getPbkdf2Iterations(), 600_000, `bad: ${JSON.stringify(bad)}`);
    }
  } finally {
    if (prev === undefined) delete process.env.CABINET_LOGIN_PBKDF2_ITERS;
    else process.env.CABINET_LOGIN_PBKDF2_ITERS = prev;
  }
});

test("timingSafeEqualHex: equal, off-by-one, length mismatch", () => {
  const a = "a".repeat(64);
  assert.equal(timingSafeEqualHex(a, a), true);
  assert.equal(timingSafeEqualHex(a, "a".repeat(63) + "b"), false);
  assert.equal(timingSafeEqualHex(a, "a".repeat(63)), false);
  assert.equal(timingSafeEqualHex("", ""), true);
});

test("getAuthSalt: legacy fallback + trim", () => {
  const prev = process.env.CABINET_AUTH_SALT;
  try {
    delete process.env.CABINET_AUTH_SALT;
    assert.equal(getAuthSalt(), "cabinet-salt");
    process.env.CABINET_AUTH_SALT = "  deadbeef  ";
    assert.equal(getAuthSalt(), "deadbeef");
  } finally {
    if (prev === undefined) delete process.env.CABINET_AUTH_SALT;
    else process.env.CABINET_AUTH_SALT = prev;
  }
});

test("isAuthEnabled / getKbPassword read env at call time", () => {
  const prev = process.env.KB_PASSWORD;
  try {
    delete process.env.KB_PASSWORD;
    assert.equal(isAuthEnabled(), false);
    process.env.KB_PASSWORD = "x";
    assert.equal(isAuthEnabled(), true);
    assert.equal(getKbPassword(), "x");
  } finally {
    if (prev === undefined) delete process.env.KB_PASSWORD;
    else process.env.KB_PASSWORD = prev;
  }
});

test("authCookieHeader: {} when auth off, valid kb-auth cookie when on", async () => {
  const prev = {
    pw: process.env.KB_PASSWORD,
    it: process.env.CABINET_LOGIN_PBKDF2_ITERS,
    salt: process.env.CABINET_AUTH_SALT,
  };
  try {
    process.env.CABINET_LOGIN_PBKDF2_ITERS = "2";
    process.env.CABINET_AUTH_SALT = "feedface";
    // Auth disabled -> no cookie, so the daemon's S2S calls behave as before.
    delete process.env.KB_PASSWORD;
    assert.deepEqual(await authCookieHeader(), {});
    process.env.KB_PASSWORD = "";
    assert.deepEqual(await authCookieHeader(), {});
    // Auth enabled -> exactly the cookie the gate (expectedToken) expects.
    process.env.KB_PASSWORD = "s3cret";
    const header = await authCookieHeader();
    assert.deepEqual(Object.keys(header), ["Cookie"]);
    assert.equal(header.Cookie, `kb-auth=${await expectedToken()}`);
    assert.equal(header.Cookie, `kb-auth=${await deriveAuthToken("s3cret", "feedface", 2)}`);
  } finally {
    for (const [k, v] of [
      ["KB_PASSWORD", prev.pw],
      ["CABINET_LOGIN_PBKDF2_ITERS", prev.it],
      ["CABINET_AUTH_SALT", prev.salt],
    ] as const) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
});

test("expectedToken memoizes and re-keys when env changes", async () => {
  const prev = {
    pw: process.env.KB_PASSWORD,
    it: process.env.CABINET_LOGIN_PBKDF2_ITERS,
    salt: process.env.CABINET_AUTH_SALT,
  };
  try {
    process.env.CABINET_LOGIN_PBKDF2_ITERS = "2";
    delete process.env.CABINET_AUTH_SALT;
    process.env.KB_PASSWORD = "alpha";
    const t1 = await expectedToken();
    assert.equal(t1, await expectedToken(), "stable across calls");
    assert.equal(t1, await deriveAuthToken("alpha", "cabinet-salt", 2));
    process.env.KB_PASSWORD = "beta";
    const t2 = await expectedToken();
    assert.notEqual(t2, t1, "re-keys when the password changes");
    assert.equal(t2, await deriveAuthToken("beta", "cabinet-salt", 2));
  } finally {
    for (const [k, v] of [
      ["KB_PASSWORD", prev.pw],
      ["CABINET_LOGIN_PBKDF2_ITERS", prev.it],
      ["CABINET_AUTH_SALT", prev.salt],
    ] as const) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
});
