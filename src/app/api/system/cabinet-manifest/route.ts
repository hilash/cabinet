import path from "path";
import yaml from "js-yaml";
import { NextResponse } from "next/server";
import { DATA_DIR } from "@/lib/storage/path-utils";
import { readFileContent } from "@/lib/storage/fs-operations";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const raw = await readFileContent(path.join(DATA_DIR, ".cabinet"));
    const manifest = yaml.load(raw) as Record<string, unknown>;
    return NextResponse.json({ exists: true, manifest });
  } catch {
    return NextResponse.json({ exists: false });
  }
}
