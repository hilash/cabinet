import test from "node:test";
import assert from "node:assert/strict";
import { parseCabinetBlock } from "./conversation-store";

test("parseCabinetBlock canonicalizes artifact paths for KB pages", () => {
  const parsed = parseCabinetBlock(`
SUMMARY: Updated the brief
ARTIFACT: /: marketing/you-dont-need-better-prompts-you-need-better-recovery/index.md
ARTIFACT: /data/notes/launch-plan.md
`);

  assert.deepEqual(parsed.artifactPaths, [
    "marketing/you-dont-need-better-prompts-you-need-better-recovery",
    "notes/launch-plan",
  ]);
});

test("parseCabinetBlock canonicalizes plain relative artifact paths", () => {
  const parsed = parseCabinetBlock(`
SUMMARY: Updated the brief
ARTIFACT: ./marketing/you-dont-need-better-prompts-you-need-better-recovery/index.md
ARTIFACT: ./notes/launch-plan.md
`);

  assert.deepEqual(parsed.artifactPaths, [
    "marketing/you-dont-need-better-prompts-you-need-better-recovery",
    "notes/launch-plan",
  ]);
});
