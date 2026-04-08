import test from "node:test";
import assert from "node:assert/strict";
import { openKnowledgeBasePage } from "./open-page";

test("openKnowledgeBasePage canonicalizes the path, expands ancestors, and loads the page", async () => {
  const expanded: string[] = [];
  const selected: string[] = [];
  const sections: string[] = [];
  const loaded: string[] = [];

  const resolvedPath = openKnowledgeBasePage({
    rawPath: "marketing/you-dont-need-better-prompts-you-need-better-recovery/index.md",
    expandPath: (path) => expanded.push(path),
    selectPage: (path) => selected.push(path),
    setPageSection: () => sections.push("page"),
    loadPage: async (path) => {
      loaded.push(path);
    },
  });

  assert.equal(resolvedPath, "marketing/you-dont-need-better-prompts-you-need-better-recovery");
  assert.deepEqual(expanded, ["marketing"]);
  assert.deepEqual(selected, ["marketing/you-dont-need-better-prompts-you-need-better-recovery"]);
  assert.deepEqual(sections, ["page"]);
  assert.deepEqual(loaded, ["marketing/you-dont-need-better-prompts-you-need-better-recovery"]);
});
