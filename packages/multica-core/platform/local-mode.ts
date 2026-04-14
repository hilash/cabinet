import type { User, Workspace } from "../types";
import type { StorageAdapter } from "../types/storage";

export const LOCAL_TOKEN_PREFIX = "local-";
export const LOCAL_WORKSPACE_ID = "local-workspace";
export const LOCAL_USER_STORAGE_KEY = "multica_local_user";

export function isLocalToken(token: string | null | undefined): boolean {
  return typeof token === "string" && token.startsWith(LOCAL_TOKEN_PREFIX);
}

export function createLocalUser(rawName: string): User {
  const now = new Date().toISOString();
  const name = rawName.trim() || "Local User";
  return {
    id: `${LOCAL_TOKEN_PREFIX}${Date.now()}`,
    name,
    email: name.includes("@") ? name : `${name.toLowerCase()}@local`,
    avatar_url: null,
    created_at: now,
    updated_at: now,
  };
}

export function createLocalWorkspace(nameHint?: string): Workspace {
  const now = new Date().toISOString();
  const displayName = nameHint?.trim() || "Local Workspace";
  return {
    id: LOCAL_WORKSPACE_ID,
    name: `${displayName} (Offline)`,
    slug: "local-offline",
    description: "Local fallback workspace when Multica backend is unavailable.",
    context: null,
    settings: {},
    repos: [],
    issue_prefix: "LOCAL",
    created_at: now,
    updated_at: now,
  };
}

export function writeStoredLocalUser(
  storage: Pick<StorageAdapter, "setItem">,
  user: User
): void {
  storage.setItem(LOCAL_USER_STORAGE_KEY, JSON.stringify(user));
}

export function readStoredLocalUser(
  storage: Pick<StorageAdapter, "getItem">
): User | null {
  const raw = storage.getItem(LOCAL_USER_STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const user = parsed as Partial<User>;
    if (!user.id || !user.name || !user.email) return null;
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      avatar_url: user.avatar_url ?? null,
      created_at: user.created_at ?? new Date().toISOString(),
      updated_at: user.updated_at ?? new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

