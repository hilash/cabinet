import { NextResponse } from "next/server";
import path from "path";
import { getDb } from "@/lib/db";
import {
  requireTeamContext,
  teamContextErrorResponse,
} from "@/lib/teams/team-context";
import { getTeamDataDir, setTeamKbPath } from "@/lib/teams/team-fs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  try {
    const ctx = await requireTeamContext(slug);
    const db = getDb();
    const row = db
      .prepare("SELECT id, name, slug, created_at, data_dir_override FROM teams WHERE id = ?")
      .get(ctx.teamId) as { id: string; name: string; slug: string; created_at: string; data_dir_override: string | null } | undefined;
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({
      team: {
        ...row,
        kbPath: row.data_dir_override ?? null,
        effectivePath: getTeamDataDir(slug),
      },
    });
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

    const body = await req.json();
    const { name, kbPath } = body as { name?: string; kbPath?: string | null };

    if (name === undefined && kbPath === undefined) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }

    const db = getDb();

    if (kbPath !== undefined) {
      if (kbPath !== null) {
        if (typeof kbPath !== "string" || !path.isAbsolute(kbPath)) {
          return NextResponse.json({ error: "kbPath must be an absolute path" }, { status: 400 });
        }
        await setTeamKbPath(slug, kbPath);
      } else {
        await setTeamKbPath(slug, null);
      }
    }

    if (name) {
      if (typeof name !== "string" || !name.trim()) {
        return NextResponse.json({ error: "Invalid name" }, { status: 400 });
      }
      db.prepare("UPDATE teams SET name = ? WHERE id = ?").run(name.trim(), ctx.teamId);
    }

    const row = db
      .prepare("SELECT id, name, slug, created_at, data_dir_override FROM teams WHERE id = ?")
      .get(ctx.teamId) as { id: string; name: string; slug: string; created_at: string; data_dir_override: string | null } | undefined;
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({
      team: {
        ...row,
        kbPath: row.data_dir_override ?? null,
        effectivePath: getTeamDataDir(slug),
      },
    });
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
