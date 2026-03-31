import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import { DATA_DIR } from "@/lib/storage/path-utils";

const CONFIG_DIR = path.join(DATA_DIR, ".agents", ".config");
const COMPANY_FILE = path.join(CONFIG_DIR, "company.json");

export async function GET() {
  try {
    const raw = await fs.readFile(COMPANY_FILE, "utf-8");
    return NextResponse.json(JSON.parse(raw));
  } catch {
    return NextResponse.json({ exists: false });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  await fs.mkdir(CONFIG_DIR, { recursive: true });
  await fs.writeFile(COMPANY_FILE, JSON.stringify(body, null, 2), "utf-8");

  return NextResponse.json({ ok: true }, { status: 201 });
}
