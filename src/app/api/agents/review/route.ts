import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import { DATA_DIR } from "@/lib/storage/path-utils";

export async function POST(req: NextRequest) {
  try {
    const { taskId, title, description, tags, linkedPages } = await req.json();

    if (!title) {
      return NextResponse.json(
        { error: "title is required" },
        { status: 400 }
      );
    }

    const prompt = `You are an AI task reviewer for a startup knowledge base. Review this task and suggest improvements.

TASK:
- Title: ${title}
- Description: ${description || "(none)"}
- Tags: ${tags?.length ? tags.join(", ") : "(none)"}
- Linked KB pages: ${linkedPages?.length ? linkedPages.join(", ") : "(none)"}

Respond with ONLY a JSON object (no markdown, no code fences, no explanation) with these fields:
{
  "description": "improved description with clear scope and acceptance criteria (2-4 sentences)",
  "tags": ["suggested", "tags", "max-4"],
  "priority": "P0|P1|P2",
  "estimatedEffort": "small|medium|large",
  "acceptanceCriteria": ["criterion 1", "criterion 2", "criterion 3"],
  "suggestions": "one sentence of strategic advice about this task"
}

Rules:
- Keep the original intent — don't change what the task is about
- Description should be actionable and specific
- Tags should categorize the work area (engineering, research, gtm, ops, etc.)
- Priority: P0 = do now, P1 = do this week, P2 = backlog
- Acceptance criteria should be concrete and verifiable
- Output ONLY valid JSON, nothing else`;

    const result = await new Promise<string>((resolve, reject) => {
      const proc = spawn(
        "claude",
        ["--dangerously-skip-permissions", "-p", prompt, "--output-format", "text"],
        {
          cwd: DATA_DIR,
          env: { ...process.env },
          stdio: ["pipe", "pipe", "pipe"],
        }
      );

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
          reject(new Error(stderr || `Exited with code ${code}`));
        }
      });

      proc.on("error", (err: Error) => {
        reject(new Error(`Failed to spawn claude: ${err.message}`));
      });

      setTimeout(() => {
        proc.kill();
        reject(new Error("Timed out after 2 minutes"));
      }, 120_000);
    });

    // Parse the JSON from Claude's response
    // Handle cases where Claude wraps in code fences
    let cleaned = result.trim();
    if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    const review = JSON.parse(cleaned);

    return NextResponse.json({
      ok: true,
      taskId,
      review,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
