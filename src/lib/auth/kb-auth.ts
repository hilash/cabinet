/**
 * Shared KB_PASSWORD auth primitives -- the single source of truth for the
 * `kb-auth` cookie value, used by the gate (src/proxy.ts), the login route
 * (mint), and the check route (status). Keeping the derivation in one module
 * stops the three from drifting on algorithm / salt / iterations; any drift
 * means the cookie a logged-in browser holds stops matching what the gate
 * expects, i.e. silent 401s.
 *
 * Web Crypto + guarded env reads only -- NO node-only imports (`node:crypto`,
 * `fs`, `path`, ...) so the module stays portable and importable from any
 * runtime/test. The Node-only salt *generation* lives in `kb-auth-salt.node.ts`.
 */

/** Cookie name checked by the gate and set on login. */
export const KB_AUTH_COOKIE = "kb-auth";

/** Legacy fixed salt. Used only as a fallback when CABINET_AUTH_SALT is unset,
 *  so all three consumers stay self-consistent even if salt generation failed. */
const LEGACY_SALT = "cabinet-salt";

/** Default PBKDF2 iterations -- OWASP 2023 floor for PBKDF2-HMAC-SHA256.
 *  Tunable via CABINET_LOGIN_PBKDF2_ITERS; values below ~300k are for emergency
 *  low-power hardware only. The value is baked into the token, so changing it
 *  invalidates existing cookies (one-time re-login). */
const DEFAULT_PBKDF2_ITERATIONS = 600_000;

/** Read an env var without a hard dependency on the Node `process` global, so
 *  this module never throws if it is ever evaluated outside Node. */
function readEnv(name: string): string | undefined {
  const env = (
    globalThis as typeof globalThis & {
      process?: { env?: Record<string, string | undefined> };
    }
  ).process?.env;
  return env?.[name];
}

/** The configured password, read at CALL time (never cached at module load) so
 *  Settings-driven env changes and tests that mutate process.env are honored. */
export function getKbPassword(): string {
  return readEnv("KB_PASSWORD") ?? "";
}

/** Auth is enabled exactly when a non-empty KB_PASSWORD is set. */
export function isAuthEnabled(): boolean {
  return getKbPassword().length > 0;
}

/** Per-install salt (random hex, persisted to .cabinet.env) or the legacy
 *  fallback. Read at call time. */
export function getAuthSalt(): string {
  return readEnv("CABINET_AUTH_SALT")?.trim() || LEGACY_SALT;
}

/** PBKDF2 iteration count: a finite positive override, else the default. */
export function getPbkdf2Iterations(): number {
  const n = Number.parseInt(readEnv("CABINET_LOGIN_PBKDF2_ITERS") ?? "", 10);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_PBKDF2_ITERATIONS;
}

const HEX_BYTE = Array.from({ length: 256 }, (_, b) =>
  b.toString(16).padStart(2, "0"),
);
function toHex(bytes: Uint8Array): string {
  let out = "";
  for (const b of bytes) out += HEX_BYTE[b];
  return out;
}

/**
 * PBKDF2-HMAC-SHA256(password, salt) -> 256-bit token as lowercase hex.
 * `salt` is hashed as its UTF-8 bytes (per-install random hex, or the legacy
 * fixed salt string). Slow by design: each call costs `iterations` of PBKDF2.
 */
export async function deriveAuthToken(
  password: string,
  salt: string,
  iterations: number = getPbkdf2Iterations(),
): Promise<string> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: enc.encode(salt), iterations },
    keyMaterial,
    256,
  );
  return toHex(new Uint8Array(bits));
}

/**
 * The token a valid `kb-auth` cookie must equal. Memoized per process, keyed on
 * (iterations, salt, password), so:
 *   - the GATE pays PBKDF2 once per process, not per request (O(1) verify), and
 *   - a password/salt/iteration change (restart, or env mutation in tests)
 *     recomputes instead of returning a stale value.
 */
let memo: { key: string; promise: Promise<string> } | null = null;
export function expectedToken(): Promise<string> {
  const password = getKbPassword();
  const salt = getAuthSalt();
  const iterations = getPbkdf2Iterations();
  const key = JSON.stringify([iterations, salt, password]);
  if (memo && memo.key === key) return memo.promise;
  const promise = deriveAuthToken(password, salt, iterations).catch((err) => {
    // Don't cache a rejection -- let the next call retry.
    if (memo && memo.key === key) memo = null;
    throw err;
  });
  memo = { key, promise };
  return promise;
}

/**
 * The `Cookie` header a trusted server-to-server caller (the scheduler daemon,
 * server/cabinet-daemon.ts) must attach so its own `/api/*` requests pass the
 * gate in src/proxy.ts -- otherwise every scheduled job + heartbeat trigger
 * 401s silently once KB_PASSWORD is set. Returns an empty object when auth is
 * disabled, so callers can spread it unconditionally and send nothing.
 *
 * Uses the memoized expectedToken(), so PBKDF2 is paid once per process even
 * though every trigger calls this. The CALLER must make every derivation input
 * (KB_PASSWORD, CABINET_AUTH_SALT, and any CABINET_LOGIN_PBKDF2_ITERS override)
 * visible in process.env first -- this module only reads env, it never loads
 * .env / .cabinet.env. Any input that differs from the gate's silently 401s.
 */
export async function authCookieHeader(): Promise<Record<string, string>> {
  if (!isAuthEnabled()) return {};
  return { Cookie: `${KB_AUTH_COOKIE}=${await expectedToken()}` };
}

/**
 * Constant-time comparison of two hex strings. Pure JS (keeps this module
 * node-free; `node:crypto.timingSafeEqual` would not). Returns false on length
 * mismatch; otherwise XOR-accumulates over the full length without an
 * early-out, so timing does not reveal the matching prefix length.
 */
export function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}
