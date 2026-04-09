import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { getDb } from "@/lib/db";
import { getUserTeams } from "@/lib/teams/team-context";
import { initTeamDirectory } from "@/lib/teams/team-fs";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const teams = getUserTeams(session.user.id);
  return NextResponse.json({ teams });
}

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name } = await req.json();
  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json({ error: "Team name is required" }, { status: 400 });
  }

  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

  if (!slug) {
    return NextResponse.json({ error: "Invalid team name" }, { status: 400 });
  }

  const db = getDb();

  const existing = db.prepare("SELECT id FROM teams WHERE slug = ?").get(slug);
  if (existing) {
    return NextResponse.json({ error: "A team with this name already exists" }, { status: 409 });
  }

  const teamId = crypto.randomUUID();

  const createTeam = db.transaction(() => {
    db.prepare(`
      INSERT INTO teams (id, name, slug, created_by)
      VALUES (?, ?, ?, ?)
    `).run(teamId, name.trim(), slug, session.user.id);

    db.prepare(`
      INSERT INTO team_members (id, team_id, user_id, role)
      VALUES (?, ?, ?, 'admin')
    `).run(crypto.randomUUID(), teamId, session.user.id);
  });

  createTeam();

  // Initialize filesystem + git repo
  await initTeamDirectory(slug);

  const team = db.prepare("SELECT id, name, slug, created_at FROM teams WHERE id = ?").get(teamId);
  return NextResponse.json({ team }, { status: 201 });
}
