import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";
import { DATA_DIR } from "@/lib/storage/path-utils";

export async function POST(req: NextRequest) {
  try {
    const { prompt, workdir, captureOutput = true } = await req.json();

    if (!prompt) {
      return NextResponse.json(
        { error: "prompt is required" },
        { status: 400 }
      );
    }

    const cwd = workdir ? path.join(DATA_DIR, workdir) : DATA_DIR;

    const result = await new Promise<string>((resolve, reject) => {
      const proc = spawn(
        "claude",
        ["--dangerously-skip-permissions", "-p", prompt, "--output-format", "text"],
        {
          cwd,
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

    return NextResponse.json({
      ok: true,
      output: captureOutput ? result : undefined,
      message: "Completed successfully",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
