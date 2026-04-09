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
    const ctx = await requireTeamContext(slug);
    const db = getDb();
    const team = db
      .prepare("SELECT id, name, slug, created_at FROM teams WHERE id = ?")
      .get(ctx.teamId);
    return NextResponse.json({ team });
  } catch (err) {
    return teamContextErrorResponse(err);
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  try {
    const ctx = await requireTeamContext(slug);
    if (ctx.role !== "admin") {
      return NextResponse.json({ error: "Admin required" }, { status: 403 });
    }

    const { name } = await req.json();
    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "Name required" }, { status: 400 });
    }

    const db = getDb();
    db.prepare("UPDATE teams SET name = ? WHERE id = ?").run(name.trim(), ctx.teamId);

    const team = db
      .prepare("SELECT id, name, slug, created_at FROM teams WHERE id = ?")
      .get(ctx.teamId);
    return NextResponse.json({ team });
  } catch (err) {
    return teamContextErrorResponse(err);
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  try {
    const ctx = await requireTeamContext(slug);
    if (ctx.role !== "admin") {
      return NextResponse.json({ error: "Admin required" }, { status: 403 });
    }

    const db = getDb();
    db.prepare("DELETE FROM teams WHERE id = ?").run(ctx.teamId);

    return NextResponse.json({ ok: true });
  } catch (err) {
    return teamContextErrorResponse(err);
  }
}
