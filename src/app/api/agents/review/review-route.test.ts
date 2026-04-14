import test from "node:test";
import assert from "node:assert/strict";
import { validateTaskReviewSchema } from "./task-review-schema";

test("validateTaskReviewSchema accepts valid response", () => {
  const result = validateTaskReviewSchema({
    description: "Implement login page with email/password",
    tags: ["engineering", "auth"],
    priority: "P1",
    estimatedEffort: "medium",
    acceptanceCriteria: ["Login form renders", "JWT issued on success"],
    suggestions: "Consider adding OAuth support.",
  });

  assert.equal(result.description, "Implement login page with email/password");
  assert.deepEqual(result.tags, ["engineering", "auth"]);
  assert.equal(result.priority, "P1");
  assert.equal(result.estimatedEffort, "medium");
  assert.equal(result.acceptanceCriteria.length, 2);
  assert.equal(result.suggestions, "Consider adding OAuth support.");
});

test("validateTaskReviewSchema rejects non-object", () => {
  assert.throws(() => validateTaskReviewSchema("not an object"), /Expected a JSON object/);
  assert.throws(() => validateTaskReviewSchema(null), /Expected a JSON object/);
  assert.throws(() => validateTaskReviewSchema([1, 2]), /Expected a JSON object/);
});

test("validateTaskReviewSchema rejects missing description", () => {
  assert.throws(
    () => validateTaskReviewSchema({ tags: ["x"], priority: "P0" }),
    /Missing or empty 'description'/
  );
});

test("validateTaskReviewSchema normalizes invalid priority to P2", () => {
  const result = validateTaskReviewSchema({
    description: "A task",
    priority: "URGENT",
  });
  assert.equal(result.priority, "P2");
});

test("validateTaskReviewSchema normalizes invalid effort to medium", () => {
  const result = validateTaskReviewSchema({
    description: "A task",
    estimatedEffort: "huge",
  });
  assert.equal(result.estimatedEffort, "medium");
});

test("validateTaskReviewSchema truncates long strings", () => {
  const longStr = "x".repeat(3000);
  const result = validateTaskReviewSchema({
    description: longStr,
    suggestions: longStr,
  });
  assert.equal(result.description.length, 2000);
  assert.equal(result.suggestions.length, 2000);
});

test("validateTaskReviewSchema limits array lengths", () => {
  const result = validateTaskReviewSchema({
    description: "A task",
    tags: Array.from({ length: 20 }, (_, i) => `tag-${i}`),
    acceptanceCriteria: Array.from({ length: 20 }, (_, i) => `crit-${i}`),
  });
  assert.equal(result.tags.length, 10);
  assert.equal(result.acceptanceCriteria.length, 10);
});

test("validateTaskReviewSchema handles case-insensitive priority", () => {
  const result = validateTaskReviewSchema({
    description: "A task",
    priority: "p0",
  });
  assert.equal(result.priority, "P0");
});

test("validateTaskReviewSchema filters non-string tags", () => {
  const result = validateTaskReviewSchema({
    description: "A task",
    tags: ["valid", 123, null, "", "  ", "also-valid"],
  });
  assert.deepEqual(result.tags, ["valid", "also-valid"]);
});
