import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import { getDataDir } from "@/lib/storage/path-utils";
import { route } from "@/lib/runtime/route-wrapper";

function configDir(): string { return path.join(getDataDir(), ".agents", ".config"); }
function workspaceFile(): string { return path.join(configDir(), "workspace.json"); }
function companyFile(): string { return path.join(configDir(), "company.json"); }

async function readJson(file: string): Promise<Record<string, unknown> | null> {
  try {
    const raw = await fs.readFile(file, "utf-8");
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export const GET = route(async () => {
  // Prefer the v2 workspace.json; fall back to legacy company.json.
  const workspace = await readJson(workspaceFile());
  if (workspace) {
    return NextResponse.json(workspace);
  }

  const company = await readJson(companyFile());
  if (company) {
    // Synthesize a v2-shaped payload so callers don't need to branch.
    const companyData =
      (company.company as { name?: string; description?: string; teamSize?: string }) || {};
    return NextResponse.json({
      exists: true,
      version: 1,
      home: { name: "Home" },
      room: { id: "office-01", type: "office", name: "The Office" },
      cabinet: {
        name: companyData.name || "My Cabinet",
        description: companyData.description || "",
        size: companyData.teamSize || "",
      },
      setupDate: company.setupDate,
      // Expose legacy shape alongside so existing consumers still work.
      company: companyData,
    });
  }

  return NextResponse.json({ exists: false });
});

export const POST = route(async (req: NextRequest) => {
  const body = await req.json();

  await fs.mkdir(configDir(), { recursive: true });
  // Write to the legacy file for backward compatibility with callers that
  // still POST the old shape. The canonical config is managed by the
  // onboarding setup route now.
  await fs.writeFile(companyFile(), JSON.stringify(body, null, 2), "utf-8");

  return NextResponse.json({ ok: true }, { status: 201 });
});
