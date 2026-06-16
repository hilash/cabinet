import test from "node:test";
import assert from "node:assert/strict";
import {
  resolveArtifactTreePath,
  artifactPathToTreePath,
  isExternalArtifactPath,
} from "@/lib/ui/page-type-icons";

// Regression: agents run with cwd DATA_DIR/<cabinetPath>, so the artifact
// paths they report are relative to that cwd. Tree nodes / the /room/<path>
// URL scheme are rooted at data/, so the cwd must be prepended — otherwise the
// first segment is mistaken for a top-level room and the page 404s to a
// "create page" prompt (the reported bug).

const CWD = "hilas-home/cabinet-data/Development/dev";

test("re-roots a cwd-relative artifact path under the task's cabinetPath", () => {
  assert.equal(
    resolveArtifactTreePath("feedback-tracker/github/contributors.md", CWD),
    "hilas-home/cabinet-data/Development/dev/feedback-tracker/github/contributors"
  );
});

test("strips index.md / .md while re-rooting", () => {
  assert.equal(
    resolveArtifactTreePath("feedback-tracker/github/index.md", CWD),
    "hilas-home/cabinet-data/Development/dev/feedback-tracker/github"
  );
});

test("strips a leading data/ prefix before re-rooting", () => {
  assert.equal(
    resolveArtifactTreePath("data/notes/today.md", CWD),
    "hilas-home/cabinet-data/Development/dev/notes/today"
  );
});

test("is idempotent — never double-prefixes an already cabinet-rooted path", () => {
  const full = `${CWD}/feedback-tracker/github/contributors`;
  assert.equal(resolveArtifactTreePath(full, CWD), full);
  // ...and applying it twice is stable.
  assert.equal(
    resolveArtifactTreePath(resolveArtifactTreePath(full, CWD), CWD),
    full
  );
});

test("no-ops when cabinetPath is absent, empty, or the root cabinet", () => {
  const rel = "notes/today.md";
  const tree = artifactPathToTreePath(rel);
  assert.equal(resolveArtifactTreePath(rel), tree);
  assert.equal(resolveArtifactTreePath(rel, ""), tree);
  assert.equal(resolveArtifactTreePath(rel, undefined), tree);
  assert.equal(resolveArtifactTreePath(rel, "."), tree);
});

test("tolerates surrounding slashes on the cabinetPath", () => {
  assert.equal(
    resolveArtifactTreePath("a/b.md", "/room-x/"),
    "room-x/a/b"
  );
});

test("empty artifact path stays empty", () => {
  assert.equal(resolveArtifactTreePath("", CWD), "");
});

// --- isExternalArtifactPath + the resolver's external backstop -------------
// An agent can record an artifact outside DATA_DIR (e.g. Claude Code's
// auto-memory at /Users/.../.claude/...). Those can't render through the page
// API, so callers short-circuit on isExternalArtifactPath, and the resolver
// must never graft a cabinet prefix onto them.

test("flags absolute system paths as external", () => {
  for (const p of [
    "/Users/me/.claude/projects/x/memory/note.md",
    "/tmp/scratch.md",
    "/var/log/x.md",
    "/etc/hosts",
    "/home/me/notes.md",
    "C:/Users/me/file.md",
    "D:\\work\\file.md",
  ]) {
    assert.equal(isExternalArtifactPath(p), true, p);
  }
});

test("does NOT flag in-cabinet / data-rooted paths as external", () => {
  for (const p of [
    "feedback-tracker/github/contributors.md",
    "data/notes/today.md",
    "/data/notes/today.md",
    "/data",
    "kb/reports/foo.md",
    "",
  ]) {
    assert.equal(isExternalArtifactPath(p), false, p);
  }
});

test("does NOT flag relative paths whose first segment looks like a system dir", () => {
  // Regression guard: the prior denylist heuristic stripped leading slashes
  // before matching, so it wrongly flagged these *relative* paths. They're
  // ordinary cabinet folders (this repo even ships a `dev` cabinet).
  for (const p of [
    "dev/notes.md",
    "var/today.md",
    "lib/x.md",
    "home/y.md",
    "Library/z.md",
    "Users/w.md",
  ]) {
    assert.equal(isExternalArtifactPath(p), false, p);
  }
});

test("flags home-relative (~) paths as external", () => {
  assert.equal(isExternalArtifactPath("~/scratch.md"), true);
  assert.equal(isExternalArtifactPath("~/.claude/memory/note.md"), true);
});

test("resolver never prefixes an external path with the cabinet", () => {
  assert.equal(
    resolveArtifactTreePath("/Users/me/.claude/memory/note.md", CWD),
    "Users/me/.claude/memory/note"
  );
});
