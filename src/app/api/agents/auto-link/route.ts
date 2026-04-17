import { buildTree } from "@/lib/storage/tree-builder";
import { DATA_DIR } from "@/lib/storage/path-utils";
import { runOneShotProviderPrompt } from "@/lib/agents/provider-runtime";
import {
  HttpError,
  createHandler,
} from "@/lib/http/create-handler";
import type { TreeNode } from "@/types";

function flattenPaths(nodes: TreeNode[]): string[] {
  const paths: string[] = [];
  for (const node of nodes) {
    paths.push(`${node.path} (${node.frontmatter?.title || node.name})`);
    if (node.children) paths.push(...flattenPaths(node.children));
  }
  return paths;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error";
}

export const POST = createHandler({
  handler: async (_input, req) => {
    try {
      const { title, description } = await req.json();
      if (!title) {
        throw new HttpError(400, "title is required");
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

      const result = await runOneShotProviderPrompt({
        prompt,
        cwd: DATA_DIR,
        timeoutMs: 30_000,
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

      return { linkedPages };
    } catch (error) {
      if (error instanceof HttpError) {
        throw error;
      }

      throw new HttpError(500, getErrorMessage(error));
    }
  },
});
