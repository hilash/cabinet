import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { runOneShotProviderPrompt } from "@/lib/agents/provider-runtime";

const DATA_DIR = path.join(process.cwd(), "data");

export async function POST(req: NextRequest) {
  try {
    const { prompt, workdir, providerId, captureOutput = true } = await req.json();

    if (!prompt) {
      return NextResponse.json(
        { error: "prompt is required" },
        { status: 400 }
      );
    }

    const cwd = workdir ? path.join(DATA_DIR, workdir) : DATA_DIR;

    const result = await runOneShotProviderPrompt({
      providerId,
      prompt,
      cwd,
      timeoutMs: 120_000,
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
