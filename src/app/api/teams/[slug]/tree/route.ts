import { NextResponse } from "next/server";
import { buildTree } from "@/lib/storage/tree-builder";
import { requireTeamContext, teamContextErrorResponse } from "@/lib/teams/team-context";
import { getTeamDataDir } from "@/lib/teams/team-fs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  try {
    await requireTeamContext(slug);
    const dataDir = getTeamDataDir(slug);
    const tree = await buildTree(dataDir);
    return NextResponse.json(tree);
  } catch (err) {
    return teamContextErrorResponse(err);
  }
}
