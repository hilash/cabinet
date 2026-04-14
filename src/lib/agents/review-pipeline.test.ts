import test from "node:test";
import assert from "node:assert/strict";
import { parseReviewProviderResponse, resolveGitWorkdir } from "./review-pipeline";

test("parseReviewProviderResponse parses fenced JSON object", () => {
  const parsed = parseReviewProviderResponse(`\`\`\`json
{
  "summary": "Found one issue.",
  "overallRisk": "high",
  "findings": [
    {
      "severity": "critical",
      "file": "src/main.ts",
      "line": 42,
      "title": "Null dereference",
      "details": "Value can be null before property access.",
      "suggestion": "Guard for null before reading property."
    }
  ],
  "testRecommendations": ["Add a null-path unit test"]
}
\`\`\``);

  assert.equal(parsed.summary, "Found one issue.");
  assert.equal(parsed.overallRisk, "high");
  assert.equal(parsed.findings.length, 1);
  assert.equal(parsed.findings[0]?.severity, "critical");
  assert.equal(parsed.findings[0]?.file, "src/main.ts");
  assert.equal(parsed.findings[0]?.line, 42);
  assert.equal(parsed.testRecommendations.length, 1);
});

test("parseReviewProviderResponse falls back to array payload", () => {
  const parsed = parseReviewProviderResponse(`[
    {
      "severity": "p1",
      "path": "server/api.ts",
      "line": "12",
      "title": "Missing auth check",
      "description": "Endpoint does not verify caller identity.",
      "fix": "Require auth token validation."
    }
  ]`);

  assert.equal(parsed.findings.length, 1);
  assert.equal(parsed.findings[0]?.severity, "high");
  assert.equal(parsed.findings[0]?.file, "server/api.ts");
  assert.equal(parsed.findings[0]?.line, 12);
  assert.equal(parsed.overallRisk, "high");
});

test("parseReviewProviderResponse rejects non-JSON provider output", () => {
  assert.throws(() => parseReviewProviderResponse("not json"), /not valid JSON/i);
});

test("resolveGitWorkdir rejects absolute paths outside allowed dirs", async () => {
  await assert.rejects(
    () => resolveGitWorkdir("/tmp"),
    /outside allowed directories/
  );
  await assert.rejects(
    () => resolveGitWorkdir("/etc"),
    /outside allowed directories/
  );
  await assert.rejects(
    () => resolveGitWorkdir("/usr/local/bin"),
    /outside allowed directories/
  );
});

test("resolveGitWorkdir accepts repo root (cwd)", async () => {
  const result = await resolveGitWorkdir(process.cwd());
  assert.ok(result.repoRoot);
  assert.ok(result.workdir);
});

test("resolveGitWorkdir accepts no input (defaults to cwd)", async () => {
  const result = await resolveGitWorkdir();
  assert.ok(result.repoRoot);
  assert.equal(result.workdir, process.cwd());
});
