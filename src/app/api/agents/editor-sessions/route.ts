import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { DATA_DIR } from "@/lib/storage/path-utils";
import {
  ensureDirectory,
  fileExists,
  readFileContent,
  writeFileContent,
} from "@/lib/storage/fs-operations";
import fs from "fs/promises";

const HISTORY_DIR = path.join(DATA_DIR, ".agents", ".history");

export interface EditorSession {
  id: string;
  pagePath: string;
  instruction: string;
  timestamp: string;
  duration: number;
  status: "completed" | "failed" | "running";
  summary: string; // short summary
  output?: string; // full captured terminal output
}

// GET /api/agents/editor-sessions?page=xxx&id=xxx — get sessions
export async function GET(req: NextRequest) {
  const pagePath = req.nextUrl.searchParams.get("page");
  const sessionId = req.nextUrl.searchParams.get("id");
  const limit = parseInt(req.nextUrl.searchParams.get("limit") || "50", 10);

  await ensureDirectory(HISTORY_DIR);
  const historyFile = path.join(HISTORY_DIR, "editor-sessions.jsonl");

  if (!(await fileExists(historyFile))) {
    return NextResponse.json(sessionId ? null : []);
  }

  const raw = await readFileContent(historyFile);
  const lines = raw.trim().split("\n").filter(Boolean);
  let records: EditorSession[] = lines
    .map((l) => {
      try {
        return JSON.parse(l) as EditorSession;
      } catch {
        return null;
      }
    })
    .filter(Boolean) as EditorSession[];

  // Get single session by ID
  if (sessionId) {
    const session = records.find((r) => r.id === sessionId);
    return NextResponse.json(session || null);
  }

  // Filter by page if specified
  if (pagePath) {
    records = records.filter((r) => r.pagePath === pagePath);
  }

  // Return most recent first, limited
  records.reverse();
  records = records.slice(0, limit);

  // Strip large output field from list responses (fetch individually)
  const stripped = records.map(({ output, ...rest }) => rest);

  return NextResponse.json(stripped);
}

// POST /api/agents/editor-sessions — record a completed session
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { id, pagePath, instruction, timestamp, duration, status, summary, output } =
    body as EditorSession;

  if (!id || !pagePath || !instruction) {
    return NextResponse.json(
      { error: "id, pagePath, and instruction are required" },
      { status: 400 }
    );
  }

  const record: EditorSession = {
    id,
    pagePath,
    instruction,
    timestamp: timestamp || new Date().toISOString(),
    duration: duration || 0,
    status: status || "completed",
    summary: summary || "",
    output: output || "",
  };

  await ensureDirectory(HISTORY_DIR);
  const historyFile = path.join(HISTORY_DIR, "editor-sessions.jsonl");

  const line = JSON.stringify(record) + "\n";
  try {
    await fs.appendFile(historyFile, line);
  } catch {
    await writeFileContent(historyFile, line);
  }

  // Also record in the editor agent's heartbeat history for the agents panel
  const editorHeartbeat = {
    agentSlug: "editor",
    timestamp: record.timestamp,
    duration: record.duration,
    status: record.status,
    summary: `[${record.pagePath}] ${record.instruction.slice(0, 200)}${record.instruction.length > 200 ? "..." : ""}`,
  };

  const heartbeatFile = path.join(HISTORY_DIR, "editor.jsonl");
  const hbLine = JSON.stringify(editorHeartbeat) + "\n";
  try {
    await fs.appendFile(heartbeatFile, hbLine);
  } catch {
    await writeFileContent(heartbeatFile, hbLine);
  }

  return NextResponse.json({ ok: true });
}
