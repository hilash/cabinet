import path from "path";
import { DATA_DIR } from "@/lib/storage/path-utils";
import {
  ensureDirectory,
  readFileContent,
  writeFileContent,
} from "@/lib/storage/fs-operations";

export interface UserProfile {
  name: string;
  displayName?: string;
  role?: string;
  iconKey?: string;
  color?: string;
  avatar?: string;      // "" | preset id | "custom"
  avatarExt?: string;   // png | jpg | svg, only when avatar === "custom"
}

export interface WorkspaceFields {
  workspaceName?: string;
  description?: string;
  teamSize?: string;
  homeName?: string;
}

const CONFIG_DIR = path.join(DATA_DIR, ".agents", ".config");
const USER_FILE = path.join(CONFIG_DIR, "user.json");
const WORKSPACE_FILE = path.join(CONFIG_DIR, "workspace.json");
const COMPANY_FILE = path.join(CONFIG_DIR, "company.json");

async function readJson<T>(file: string): Promise<T | null> {
  try {
    const raw = await readFileContent(file);
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

async function writeJson(file: string, data: unknown): Promise<void> {
  await ensureDirectory(path.dirname(file));
  await writeFileContent(file, JSON.stringify(data, null, 2));
}

interface WorkspaceJsonV2 {
  version?: number;
  home?: { name?: string };
  cabinet?: { name?: string; description?: string; size?: string };
}

interface CompanyJson {
  company?: { name?: string; description?: string; teamSize?: string };
}

/**
 * Read the user profile. If user.json doesn't exist yet, seed it from
 * workspace.json (home.name → profile.name) so existing installs get a
 * usable profile on first read.
 */
export async function readUserProfile(): Promise<UserProfile> {
  const existing = await readJson<UserProfile>(USER_FILE);
  if (existing) return existing;

  const seeded = await seedProfileFromOnboarding();
  await writeJson(USER_FILE, seeded);
  return seeded;
}

async function seedProfileFromOnboarding(): Promise<UserProfile> {
  const workspace = await readJson<WorkspaceJsonV2>(WORKSPACE_FILE);
  const home = workspace?.home?.name?.trim() || "";
  // "Hila's Home" → "Hila"
  const inferredName = home.replace(/['’]s Home$/i, "").trim();
  return {
    name: inferredName || "You",
    displayName: "",
    role: "",
    avatar: "",
  };
}

export async function writeUserProfile(
  patch: Partial<UserProfile>
): Promise<UserProfile> {
  const current = await readUserProfile();
  const next: UserProfile = { ...current, ...patch };
  await writeJson(USER_FILE, next);
  return next;
}

export async function readWorkspaceFields(): Promise<WorkspaceFields> {
  const workspace = await readJson<WorkspaceJsonV2>(WORKSPACE_FILE);
  const company = await readJson<CompanyJson>(COMPANY_FILE);
  return {
    workspaceName: workspace?.cabinet?.name || company?.company?.name || "",
    description:
      workspace?.cabinet?.description || company?.company?.description || "",
    teamSize: workspace?.cabinet?.size || company?.company?.teamSize || "",
    homeName: workspace?.home?.name || "",
  };
}

export async function writeWorkspaceFields(
  patch: Partial<WorkspaceFields>
): Promise<WorkspaceFields> {
  const existing =
    (await readJson<WorkspaceJsonV2 & { setupDate?: string }>(WORKSPACE_FILE)) || {};
  const next = {
    ...existing,
    version: existing.version ?? 2,
    home: {
      ...(existing.home || {}),
      ...(patch.homeName !== undefined ? { name: patch.homeName } : {}),
    },
    cabinet: {
      ...(existing.cabinet || {}),
      ...(patch.workspaceName !== undefined ? { name: patch.workspaceName } : {}),
      ...(patch.description !== undefined ? { description: patch.description } : {}),
      ...(patch.teamSize !== undefined ? { size: patch.teamSize } : {}),
    },
  };
  await writeJson(WORKSPACE_FILE, next);

  // Mirror into the legacy company.json so older code paths stay in sync.
  const legacy =
    (await readJson<CompanyJson & { setupDate?: string; exists?: boolean }>(
      COMPANY_FILE
    )) || {};
  const legacyNext = {
    ...legacy,
    exists: true,
    company: {
      ...(legacy.company || {}),
      ...(patch.workspaceName !== undefined ? { name: patch.workspaceName } : {}),
      ...(patch.description !== undefined ? { description: patch.description } : {}),
      ...(patch.teamSize !== undefined ? { teamSize: patch.teamSize } : {}),
    },
  };
  await writeJson(COMPANY_FILE, legacyNext);

  return readWorkspaceFields();
}

/** The directory where `user-avatar.{ext}` lives. */
export function getUserAvatarDir(): string {
  return CONFIG_DIR;
}

export const USER_AVATAR_PREFIX = "user-avatar";
