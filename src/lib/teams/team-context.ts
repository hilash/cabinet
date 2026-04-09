import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { getDb } from "@/lib/db";

export interface TeamContext {
  teamId: string;
  teamSlug: string;
  userId: string;
  role: "admin" | "member";
}

/**
 * Validates that the current user is authenticated and is a member of the team.
 * Throws an error with an HTTP-friendly status on failure.
 */
export async function requireTeamContext(teamSlug: string): Promise<TeamContext> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session?.user?.id) {
    throw Object.assign(new Error("Unauthenticated"), { status: 401 });
  }

  const db = getDb();
  const row = db
    .prepare(`
      SELECT t.id, t.slug, tm.role
      FROM teams t
      JOIN team_members tm ON tm.team_id = t.id
      WHERE t.slug = ? AND tm.user_id = ?
    `)
    .get(teamSlug, session.user.id) as
    | { id: string; slug: string; role: string }
    | undefined;

  if (!row) {
    throw Object.assign(new Error("Not a team member"), { status: 403 });
  }

  return {
    teamId: row.id,
    teamSlug: row.slug,
    userId: session.user.id,
    role: row.role as "admin" | "member",
  };
}

/**
 * Returns all teams the given user belongs to.
 */
export function getUserTeams(userId: string) {
  const db = getDb();
  return db
    .prepare(`
      SELECT t.id, t.name, t.slug, tm.role
      FROM teams t
      JOIN team_members tm ON tm.team_id = t.id
      WHERE tm.user_id = ?
      ORDER BY t.name
    `)
    .all(userId) as Array<{ id: string; name: string; slug: string; role: string }>;
}

/**
 * Helper to build a standard error response from a context error.
 */
export function teamContextErrorResponse(err: unknown): Response {
  const status = (err as { status?: number }).status ?? 500;
  const message = (err as Error).message ?? "Internal error";
  return Response.json({ error: message }, { status });
}
