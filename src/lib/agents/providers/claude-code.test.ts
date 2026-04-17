import test from "node:test";
import assert from "node:assert/strict";
import { extractFinalResultFromStreamJson } from "./claude-code";

test("stream-json parser prefers result event .result field", () => {
  const stdout = [
    JSON.stringify({ type: "system", subtype: "init", session_id: "abc" }),
    JSON.stringify({ type: "assistant", message: { content: [{ type: "text", text: "thinking..." }] } }),
    JSON.stringify({ type: "assistant", message: { content: [{ type: "text", text: "partial answer" }] } }),
    JSON.stringify({ type: "result", subtype: "success", is_error: false, result: "final answer" }),
  ].join("\n");

  assert.equal(extractFinalResultFromStreamJson(stdout), "final answer");
});

test("stream-json parser falls back to assistant text when no result event", () => {
  const stdout = [
    JSON.stringify({ type: "assistant", message: { content: [{ type: "text", text: "line one" }] } }),
    JSON.stringify({ type: "assistant", message: { content: [{ type: "text", text: "line two" }] } }),
  ].join("\n");

  assert.equal(extractFinalResultFromStreamJson(stdout), "line one\nline two");
});

test("stream-json parser ignores malformed JSON lines", () => {
  const stdout = [
    "not a json line",
    "",
    "{ broken",
    JSON.stringify({ type: "result", result: "ok" }),
    "trailing garbage",
  ].join("\n");

  assert.equal(extractFinalResultFromStreamJson(stdout), "ok");
});

test("stream-json parser returns raw stdout when no structured events present", () => {
  const stdout = "just plain text output";
  assert.equal(extractFinalResultFromStreamJson(stdout), "just plain text output");
});

test("stream-json parser ignores tool_use blocks and keeps text-only content", () => {
  const stdout = [
    JSON.stringify({
      type: "assistant",
      message: {
        content: [
          { type: "text", text: "calling a tool" },
          { type: "tool_use", id: "t1", name: "Read", input: {} },
        ],
      },
    }),
  ].join("\n");

  assert.equal(extractFinalResultFromStreamJson(stdout), "calling a tool");
});

test("stream-json parser trims surrounding whitespace from result", () => {
  const stdout = JSON.stringify({ type: "result", result: "\n  final answer  \n" });
  assert.equal(extractFinalResultFromStreamJson(stdout), "final answer");
});
