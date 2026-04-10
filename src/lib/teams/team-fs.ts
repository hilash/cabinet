import path from "path";
import fs from "fs/promises";
import { existsSync } from "fs";
import simpleGit from "simple-git";
import { getManagedDataDir } from "@/lib/runtime/runtime-config";
import { getDb } from "@/lib/db";

/**
 * Returns the filesystem path for a team's data directory.
 * If the team has a data_dir_override (e.g. the legacy "default" team),
 * that path is used instead of the default teams/{slug} location.
 */
export function getTeamDataDir(teamSlug: string): string {
  const db = getDb();
  const row = db
    .prepare("SELECT data_dir_override FROM teams WHERE slug = ?")
    .get(teamSlug) as { data_dir_override: string | null } | undefined;

  if (row?.data_dir_override) return row.data_dir_override;
  return path.join(getManagedDataDir(), "teams", teamSlug);
}

/**
 * Sets (or clears) the absolute KB path for a team.
 * When absolutePath is null the team falls back to the default managed path.
 * If a non-null path is given, the directory and git repo are initialised.
 */
export async function setTeamKbPath(
  teamSlug: string,
  absolutePath: string | null
): Promise<void> {
  const db = getDb();
  db.prepare("UPDATE teams SET data_dir_override = ? WHERE slug = ?").run(
    absolutePath,
    teamSlug
  );

  if (absolutePath) {
    await fs.mkdir(absolutePath, { recursive: true });
    const gitDir = path.join(absolutePath, ".git");
    if (!existsSync(gitDir)) {
      const git = simpleGit(absolutePath);
      await git.init();
      await git.addConfig("user.email", "kb@cabinet.dev");
      await git.addConfig("user.name", "Cabinet");
    }
  }
}

/**
 * Ensures the team's data directory exists and has a git repo initialised.
 * Safe to call multiple times (idempotent).
 */
export async function initTeamDirectory(teamSlug: string): Promise<void> {
  const teamDir = getTeamDataDir(teamSlug);
  await fs.mkdir(teamDir, { recursive: true });

  const gitDir = path.join(teamDir, ".git");
  if (!existsSync(gitDir)) {
    const git = simpleGit(teamDir);
    await git.init();
    await git.addConfig("user.email", "kb@cabinet.dev");
    await git.addConfig("user.name", "Cabinet");
  }
}
