import path from "path";
import fs from "fs/promises";
import { getTeamDataDir } from "@/lib/teams/team-fs";

/**
 * Returns the path to a user's personal workspace within a team's data dir.
 * Each user gets an isolated directory so their agent sessions don't conflict.
 */
export function getUserWorkspaceDir(teamSlug: string, userId: string): string {
  return path.join(getTeamDataDir(teamSlug), ".agents", "users", userId, "workspace");
}

/**
 * Ensures the user workspace directory exists and returns its path.
 */
export async function ensureUserWorkspace(
  teamSlug: string,
  userId: string
): Promise<string> {
  const dir = getUserWorkspaceDir(teamSlug, userId);
  await fs.mkdir(dir, { recursive: true });
  return dir;
}
