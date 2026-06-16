/**
 * In-memory, per-process login rate limiting for POST /api/auth/login.
 *
 * Two buckets, with honest trust boundaries:
 *   - GLOBAL failed-attempt bucket — the real anti-brute-force guarantee. It is
 *     unspoofable (not derived from any request-controlled value), so it holds
 *     even when an attacker rotates/forges client identifiers.
 *   - per-CLIENT bucket keyed on the first `x-forwarded-for` hop (or "unknown").
 *     Best-effort friction only: Cabinet can't prove forwarded headers are
 *     trustworthy on direct LAN/Tailscale access, so this must never be treated
 *     as spoof-proof. It exists so one noisy client doesn't consume the whole
 *     global budget, and to give that client clearer feedback.
 *
 * A request is limited if EITHER bucket is locked. Only FAILED attempts consume
 * budget; a successful login resets that client's bucket (the global budget
 * expires on its own window). State is per-process and resets on restart —
 * acceptable because the login route only runs in the Next.js process.
 *
 * Tunable via env (all positive integers): CABINET_LOGIN_WINDOW_MS,
 * CABINET_LOGIN_MAX_ATTEMPTS, CABINET_LOGIN_LOCKOUT_MS, CABINET_LOGIN_GLOBAL_MAX.
 */

function readIntEnv(name: string, fallback: number): number {
  const env = (
    globalThis as typeof globalThis & {
      process?: { env?: Record<string, string | undefined> };
    }
  ).process?.env;
  const n = Number.parseInt(env?.[name] ?? "", 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

const windowMs = () => readIntEnv("CABINET_LOGIN_WINDOW_MS", 15 * 60_000);
const maxAttempts = () => readIntEnv("CABINET_LOGIN_MAX_ATTEMPTS", 10);
const lockoutMs = () => readIntEnv("CABINET_LOGIN_LOCKOUT_MS", 15 * 60_000);
const globalMax = () => readIntEnv("CABINET_LOGIN_GLOBAL_MAX", 60);

const GLOBAL_KEY = "__global__";

interface Bucket {
  /** Failed attempts in the current window. */
  count: number;
  /** When the counting window resets (ms epoch). */
  windowResetAt: number;
  /** Locked until this time (ms epoch); 0 = not locked. */
  lockedUntil: number;
}

const buckets = new Map<string, Bucket>();

export interface RateLimitStatus {
  limited: boolean;
  retryAfterSec: number;
}

/** Derive a best-effort client key from the X-Forwarded-For header. NOT a
 *  security boundary (the header is spoofable on direct access) — see module doc. */
export function clientKeyFromForwardedFor(xff: string | null | undefined): string {
  const first = xff?.split(",")[0]?.trim();
  return first ? first : "unknown";
}

function getBucket(key: string, now: number): Bucket {
  let b = buckets.get(key);
  if (!b) {
    b = { count: 0, windowResetAt: now + windowMs(), lockedUntil: 0 };
    buckets.set(key, b);
  }
  // Reset the counting window once it has elapsed and the bucket isn't locked.
  if (now > b.windowResetAt && now >= b.lockedUntil) {
    b.count = 0;
    b.windowResetAt = now + windowMs();
  }
  return b;
}

function retryAfter(b: Bucket, now: number): number {
  return b.lockedUntil > now ? Math.ceil((b.lockedUntil - now) / 1000) : 0;
}

/** Drop fully-expired per-client buckets to bound memory. Cheap; the map is tiny. */
function prune(now: number): void {
  for (const [key, b] of buckets) {
    if (key === GLOBAL_KEY) continue;
    if (now > b.windowResetAt && now >= b.lockedUntil) buckets.delete(key);
  }
}

function combined(clientKey: string, now: number): RateLimitStatus {
  const sec = Math.max(
    retryAfter(getBucket(GLOBAL_KEY, now), now),
    retryAfter(getBucket(clientKey, now), now),
  );
  return { limited: sec > 0, retryAfterSec: sec };
}

/** Read-only pre-check: is this client currently locked out? */
export function getLoginRateLimitStatus(clientKey: string): RateLimitStatus {
  return combined(clientKey, Date.now());
}

/** Record one failed attempt against the global + client buckets and return the
 *  resulting status (so the caller can 429 immediately when this trips the lock). */
export function recordFailedLogin(clientKey: string): RateLimitStatus {
  const now = Date.now();
  for (const [key, max] of [
    [GLOBAL_KEY, globalMax()] as const,
    [clientKey, maxAttempts()] as const,
  ]) {
    const b = getBucket(key, now);
    b.count += 1;
    if (b.count >= max) b.lockedUntil = now + lockoutMs();
  }
  prune(now);
  return combined(clientKey, now);
}

/** Clear a client's failed-attempt bucket after an allowed successful login.
 *  Does NOT touch the global bucket (which expires on its own window). */
export function resetLoginFailures(clientKey: string): void {
  buckets.delete(clientKey);
}

/** Test/admin helper: wipe all rate-limit state. */
export function resetLoginRateLimit(): void {
  buckets.clear();
}
