import { NextResponse } from "next/server";
import { spawn } from "child_process";
import { DATA_DIR } from "@/lib/storage/path-utils";
import { runOneShotProviderPrompt } from "@/lib/agents/provider-runtime";
import path from "path";

export async function POST() {
  try {
    // Get yesterday's git activity
    let gitLog = "";
    try {
      const gitProc = await new Promise<string>((resolve, reject) => {
        const proc = spawn("git", ["log", "--since=yesterday", "--oneline", "--stat"], {
          cwd: DATA_DIR,
          stdio: ["pipe", "pipe", "pipe"],
        });
        let out = "";
        proc.stdout.on("data", (d: Buffer) => { out += d.toString(); });
        proc.on("close", () => resolve(out));
        proc.on("error", reject);
      });
      gitLog = gitProc;
    } catch {
      gitLog = "No git history available.";
    }

    // Read task board for completed tasks
    let taskInfo = "";
    try {
      const yaml = (await import("js-yaml")).default;
      const fs = await import("fs/promises");
      const boardPath = path.join(DATA_DIR, "tasks", "board.yaml");
      const raw = await fs.readFile(boardPath, "utf-8");
      const board = yaml.load(raw) as { columns: { name: string; tasks: { title: string }[] }[] };
      if (board?.columns) {
        const done = board.columns.find(c => c.name === "Done");
        const inProgress = board.columns.find(c => c.name === "In Progress");
        taskInfo = `Done tasks: ${done?.tasks?.map(t => t.title).join(", ") || "none"}\nIn progress: ${inProgress?.tasks?.map(t => t.title).join(", ") || "none"}`;
      }
    } catch {
      taskInfo = "No task data available.";
    }

    const prompt = `Generate a brief daily digest for the Cabinet knowledge base.

Yesterday's git activity:
${gitLog || "No changes recorded."}

Task status:
${taskInfo}

Format the digest as a concise markdown summary with:
- Key changes (what was added/modified)
- Task progress
- Any notable items

Keep it under 200 words. Be specific about what changed.`;

    const result = await runOneShotProviderPrompt({
      prompt,
      cwd: DATA_DIR,
      timeoutMs: 60_000,
    });

    return NextResponse.json({ ok: true, digest: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
