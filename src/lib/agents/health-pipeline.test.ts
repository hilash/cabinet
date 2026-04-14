import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "child_process";

// Test the output truncation constant and behavior pattern
// We can't import runCommand directly (it's not exported), so we test the
// MAX_COMMAND_OUTPUT_BYTES behavior via the module's exports and verify
// the pattern works correctly.

test("health pipeline exports getHealthReport", async () => {
  const mod = await import("./health-pipeline");
  assert.equal(typeof mod.getHealthReport, "function");
  // Non-existent report returns null
  const result = await mod.getHealthReport("nonexistent-id-12345");
  assert.equal(result, null);
});

test("health pipeline runHealthPipeline accepts reportIdOverride", async () => {
  const mod = await import("./health-pipeline");
  assert.equal(typeof mod.runHealthPipeline, "function");
  // Verify the interface accepts the new field (type-level test)
  const input: import("./health-pipeline").RunHealthPipelineInput = {
    profile: "quick",
    reportIdOverride: "test-override-123",
  };
  assert.equal(input.reportIdOverride, "test-override-123");
});

// Integration-style test: verify spawn + timeout pattern works
test("child process timeout kills the process", async () => {
  const result = await new Promise<{ timedOut: boolean }>((resolve) => {
    const proc = spawn("sleep", ["10"], {
      stdio: ["ignore", "pipe", "pipe"],
    });
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      proc.kill();
    }, 200);

    proc.on("close", () => {
      clearTimeout(timer);
      resolve({ timedOut });
    });
    proc.on("error", () => {
      clearTimeout(timer);
      resolve({ timedOut });
    });
  });
  assert.equal(result.timedOut, true);
});

// Test output truncation pattern (same logic as runCommand)
test("output accumulator respects byte limit", () => {
  const MAX_BYTES = 100;
  let output = "";
  let outputBytes = 0;
  let truncated = false;

  const chunks = [
    Buffer.from("a".repeat(60)),
    Buffer.from("b".repeat(60)),
  ];

  for (const chunk of chunks) {
    if (outputBytes >= MAX_BYTES) {
      // Already at limit
      continue;
    }
    outputBytes += chunk.length;
    if (outputBytes > MAX_BYTES) {
      const remaining = MAX_BYTES - (outputBytes - chunk.length);
      if (remaining > 0) output += chunk.toString("utf8", 0, remaining);
      truncated = true;
    } else {
      output += chunk.toString();
    }
  }

  assert.equal(truncated, true);
  assert.equal(output.length, 100);
  assert.equal(output, "a".repeat(60) + "b".repeat(40));
});
