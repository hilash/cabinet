import test from "node:test";
import assert from "node:assert/strict";
import { DATA_DIR } from "../storage/path-utils";
import {
  buildEditorConversationPrompt,
  buildManualConversationPrompt,
} from "./conversation-runner";

test("buildManualConversationPrompt grants ACP access to the full Cabinet data root", async () => {
  const conversation = await buildManualConversationPrompt({
    agentSlug: "general",
    userMessage: "Review the KB and update any needed pages.",
  });

  assert.deepEqual(conversation.allowedRoots, [DATA_DIR]);
});

test("buildEditorConversationPrompt grants ACP access to the full Cabinet data root", async () => {
  const conversation = await buildEditorConversationPrompt({
    pagePath: "notes/example.md",
    userMessage: "Update this page and related references.",
  });

  assert.deepEqual(conversation.allowedRoots, [DATA_DIR]);
});
