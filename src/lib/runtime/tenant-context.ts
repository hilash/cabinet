import { AsyncLocalStorage } from "node:async_hooks";

/**
 * Per-request tenant context — used by `path-utils.ts:getDataDir()` to
 * resolve `${BASE_DATA_DIR}/{tenantId}` instead of the install's base
 * directory.
 *
 * In OSS this is never populated; `readTenantIdFromContext()` always returns
 * null and cabinet writes to the install's getDataDir() directly.
 *
 * In Cabinet Cloud, every request handler is wrapped with `withTenantContext`
 * (typically by a thin route adapter that reads `x-tenant-id` from
 * `request.headers` synchronously). The lib code stays sync; the ALS lets
 * us avoid awaiting on every path computation.
 */
interface TenantContext {
  tenantId: string;
}

const tenantStorage = new AsyncLocalStorage<TenantContext>();

export function readTenantIdFromContext(): string | null {
  return tenantStorage.getStore()?.tenantId ?? null;
}

export function withTenantContext<T>(tenantId: string, fn: () => T): T {
  return tenantStorage.run({ tenantId }, fn);
}
