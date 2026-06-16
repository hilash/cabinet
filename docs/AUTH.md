# Authentication & access control

Cabinet ships with a single, optional password gate for the whole UI/API. It is
**off by default** (no login) and turns on the moment you set `KB_PASSWORD`.

This document describes the auth model after the issue #11 hardening
(PBKDF2 + per-install salt + login rate-limiting). For the user-facing env
reference, see the table in the main [README](../README.md#configuration).

---

## TL;DR

- Set `KB_PASSWORD` → the whole app requires login. Leave it empty → no auth.
- The session cookie (`kb-auth`) is `PBKDF2-HMAC-SHA256(password, per-install salt)`,
  not a fast plain hash.
- A per-install random salt is generated once into `.cabinet.env`.
- The login endpoint is rate-limited (per-client + a global ceiling) to stop
  brute force.
- Changing the password, salt, or iteration count logs everyone out once.

## How it works

### The gate

`src/proxy.ts` is the Next.js **proxy** (the renamed-in-Next-16 middleware; it is
auto-detected at `src/proxy.ts` and runs on the Node.js runtime). On every
request, when auth is enabled, it requires a valid `kb-auth` cookie:

- Allowed without a cookie: `/login`, `/api/auth/login`, `/api/auth/check`,
  `/api/health*`, and Next static assets.
- Missing/invalid cookie → API routes get `401`, page routes redirect to
  `/login`.
- Verification is **constant-time**, and the expected token is **memoized** per
  process, so the gate stays O(1) per request (PBKDF2 runs once per process, not
  per request).

### The token

The `kb-auth` cookie value is:

```
PBKDF2-HMAC-SHA256(password, salt, iterations)  →  256-bit, lowercase hex
```

- **Slow KDF (PBKDF2)** — default **600,000** iterations. This is the
  defense-in-depth that makes *offline* password recovery from a leaked cookie
  expensive.
- **Per-install salt** — a random 32-byte value, distinct per deployment, so a
  leaked cookie can't be attacked with precomputed/cross-install tables.
- One shared module, `src/lib/auth/kb-auth.ts`, is the single source of truth
  for the derivation; the gate, the login route, and the check route all use it
  so they can never drift.

Cookie attributes are unchanged: `HttpOnly`, `SameSite=Lax`, `Path=/`, 30-day
`Max-Age`, and `Secure` in production unless `KB_ALLOW_HTTP=1`.

### Login + rate limiting

`POST /api/auth/login` (`src/app/api/auth/login/route.ts`):

- Derives the candidate token with PBKDF2 and **constant-time compares** it to
  the expected token — so each guess costs one PBKDF2 (there is no fast
  plaintext comparison).
- Is rate-limited (`src/lib/auth/login-rate-limit.ts`) with **two buckets**:
  - a **global** failed-attempt bucket — the real, unspoofable guarantee, and
  - a **best-effort per-client** bucket keyed on `X-Forwarded-For`. This is
    additive friction only; forwarded headers are not trusted as a security
    boundary on direct LAN/Tailscale access.
- Over the limit → `429` + `Retry-After` (JSON) or a `303` to `/login?error=rate`
  (native form post). Only **failed** attempts consume budget; a success resets
  that client's bucket.

The buckets live in memory in the Next.js process and reset on restart.

## Configuration

| Variable | Default | Purpose |
|---|---|---|
| `KB_PASSWORD` | _(empty)_ | Enable auth by setting it. Empty = no auth. |
| `CABINET_AUTH_SALT` | _(auto)_ | Per-install salt. Auto-generated into `.cabinet.env` on first run; set it only to pin a value. |
| `CABINET_LOGIN_PBKDF2_ITERS` | `600000` | KDF cost. Lower only for constrained hardware; below ~300000 is discouraged. |
| `CABINET_LOGIN_MAX_ATTEMPTS` | `10` | Failed attempts per client before lockout. |
| `CABINET_LOGIN_WINDOW_MS` | `900000` | Counting window (15 min). |
| `CABINET_LOGIN_LOCKOUT_MS` | `900000` | Lockout duration once tripped (15 min). |
| `CABINET_LOGIN_GLOBAL_MAX` | `60` | Global failed-attempt ceiling per window. |
| `KB_ALLOW_HTTP` | _(unset)_ | Set to `1` to drop the `Secure` cookie flag in production (e.g. plain-HTTP LAN). |

### The per-install salt

On first boot with this version, `src/instrumentation.ts` generates a random
`CABINET_AUTH_SALT` and stores it in `.cabinet.env` (atomic write, `0600`,
gitignored). It is read back into `process.env` on every boot. If generation
ever fails, the code falls back to a legacy fixed salt so the gate, login, and
check stay mutually consistent (just without per-install uniqueness).

`.cabinet.env` is editable from **Settings → Integrations**, where the salt
appears as a masked entry. Changing or clearing it forces a one-time re-login.

## Upgrading / migration

Switching from the old `SHA-256(password + "cabinet-salt")` scheme to PBKDF2
changes the token value, so **all existing `kb-auth` cookies become invalid** —
everyone (including you) re-logs-in once. The cookie name and attributes are
unchanged; there is no data migration.

## Threat model notes

- **Online brute force** (the practical risk, especially now that Cabinet can be
  reached over LAN / Tailscale / VPN) is stopped primarily by **rate limiting**.
- **PBKDF2 + per-install salt** is defense-in-depth: it slows *offline* password
  recovery if a cookie/verifier leaks. It does **not** revoke a leaked bearer
  cookie — rotating the password (or salt) invalidates all cookies.
- The single shared `KB_PASSWORD` model is unchanged: there are no per-user
  accounts, and login is not CSRF-tokened (login CSRF is not a meaningful
  escalation for a single shared secret).
- **Scheduler daemon:** the daemon's server-to-server calls (scheduled jobs +
  heartbeats) authenticate against this same gate by attaching the `kb-auth`
  cookie via `authCookieHeader()` from `src/lib/auth/kb-auth.ts` (PR #142). For
  the derived token to match, every input — `KB_PASSWORD`, `CABINET_AUTH_SALT`,
  and any `CABINET_LOGIN_PBKDF2_ITERS` override — must be visible in *both* the
  Next app and the daemon process. The salt lives in `.cabinet.env` (both load
  it at boot); the daemon also backfills these keys from `.env` for the
  production `start:daemon` path, which doesn't otherwise load `.env`.

## Testing it

Unit tests (run with `npm test`):

- `src/lib/auth/kb-auth.test.ts` — PBKDF2 against an independent `node:crypto`
  reference, iteration parsing, constant-time compare, memoization, and
  `authCookieHeader` (empty when auth is off, exact cookie when on).
- `src/lib/auth/login-rate-limit.test.ts` — lockout, success reset, global
  bucket tripping when client keys rotate.
- `test/proxy.test.ts`, `src/app/api/auth/login/route.test.ts` — gate behavior
  and the login form/JSON flows (including the 429 / `?error=rate` paths). Also
  an end-to-end guard that the daemon's `authCookieHeader()` cookie passes the
  real `proxy()` gate on an `/api/*` route.

Manual end-to-end:

```bash
# Start with auth on (low thresholds make the lockout quick to observe).
# Put these in .env, then `npm run dev:all`:
#   KB_PASSWORD=your-test-password
#   CABINET_LOGIN_MAX_ATTEMPTS=3
#   CABINET_LOGIN_LOCKOUT_MS=15000
```

1. A fresh `CABINET_AUTH_SALT` appears in `.cabinet.env` (and persists across restarts).
2. Visiting any page unauthenticated redirects to `/login`; `/api/*` returns `401`.
3. The correct password logs in (sets the `kb-auth` cookie) and the gate passes.
4. Several wrong passwords trip the lockout (`429` / `?error=rate` + `Retry-After`);
   the correct password is refused while locked, then works again after the lockout window.
