import test from "node:test";
import assert from "node:assert/strict";
import { resolveSessionOutput } from "./session-output";
import type { PtyManager } from "./pty-manager";

function mockPty(partial: Partial<PtyManager>): PtyManager {
  return {
    getActiveSessionSnapshot: () => null,
    getCompletedOutput: () => null,
    ...partial,
  } as unknown as PtyManager;
}

test("resolveSessionOutput returns the active snapshot when pty has a running session", async () => {
  const pty = mockPty({
    getActiveSessionSnapshot: (id) =>
      id === "abc"
        ? { sessionId: "abc", status: "running", output: "hi" }
        : null,
  });

  const result = await resolveSessionOutput("abc", {
    pty,
    dataDir: "/tmp/does-not-exist-session-output-test",
  });

  assert.equal(result?.status, "running");
  assert.equal(result?.output, "hi");
  assert.equal(result?.sessionId, "abc");
});

test("resolveSessionOutput returns completed snapshot when pty has kept output", async () => {
  const pty = mockPty({
    getCompletedOutput: (id) =>
      id === "done" ? { output: "final", completedAt: Date.now() } : null,
  });

  const result = await resolveSessionOutput("done", {
    pty,
    dataDir: "/tmp/does-not-exist-session-output-test",
  });

  assert.equal(result?.status, "completed");
  assert.equal(result?.output, "final");
});

test("resolveSessionOutput returns null when nothing matches", async () => {
  const result = await resolveSessionOutput("missing", {
    pty: mockPty({}),
    dataDir: "/tmp/does-not-exist-session-output-test",
  });

  assert.equal(result, null);
});
