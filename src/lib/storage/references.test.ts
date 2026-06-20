import { test } from "node:test";
import assert from "node:assert/strict";
import { resolvePageBySlug } from "@/lib/storage/references";

// Regression: wiki-links inside imported (Notion) pages keep human folder names
// like "Day 1-100 Build 👩🏻‍💻", so resolution must match by *slugified* last
// path segment, not just exact filesystem name.
test("resolvePageBySlug matches human-named imported pages by slug", () => {
  const pages = [
    { path: "home/My Bible Path 👩🏻‍💻💰", name: "My Bible Path 👩🏻‍💻💰" },
    {
      path: "home/My Bible Path 👩🏻‍💻💰/Day 1-100 Build 👩🏻‍💻",
      name: "Day 1-100 Build 👩🏻‍💻",
    },
  ];
  assert.equal(
    resolvePageBySlug("day-1-100-build", "home/My Bible Path 👩🏻‍💻💰", pages),
    "home/My Bible Path 👩🏻‍💻💰/Day 1-100 Build 👩🏻‍💻"
  );
});

test("resolvePageBySlug still matches native slug-named pages", () => {
  const pages = [{ path: "notes/day-5", name: "day-5" }];
  assert.equal(resolvePageBySlug("day-5", null, pages), "notes/day-5");
});

test("resolvePageBySlug prefers a sibling on ambiguous slugs", () => {
  const pages = [
    { path: "a/Day 1", name: "Day 1" },
    { path: "b/Day 1", name: "Day 1" },
  ];
  assert.equal(resolvePageBySlug("day-1", "b/Something", pages), "b/Day 1");
});
