import { parseCabinetBlock } from "../src/lib/agents/conversation-store";

export function stripAnsi(str: string): string {
  return str
    .replace(/\u001B\][^\u0007]*(?:\u0007|\u001B\\)/g, "")
    .replace(/\u001B[P^_][\s\S]*?\u001B\\/g, "")
    .replace(/\u001B\[[0-?]*[ -/]*[@-~]/g, "")
    .replace(/\u001B[@-_]/g, "")
    .replace(/[\u0000-\u0008\u000B-\u001A\u001C-\u001F\u007F]/g, "");
}

export function claudePromptReady(output: string): boolean {
  const plain = stripAnsi(output).replace(/\r/g, "\n");
  return (
    plain.includes("shift+tab to cycle") ||
    /(?:^|\n)[❯>]\s*$/.test(plain)
  );
}

export function claudeIdlePromptVisible(output: string): boolean {
  const plain = stripAnsi(output).replace(/\r/g, "\n");
  return /(?:^|\n)[❯>]\s*$/.test(plain);
}

// Prompt-aware: echoes of the startup prompt can include SUMMARY/ARTIFACT
// placeholder lines that we must not count as "completed".
export function transcriptShowsCompletedRun(output: string, prompt?: string): boolean {
  const parsed = parseCabinetBlock(output, prompt);
  if (parsed.summary || parsed.artifactPaths.length > 0) {
    return true;
  }

  const plain = stripAnsi(output).replace(/\r/g, "\n");
  return claudeIdlePromptVisible(plain);
}
