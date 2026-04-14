import test from "node:test";
import assert from "node:assert/strict";
import { buildManualConversationPrompt } from "../src/lib/agents/conversation-runner";
import { parseCabinetBlock } from "../src/lib/agents/conversation-store";

test("parseCabinetBlock strips Claude spinner noise from artifact lines", () => {
  const parsed = parseCabinetBlock([
    "SUMMARY: Created Harry Potter 10-character relationship diagram ───────────────────────❯",
    "CONTEXT: New KB section for Harry Potter character overview",
    "ARTIFACT: harry-potter/characters.mermaid",
    "ARTIFACT: harry-potter/index.md ✽Undulating… (41s · ↓ 1.1k tokens)",
  ].join("\n"));

  assert.equal(
    parsed.summary,
    "Created Harry Potter 10-character relationship diagram"
  );
  assert.equal(
    parsed.contextSummary,
    "New KB section for Harry Potter character overview"
  );
  assert.deepEqual(parsed.artifactPaths, [
    "harry-potter/characters.mermaid",
    "harry-potter/index.md",
  ]);
});

test("manual cabinet-scoped prompts explicitly pin work to the cabinet root", async () => {
  const prompt = await buildManualConversationPrompt({
    agentSlug: "general",
    userMessage: "Make a diagram",
    cabinetPath: "hilas-cabinet",
  });

  assert.equal(
    prompt.cwd,
    "/Users/mybiblepath/Development/cabinet/data/hilas-cabinet"
  );
  assert.match(
    prompt.prompt,
    /Work only inside the cabinet-scoped knowledge base rooted at \/data\/hilas-cabinet\./
  );
  assert.match(
    prompt.prompt,
    /Do not create or modify files in sibling cabinets or the global \/data root/
  );
  assert.match(
    prompt.prompt,
    /Prefer Mermaid edge labels like `A -->\|label\| B` or `A -\.\->\|label\| B`/
  );
});
