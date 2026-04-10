import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import {
  requireTeamContext,
  teamContextErrorResponse,
} from "@/lib/teams/team-context";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ slug: string; userId: string }> }
) {
  const { slug, userId } = await params;
  try {
    const ctx = await requireTeamContext(slug);
    if (ctx.role !== "admin") {
      return NextResponse.json({ error: "Admin required" }, { status: 403 });
    }

    const { role } = await req.json();
    if (role !== "admin" && role !== "member") {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    const db = getDb();
    const result = db
      .prepare("UPDATE team_members SET role = ? WHERE team_id = ? AND user_id = ?")
      .run(role, ctx.teamId, userId);

    if (result.changes === 0) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return teamContextErrorResponse(err);
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ slug: string; userId: string }> }
) {
  const { slug, userId } = await params;
  try {
    const ctx = await requireTeamContext(slug);

    // Members can remove themselves; admins can remove anyone
    if (ctx.role !== "admin" && ctx.userId !== userId) {
      return NextResponse.json({ error: "Not allowed" }, { status: 403 });
    }

    const db = getDb();

    // Prevent removing the last admin
    if (ctx.role === "admin" || userId === ctx.userId) {
      const adminCount = (
        db
          .prepare(
            "SELECT COUNT(*) as c FROM team_members WHERE team_id = ? AND role = 'admin'"
          )
          .get(ctx.teamId) as { c: number }
      ).c;

      const targetRole = (
        db
          .prepare("SELECT role FROM team_members WHERE team_id = ? AND user_id = ?")
          .get(ctx.teamId, userId) as { role: string } | undefined
      )?.role;

      if (targetRole === "admin" && adminCount <= 1) {
        return NextResponse.json(
          { error: "Cannot remove the last admin" },
          { status: 409 }
        );
      }
    }

    db.prepare("DELETE FROM team_members WHERE team_id = ? AND user_id = ?").run(
      ctx.teamId,
      userId
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    return teamContextErrorResponse(err);
  }
}
