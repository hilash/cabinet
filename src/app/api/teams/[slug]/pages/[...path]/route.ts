import { NextRequest, NextResponse } from "next/server";
import { readPage, writePage, createPage, deletePage, movePage, renamePage } from "@/lib/storage/page-io";
import { autoCommit } from "@/lib/git/git-service";
import { requireTeamContext, teamContextErrorResponse } from "@/lib/teams/team-context";
import { getTeamDataDir } from "@/lib/teams/team-fs";

type RouteParams = { params: Promise<{ slug: string; path: string[] }> };

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const { slug, path: segments } = await params;
  try {
    await requireTeamContext(slug);
    const dataDir = getTeamDataDir(slug);
    const page = await readPage(segments.join("/"), dataDir);
    return NextResponse.json(page);
  } catch (err) {
    const message = (err as Error).message ?? "Unknown error";
    const status = (err as { status?: number }).status ?? (message.includes("not found") ? 404 : 500);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
  const { slug, path: segments } = await params;
  try {
    await requireTeamContext(slug);
    const dataDir = getTeamDataDir(slug);
    const virtualPath = segments.join("/");
    const body = await req.json();
    await writePage(virtualPath, body.content, body.frontmatter, dataDir);
    autoCommit(virtualPath, "Update", dataDir);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return teamContextErrorResponse(err);
  }
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const { slug, path: segments } = await params;
  try {
    await requireTeamContext(slug);
    const dataDir = getTeamDataDir(slug);
    const virtualPath = segments.join("/");
    const body = await req.json();
    await createPage(virtualPath, body.title, dataDir);
    autoCommit(virtualPath, "Add", dataDir);
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    const message = (err as Error).message ?? "Unknown error";
    const status = (err as { status?: number }).status ?? (message.includes("already exists") ? 409 : 500);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const { slug, path: segments } = await params;
  try {
    await requireTeamContext(slug);
    const dataDir = getTeamDataDir(slug);
    const virtualPath = segments.join("/");
    const body = await req.json();
    if (body.rename) {
      const newPath = await renamePage(virtualPath, body.rename, dataDir);
      return NextResponse.json({ ok: true, newPath });
    }
    const newPath = await movePage(virtualPath, body.toParent || "", dataDir);
    return NextResponse.json({ ok: true, newPath });
  } catch (err) {
    return teamContextErrorResponse(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const { slug, path: segments } = await params;
  try {
    await requireTeamContext(slug);
    const dataDir = getTeamDataDir(slug);
    const virtualPath = segments.join("/");
    await deletePage(virtualPath, dataDir);
    autoCommit(virtualPath, "Delete", dataDir);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return teamContextErrorResponse(err);
  }
}
