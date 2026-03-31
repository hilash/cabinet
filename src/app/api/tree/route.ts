import { NextResponse } from "next/server";
import { buildTree } from "@/lib/storage/tree-builder";
import { ensureDataDir } from "@/lib/storage/fs-operations";

export async function GET() {
  try {
    await ensureDataDir();
    const tree = await buildTree();
    return NextResponse.json(tree);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
