import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import {
  requireTeamContext,
  teamContextErrorResponse,
} from "@/lib/teams/team-context";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  try {
    await requireTeamContext(slug);
    const db = getDb();
    const team = db.prepare("SELECT id FROM teams WHERE slug = ?").get(slug) as
      | { id: string }
      | undefined;
    if (!team) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const members = db
      .prepare(`
        SELECT u.id, u.name, u.email, u.image, tm.role, tm.joined_at
        FROM team_members tm
        JOIN user u ON u.id = tm.user_id
        WHERE tm.team_id = ?
        ORDER BY tm.joined_at
      `)
      .all(team.id);

    return NextResponse.json({ members });
  } catch (err) {
    return teamContextErrorResponse(err);
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  try {
    const ctx = await requireTeamContext(slug);
    if (ctx.role !== "admin") {
      return NextResponse.json({ error: "Admin required" }, { status: 403 });
    }

    const { email, role = "member" } = await req.json();
    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email required" }, { status: 400 });
    }
    if (role !== "admin" && role !== "member") {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    const db = getDb();
    const user = db.prepare("SELECT id FROM user WHERE email = ?").get(email) as
      | { id: string }
      | undefined;

    if (!user) {
      return NextResponse.json(
        { error: "User not found. They must sign in at least once before being added." },
        { status: 404 }
      );
    }

    const existing = db
      .prepare("SELECT id FROM team_members WHERE team_id = ? AND user_id = ?")
      .get(ctx.teamId, user.id);

    if (existing) {
      return NextResponse.json({ error: "User is already a member" }, { status: 409 });
    }

    db.prepare(`
      INSERT INTO team_members (id, team_id, user_id, role)
      VALUES (?, ?, ?, ?)
    `).run(crypto.randomUUID(), ctx.teamId, user.id, role);

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    return teamContextErrorResponse(err);
  }
}
