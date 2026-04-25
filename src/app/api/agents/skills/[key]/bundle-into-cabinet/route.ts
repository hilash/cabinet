import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { PROJECT_ROOT } from "@/lib/runtime/runtime-config";
import { DATA_DIR } from "@/lib/storage/path-utils";
import { readSkill } from "@/lib/agents/skills/loader";
import { updateSkillsLock } from "@/lib/agents/skills/lock";

interface RouteContext {
  params: Promise<{ key: string }>;
}

interface BundleRequest {
  scope?: string; // "root" | "cabinet:<path>"  default: "root"
}

export async function POST(request: Request, context: RouteContext): Promise<NextResponse> {
  const { key } = await context.params;
  const body = (await request.json().catch(() => ({}))) as BundleRequest;

  const source = await readSkill(key, {});
  if (!source) {
    return NextResponse.json({ error: "skill not found" }, { status: 404 });
  }
  if (source.origin === "cabinet-root" || source.origin === "cabinet-scoped") {
    return NextResponse.json(
      { error: "skill is already cabinet-managed", origin: source.origin },
      { status: 409 },
    );
  }

  const scope = body.scope ?? "root";
  const destRoot =
    scope === "root"
      ? path.join(PROJECT_ROOT, ".agents", "skills")
      : path.join(DATA_DIR, scope.replace(/^cabinet:/, ""), ".agents", "skills");
  await fs.mkdir(destRoot, { recursive: true });
  const dest = path.join(destRoot, key);
  await fs.rm(dest, { recursive: true, force: true });
  await fs.cp(source.path, dest, { recursive: true });

  await updateSkillsLock(key, {
    source: source.path,
    sourceType: "local_path",
    ref: null,
    scope,
    installedAt: new Date().toISOString(),
    note: `bundled-into-cabinet from ${source.origin}`,
  });

  return NextResponse.json({ ok: true, key, scope, fromOrigin: source.origin });
}
