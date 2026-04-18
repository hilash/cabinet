import fs from "fs";
import path from "path";
import {
  finalizeConversation,
  readConversationMeta,
  readConversationTranscript,
} from "../src/lib/agents/runtime/conversation-store";
import type { PtyManager } from "./pty-manager";
import { stripAnsi, transcriptShowsCompletedRun } from "./terminal-utils";

export interface SessionOutputSnapshot {
  sessionId: string;
  status: string;
  output: string;
}

export interface SessionOutputDeps {
  pty: PtyManager;
  dataDir: string;
}

// Shared resolver used by both the daemon HTTP handler and in-process
// consumers (e.g. multica-poller). Checks three sources in order:
//   1. live PTY session buffer
//   2. persisted conversation meta + transcript (with transcript-driven
//      "completed" heuristic for sessions that self-exit via /exit)
//   3. recently completed in-memory output (30-minute retention)
export async function resolveSessionOutput(
  sessionId: string,
  { pty, dataDir }: SessionOutputDeps,
): Promise<SessionOutputSnapshot | null> {
  const active = pty.getActiveSessionSnapshot(sessionId);
  if (active) {
    return active;
  }

  const conversationMeta = await readConversationMeta(sessionId).catch(() => null);
  if (conversationMeta) {
    const transcript = await readConversationTranscript(sessionId).catch(() => "");
    const plainTranscript = stripAnsi(transcript);
    let prompt = "";
    if (conversationMeta.promptPath) {
      const promptPath = path.join(dataDir, conversationMeta.promptPath);
      if (fs.existsSync(promptPath)) {
        prompt = fs.readFileSync(promptPath, "utf8");
      }
    }
    if (
      conversationMeta.status === "running" &&
      transcriptShowsCompletedRun(plainTranscript, prompt)
    ) {
      await finalizeConversation(sessionId, {
        status: "completed",
        exitCode: 0,
        output: plainTranscript,
      }).catch(() => null);
      return { sessionId, status: "completed", output: plainTranscript };
    }
    return { sessionId, status: conversationMeta.status, output: plainTranscript };
  }

  const completed = pty.getCompletedOutput(sessionId);
  if (completed) {
    return { sessionId, status: "completed", output: completed.output };
  }

  return null;
}
