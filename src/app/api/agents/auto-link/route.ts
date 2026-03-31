import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import { buildTree } from "@/lib/storage/tree-builder";
import type { TreeNode } from "@/types";

function flattenPaths(nodes: TreeNode[]): string[] {
  const paths: string[] = [];
  for (const node of nodes) {
    paths.push(`${node.path} (${node.frontmatter?.title || node.name})`);
    if (node.children) paths.push(...flattenPaths(node.children));
  }
  return paths;
}

export async function POST(req: NextRequest) {
  try {
    const { title, description } = await req.json();
    if (!title) {
      return NextResponse.json({ error: "title is required" }, { status: 400 });
    }

    const tree = await buildTree();
    const pageList = flattenPaths(tree).join("\n");

    const prompt = `Given this task:
Title: ${title}
Description: ${description || "None"}

And these knowledge base pages:
${pageList}

Return ONLY a JSON array of page paths that are relevant to this task. Example: ["companies/competitors", "engineering/api-docs"]
If no pages are relevant, return []. Return ONLY the JSON array, nothing else.`;

    const result = await new Promise<string>((resolve, reject) => {
      const proc = spawn(
        "claude",
        ["--dangerously-skip-permissions", "-p", prompt, "--output-format", "text"],
        { stdio: ["pipe", "pipe", "pipe"] }
      );

      let stdout = "";
      proc.stdout.on("data", (d: Buffer) => { stdout += d.toString(); });
      proc.on("close", (code) => {
        if (code === 0) resolve(stdout.trim());
        else reject(new Error(`Exit code ${code}`));
      });
      proc.on("error", reject);
      setTimeout(() => { proc.kill(); reject(new Error("Timeout")); }, 30_000);
    });

    // Parse the JSON array from Claude's response
    let linkedPages: string[] = [];
    try {
      const match = result.match(/\[[\s\S]*\]/);
      if (match) {
        linkedPages = JSON.parse(match[0]);
      }
    } catch {
      linkedPages = [];
    }

    return NextResponse.json({ linkedPages });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
