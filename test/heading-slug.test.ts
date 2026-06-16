import test from "node:test";
import assert from "node:assert/strict";
import { slugifyHeading, addHeadingIds } from "@/lib/markdown/heading-slug";

test("slugifyHeading matches the editor decoration scheme", () => {
  assert.equal(slugifyHeading("Field mapping"), "field-mapping");
  assert.equal(slugifyHeading("Sources"), "sources");
  assert.equal(slugifyHeading("Rules of the road"), "rules-of-the-road");
  assert.equal(slugifyHeading("How rows get in — ingestion spec"), "how-rows-get-in-ingestion-spec");
});

test("addHeadingIds injects ids into bare headings", () => {
  const html = "<h1>Title</h1><p>x</p><h2>Field mapping</h2>";
  const out = addHeadingIds(html);
  assert.match(out, /<h1 id="title">Title<\/h1>/);
  assert.match(out, /<h2 id="field-mapping">Field mapping<\/h2>/);
});

test("addHeadingIds dedupes repeated headings", () => {
  const out = addHeadingIds("<h2>Notes</h2><h2>Notes</h2>");
  assert.match(out, /<h2 id="notes">Notes<\/h2><h2 id="notes-1">Notes<\/h2>/);
});

test("addHeadingIds slugs from text, preserving inner markup", () => {
  const out = addHeadingIds("<h3>Use <code>buildPath</code> here</h3>");
  assert.match(out, /<h3 id="use-buildpath-here">Use <code>buildPath<\/code> here<\/h3>/);
});
