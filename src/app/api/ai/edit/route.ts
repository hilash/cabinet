import { NextRequest, NextResponse } from "next/server";
import { readPage, writePage } from "@/lib/storage/page-io";
import { DATA_DIR } from "@/lib/storage/path-utils";
import path from "path";

export async function POST(req: NextRequest) {
  try {
    const { pagePath, instruction } = await req.json();
    if (!pagePath || !instruction) {
      return NextResponse.json(
        { error: "pagePath and instruction are required" },
        { status: 400 }
      );
    }

    // Read current page content
    const page = await readPage(pagePath);
    const currentContent = page.content;

    // Build prompt for Claude — the key is to make Claude edit the FILE DIRECTLY
    // using its tools, not return content as stdout
    const prompt = `You are an AI editor working in a knowledge base. Your task is to edit a markdown file.

IMPORTANT RULES:
1. READ the file first, then make TARGETED edits. Do NOT rewrite the entire file.
2. PRESERVE all existing content unless the user explicitly asks to remove or replace it.
3. When asked to "add" something, INSERT it in the appropriate place — do not delete existing content.
4. When asked to "change" or "update" something, modify only the specific part mentioned.
5. The file is at: ${path.join(DATA_DIR, pagePath, "index.md")} (or ${path.join(DATA_DIR, pagePath + ".md")})
6. After editing, briefly confirm what you changed (1-2 sentences).

The file currently contains:
\`\`\`markdown
${currentContent}
\`\`\`

User request: ${instruction}

Edit the file now. Use your file editing tools to make the changes directly. Remember: make TARGETED edits, preserve existing content.`;

    const { spawn } = await import("child_process");

    // Use Claude with tool access to edit the file directly
    const cwd = path.join(DATA_DIR, pagePath.split("/")[0] ? "" : "");
    const result = await new Promise<string>((resolve, reject) => {
      const args = [
        "--dangerously-skip-permissions",
        "-p",
        prompt,
        "--output-format",
        "text",
      ];
      const proc = spawn("claude", args, {
        cwd: DATA_DIR,
        env: { ...process.env },
        stdio: ["pipe", "pipe", "pipe"],
      });

      let stdout = "";
      let stderr = "";

      proc.stdout.on("data", (data: Buffer) => {
        stdout += data.toString();
      });

      proc.stderr.on("data", (data: Buffer) => {
        stderr += data.toString();
      });

      proc.on("close", (code: number | null) => {
        if (code === 0) {
          resolve(stdout.trim());
        } else {
          reject(new Error(stderr || `claude exited with code ${code}`));
        }
      });

      proc.on("error", (err: Error) => {
        reject(new Error(`Failed to spawn claude: ${err.message}`));
      });

      setTimeout(() => {
        proc.kill();
        reject(new Error("Claude timed out after 2 minutes"));
      }, 120_000);
    });

    // Claude edited the file directly via its tools — re-read the page
    const updatedPage = await readPage(pagePath);

    return NextResponse.json({
      ok: true,
      content: updatedPage.content,
      message: result, // Claude's summary of what it did
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
