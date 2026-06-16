import test from "node:test";
import assert from "node:assert/strict";
import { buildPath, parsePath } from "@/lib/navigation/route-scheme";
import type { SelectedSection } from "@/stores/app-store";

// PRD §11 clean-path scheme: /room/<path>, /-/ view marker, no #, no /data/.

test("buildPath: globals", () => {
  assert.equal(buildPath({ type: "home" }, null), "/");
  assert.equal(buildPath({ type: "help" }, null), "/help");
  assert.equal(buildPath({ type: "settings" }, null), "/settings");
  assert.equal(buildPath({ type: "settings", slug: "providers" }, null), "/settings/providers");
  assert.equal(buildPath({ type: "integrations", slug: "discord" }, null), "/integrations/discord");
});

test("buildPath: content mirrors the file tree (no /data/, no doubling)", () => {
  assert.equal(
    buildPath({ type: "page", cabinetPath: "hilas-home/cabinet-data/Development/dev" }, "hilas-home/cabinet-data/Development/dev/feedback-tracker"),
    "/room/hilas-home/cabinet-data/Development/dev/feedback-tracker"
  );
  assert.equal(buildPath({ type: "cabinet", cabinetPath: "hilas-home" }, null), "/room/hilas-home");
});

test("buildPath: cabinet views behind the /-/ marker", () => {
  const cab = "hilas-home/cabinet-data/Development/dev";
  assert.equal(buildPath({ type: "agents", cabinetPath: cab }, null), `/room/${cab}/-/agents`);
  assert.equal(buildPath({ type: "agents", cabinetPath: cab, agentsTab: "routines" }, null), `/room/${cab}/-/agents/routines`);
  assert.equal(buildPath({ type: "agent", cabinetPath: cab, slug: "harel" }, null), `/room/${cab}/-/agents/harel`);
  assert.equal(buildPath({ type: "tasks", cabinetPath: cab }, null), `/room/${cab}/-/tasks`);
  assert.equal(buildPath({ type: "task", cabinetPath: cab, taskId: "t-1" }, null), `/room/${cab}/-/tasks/t-1`);
});

test("parsePath: globals", () => {
  assert.deepEqual(parsePath("/"), { kind: "home" });
  assert.deepEqual(parsePath("/help"), { kind: "help" });
  assert.deepEqual(parsePath("/settings"), { kind: "settings", slug: undefined });
  assert.deepEqual(parsePath("/settings/providers"), { kind: "settings", slug: "providers" });
});

test("parsePath: deep content is a single content route", () => {
  assert.deepEqual(parsePath("/room/a/b/c/d/feedback-tracker"), {
    kind: "content",
    path: "a/b/c/d/feedback-tracker",
  });
  assert.deepEqual(parsePath("/room/hilas-home"), { kind: "content", path: "hilas-home" });
});

test("parsePath: /-/ marker splits cabinet from view at any depth", () => {
  assert.deepEqual(parsePath("/room/a/b/c/-/agents"), { kind: "agents", cabinetPath: "a/b/c" });
  assert.deepEqual(parsePath("/room/a/b/c/-/agents/routines"), { kind: "agents", cabinetPath: "a/b/c", agentsTab: "routines" });
  assert.deepEqual(parsePath("/room/a/b/c/-/agents/harel"), { kind: "agent", cabinetPath: "a/b/c", slug: "harel" });
  assert.deepEqual(parsePath("/room/a/b/c/-/tasks"), { kind: "tasks", cabinetPath: "a/b/c" });
  assert.deepEqual(parsePath("/room/a/b/c/-/tasks/t-9"), { kind: "task", cabinetPath: "a/b/c", taskId: "t-9" });
});

test("round-trip: parsePath(buildPath(x)) is stable for nested paths", () => {
  const cab = "hilas-home/cabinet-data/Development/dev";
  const cases: Array<[SelectedSection, string | null]> = [
    [{ type: "cabinet", cabinetPath: cab }, null],
    [{ type: "page", cabinetPath: cab }, `${cab}/feedback-tracker/ingestion`],
    [{ type: "agents", cabinetPath: cab }, null],
    [{ type: "agents", cabinetPath: cab, agentsTab: "heartbeats" }, null],
    [{ type: "agent", cabinetPath: cab, slug: "harel" }, null],
    [{ type: "tasks", cabinetPath: cab }, null],
    [{ type: "task", cabinetPath: cab, taskId: "launch review" }, null],
    [{ type: "settings", slug: "providers" }, null],
  ];
  for (const [section, pagePath] of cases) {
    const route = parsePath(buildPath(section, pagePath));
    if (section.type === "cabinet") {
      assert.deepEqual(route, { kind: "content", path: cab });
    } else if (section.type === "page") {
      assert.deepEqual(route, { kind: "content", path: pagePath });
    } else if (section.type === "agents") {
      assert.equal(route.kind, "agents");
      if (route.kind === "agents") {
        assert.equal(route.cabinetPath, cab);
        assert.equal(route.agentsTab, section.agentsTab);
      }
    } else if (section.type === "agent") {
      assert.deepEqual(route, { kind: "agent", cabinetPath: cab, slug: "harel" });
    } else if (section.type === "tasks") {
      assert.deepEqual(route, { kind: "tasks", cabinetPath: cab });
    } else if (section.type === "task") {
      assert.deepEqual(route, { kind: "task", cabinetPath: cab, taskId: "launch review" });
    } else if (section.type === "settings") {
      assert.deepEqual(route, { kind: "settings", slug: "providers" });
    }
  }
});

test("a content path that itself contains 'tasks'/'agents' is not mis-split", () => {
  // No /-/ marker → whole thing is content, even though it contains 'agents'.
  assert.deepEqual(parsePath("/room/work/agents/notes"), { kind: "content", path: "work/agents/notes" });
});
