import test from "node:test";
import assert from "node:assert/strict";
import { parseSource } from "./import-source";

test("parses github: shorthand without skill", () => {
  const parsed = parseSource("github:anthropics/skills");
  assert.deepEqual(parsed, {
    kind: "github",
    owner: "anthropics",
    repo: "skills",
    skillName: undefined,
  });
});

test("parses github: shorthand with skill", () => {
  const parsed = parseSource("github:anthropics/skills/release");
  assert.deepEqual(parsed, {
    kind: "github",
    owner: "anthropics",
    repo: "skills",
    skillName: "release",
  });
});

test("parses skills.sh URL with three segments", () => {
  const parsed = parseSource("https://skills.sh/anthropics/skills/release");
  assert.deepEqual(parsed, {
    kind: "skills_sh",
    owner: "anthropics",
    repo: "skills",
    skillName: "release",
  });
});

test("parses skills.sh URL without skill segment", () => {
  const parsed = parseSource("https://skills.sh/vercel-labs/skills");
  assert.equal(parsed?.kind, "skills_sh");
  assert.equal(parsed?.owner, "vercel-labs");
  assert.equal(parsed?.repo, "skills");
  assert.equal(parsed?.skillName, undefined);
});

test("parses github.com URL with .git suffix", () => {
  const parsed = parseSource("https://github.com/shadcn-ui/ui.git");
  assert.deepEqual(parsed, {
    kind: "github",
    owner: "shadcn-ui",
    repo: "ui",
  });
});

test("parses github.com URL with extra path segments", () => {
  const parsed = parseSource("https://github.com/shadcn-ui/ui/tree/main/registry");
  assert.deepEqual(parsed, {
    kind: "github",
    owner: "shadcn-ui",
    repo: "ui",
  });
});

test("parses local: with absolute path", () => {
  const parsed = parseSource("local:/Users/me/skills/my-skill");
  assert.deepEqual(parsed, {
    kind: "local",
    localPath: "/Users/me/skills/my-skill",
  });
});

test("trims whitespace before parsing", () => {
  const parsed = parseSource("   github:foo/bar   ");
  assert.equal(parsed?.kind, "github");
  assert.equal(parsed?.owner, "foo");
});

test("returns null for empty input", () => {
  assert.equal(parseSource(""), null);
  assert.equal(parseSource("   "), null);
});

test("returns null for unrecognized format", () => {
  assert.equal(parseSource("not a real url"), null);
  assert.equal(parseSource("ftp://example.com/bar"), null);
  assert.equal(parseSource("https://example.com/repo"), null);
});

test("returns null for local: with empty path", () => {
  assert.equal(parseSource("local:"), null);
});

test("preserves non-https github URLs", () => {
  const parsed = parseSource("http://github.com/foo/bar");
  assert.deepEqual(parsed, { kind: "github", owner: "foo", repo: "bar" });
});
