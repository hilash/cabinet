#!/usr/bin/env node
/**
 * bodega-bridge.ts — PTY shim for Bodega One provider
 *
 * Cabinet's daemon spawns this script as a PTY subprocess so the AI panel gets
 * streaming output over the terminal layer, exactly like the Claude CLI.
 *
 * Two modes:
 *
 *   One-shot:  npx tsx bodega-bridge.ts --prompt "Do X"
 *   Session:   npx tsx bodega-bridge.ts --session
 *              (reads prompts line-by-line from stdin)
 *
 * Env vars:
 *   BODEGA_ONE_URL          Bodega One backend URL  (default: http://localhost:3000)
 *   BODEGA_MODEL            Model to use            (default: first available)
 *   BODEGA_CONVERSATION_ID  Cabinet conversation ID for session reuse
 *
 * Output format: plain text streamed to stdout. On completion, a <cabinet> block
 * is emitted for Cabinet's conversation finalization parser.
 */

const BASE_URL = process.env.BODEGA_ONE_URL ?? "http://localhost:3000";
const MODEL = process.env.BODEGA_MODEL ?? "";
const CONVERSATION_ID = process.env.BODEGA_CONVERSATION_ID ?? "";

// ─── Session management ───────────────────────────────────────────────────────

let bodegaSessionId: number | undefined;

async function ensureSession(title: string): Promise<number | undefined> {
  if (bodegaSessionId !== undefined) return bodegaSessionId;
  if (!CONVERSATION_ID) return undefined;

  try {
    const res = await fetch(`${BASE_URL}/api/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, type: "chat" }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return undefined;
    const data = (await res.json()) as { id?: number };
    if (typeof data.id === "number") {
      bodegaSessionId = data.id;
      return bodegaSessionId;
    }
    return undefined;
  } catch {
    return undefined;
  }
}

// ─── Model resolution ─────────────────────────────────────────────────────────

let resolvedModel: string | undefined;

async function resolveModel(): Promise<string> {
  if (resolvedModel !== undefined) return resolvedModel;
  if (MODEL) { resolvedModel = MODEL; return resolvedModel; }

  try {
    const res = await fetch(`${BASE_URL}/api/model-hub/catalog/local`, {
      signal: AbortSignal.timeout(3_000),
    });
    if (!res.ok) { resolvedModel = ""; return ""; }
    const catalog = (await res.json()) as Array<{ id: string }>;
    resolvedModel = catalog[0]?.id ?? "";
    return resolvedModel;
  } catch {
    resolvedModel = "";
    return "";
  }
}

// ─── SSE streaming ────────────────────────────────────────────────────────────

async function streamPrompt(prompt: string): Promise<string> {
  const model = await resolveModel();
  const sessionId = await ensureSession(prompt.slice(0, 60));

  const body: Record<string, unknown> = {
    messages: [{ role: "user", content: prompt }],
    permissionMode: "auto",
  };
  if (model) body.model = model;
  if (sessionId !== undefined) body.sessionId = sessionId;

  const res = await fetch(`${BASE_URL}/api/chat/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(180_000),
  });

  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => `HTTP ${res.status}`);
    throw new Error(`Bodega One stream failed: ${text}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let sseBuffer = "";
  let fullContent = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    sseBuffer += decoder.decode(value, { stream: true });
    const lines = sseBuffer.split("\n");
    sseBuffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data: ")) continue;
      const payload = trimmed.slice("data: ".length);
      if (payload === "[DONE]") continue;

      try {
        const json = JSON.parse(payload) as Record<string, unknown>;

        if (json.error) throw new Error(String(json.error));

        if (json.done) {
          if (typeof json.content === "string") fullContent = json.content;
          break;
        }

        const delta = json.delta as Record<string, unknown> | undefined;
        if (delta?.content && typeof delta.content === "string") {
          process.stdout.write(delta.content);
          fullContent += delta.content;
        }
      } catch (e) {
        if (e instanceof SyntaxError) continue; // malformed SSE chunk, skip
        throw e;
      }
    }
  }

  return fullContent;
}

// ─── Cabinet epilogue ─────────────────────────────────────────────────────────

function emitCabinetBlock(summary: string): void {
  const block = [
    "",
    "```cabinet",
    `SUMMARY: ${summary.slice(0, 120).replace(/\n/g, " ")}`,
    "```",
    "",
  ].join("\n");
  process.stdout.write(block);
}

// ─── Entry points ─────────────────────────────────────────────────────────────

async function runOneShot(prompt: string): Promise<void> {
  const result = await streamPrompt(prompt);
  emitCabinetBlock(result);
}

async function runSession(): Promise<void> {
  // Session mode: read lines from stdin, treat each non-empty line as a prompt.
  // Cabinet's initialPrompt is written to stdin after the PTY is ready.
  const { createInterface } = await import("readline");
  const rl = createInterface({ input: process.stdin, terminal: false });

  for await (const line of rl) {
    const prompt = line.trim();
    if (!prompt) continue;

    try {
      const result = await streamPrompt(prompt);
      emitCabinetBlock(result);
      process.stdout.write("\n> "); // fake prompt so Cabinet's ready-detection works
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      process.stderr.write(`[bodega-bridge] error: ${msg}\n`);
    }
  }
}

// ─── CLI dispatch ─────────────────────────────────────────────────────────────

const args = process.argv.slice(2);

if (args.includes("--session")) {
  process.stdout.write("> "); // initial prompt marker for Cabinet's readyStrategy detection
  runSession().catch((err) => {
    process.stderr.write(`[bodega-bridge] fatal: ${err instanceof Error ? err.message : err}\n`);
    process.exit(1);
  });
} else {
  const promptIdx = args.indexOf("--prompt");
  const prompt = promptIdx !== -1 ? args[promptIdx + 1] : args[0];

  if (!prompt) {
    process.stderr.write("Usage: bodega-bridge --prompt <text> | --session\n");
    process.exit(1);
  }

  runOneShot(prompt).catch((err) => {
    process.stderr.write(`[bodega-bridge] fatal: ${err instanceof Error ? err.message : err}\n`);
    process.exit(1);
  });
}
