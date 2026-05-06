import fs from "fs/promises";
import path from "path";
import yaml from "js-yaml";
import { NextResponse } from "next/server";
import { DATA_DIR } from "@/lib/storage/path-utils";
import { route } from "@/lib/runtime/route-wrapper";

export const dynamic = "force-dynamic";

export const GET = route(async () => {
  try {
    const raw = await fs.readFile(path.join(DATA_DIR, ".cabinet"), "utf-8");
    const manifest = yaml.load(raw) as Record<string, unknown>;
    return NextResponse.json({ exists: true, manifest });
  } catch {
    return NextResponse.json({ exists: false });
  }
});
