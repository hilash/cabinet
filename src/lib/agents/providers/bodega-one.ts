/**
 * Bodega One provider for Cabinet — v2
 *
 * Bridges Cabinet's AgentProvider interface to a running Bodega One backend
 * (Express server on localhost:3000 by default).
 *
 * v2 adds:
 *   - Streaming via /api/chat/stream SSE endpoint (streamPrompt)
 *   - Session reuse: Cabinet conversation ID → Bodega One numeric session ID
 *   - Native MCP tool passthrough via structured mcpTools request field
 *   - PTY-compatible via bodega-bridge.ts shim (type: "cli" session invocation)
 */

import type { AgentProvider, CliProviderInvocation, ProviderStatus } from "../provider-interface";
import path from "path";
import { fileURLToPath } from "url";

// ─── Config ──────────────────────────────────────────────────────────────────

const DEFAULT_BASE_URL = process.env.BODEGA_ONE_URL ?? "http://localhost:3000";
const DEFAULT_MODEL = process.env.BODEGA_MODEL ?? "";
const DEFAULT_TIMEOUT_MS = 120_000;

// Path to the PTY shim script (resolved relative to this file at runtime)
const BRIDGE_SCRIPT = (() => {
  try {
    const dir = path.dirname(fileURLToPath(import.meta.url));
    return path.join(dir, "..", "bodega-bridge.ts");
  } catch {
    // CJS fallback
    return path.join(__dirname, "..", "bodega-bridge.ts");
  }
})();

// ─── Bodega One API types ─────────────────────────────────────────────────────

interface BodegaMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

/** Structured MCP tool spec forwarded to Bodega One's agentic loop. */
interface BodegaMcpToolSpec {
  name: string;
  description: string;
  inputSchema?: Record<string, unknown>;
}

interface BodegaChatRequest {
  messages: BodegaMessage[];
  model?: string;
  sessionId?: number;
  projectPath?: string;
  projectRules?: string;
  /** Native MCP tool specs to inject into the Bodega One tool registry for this request. */
  mcpTools?: BodegaMcpToolSpec[];
  permissionMode?: "ask" | "auto" | "plan";
}

interface BodegaChatResponse {
  content: string;
  model?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

interface BodegaModelCatalogEntry {
  id: string;
  name: string;
  provider: string;
  available?: boolean;
}

interface BodegaSession {
  id: number;
  title?: string;
  type?: string;
}

// ─── MCP tool descriptor (Cabinet-facing) ────────────────────────────────────

interface McpToolDescriptor {
  name: string;
  description: string;
  schema?: Record<string, unknown>;
}

// ─── SSE parsing helpers ──────────────────────────────────────────────────────

/**
 * Parse a single SSE data payload line from Bodega One's /api/chat/stream.
 * Returns a text chunk, or null if this event doesn't carry user-visible content.
 */
function parseSseChunk(payload: string): { chunk?: string; done?: boolean; content?: string; error?: string } {
  try {
    const json = JSON.parse(payload) as Record<string, unknown>;
    if (json.error) return { error: String(json.error) };
    if (json.done) return { done: true, content: typeof json.content === "string" ? json.content : undefined };
    const delta = json.delta as Record<string, unknown> | undefined;
    if (delta?.content && typeof delta.content === "string") {
      return { chunk: delta.content };
    }
    return {};
  } catch {
    return {};
  }
}

// ─── BodegaOneProvider ────────────────────────────────────────────────────────

class BodegaOneProvider implements AgentProvider {
  readonly id = "bodega-one";
  readonly name = "Bodega One";
  /** Hybrid: "cli" lets Cabinet use the PTY shim; API path is still supported. */
  readonly type = "cli" as const;
  readonly icon = "zap";

  private baseUrl: string;
  private model: string;
  private mcpTools: McpToolDescriptor[] = [];

  /**
   * Session registry: Cabinet conversation ID → Bodega One numeric session ID.
   * Allows related Cabinet tasks to reuse the same Bodega One conversation context.
   */
  private sessionRegistry = new Map<string, number>();

  // Hook points for PreToolUse routing and SubagentStop aggregation
  private preToolUseHook?: (toolName: string, args: unknown) => Promise<void>;
  private subagentStopHook?: (agentId: string, result: string) => Promise<void>;

  constructor(baseUrl = DEFAULT_BASE_URL, model = DEFAULT_MODEL) {
    this.baseUrl = baseUrl;
    this.model = model;
  }

  // ── PTY shim invocations (CLI provider path) ───────────────────────────────

  /**
   * One-shot: spawn the bodega-bridge shim with the prompt as an arg.
   * Cabinet's job runner uses this path.
   */
  buildOneShotInvocation(prompt: string, _workdir: string): CliProviderInvocation {
    return {
      command: "npx",
      args: ["tsx", BRIDGE_SCRIPT, "--prompt", prompt],
    };
  }

  /**
   * Session: spawn the bodega-bridge shim in interactive mode.
   * Cabinet's AI panel uses this path; the shim reads from stdin.
   */
  buildSessionInvocation(prompt: string | undefined, _workdir: string): CliProviderInvocation {
    const args = ["tsx", BRIDGE_SCRIPT, "--session"];
    return {
      command: "npx",
      args,
      initialPrompt: prompt?.trim() || undefined,
    };
  }

  // ── MCP tool federation ────────────────────────────────────────────────────

  registerMcpTools(tools: McpToolDescriptor[]): void {
    this.mcpTools = tools;
  }

  clearMcpTools(): void {
    this.mcpTools = [];
  }

  // ── Hook registration ──────────────────────────────────────────────────────

  onPreToolUse(hook: (toolName: string, args: unknown) => Promise<void>): void {
    this.preToolUseHook = hook;
  }

  onSubagentStop(hook: (agentId: string, result: string) => Promise<void>): void {
    this.subagentStopHook = hook;
  }

  // ── Health & availability ──────────────────────────────────────────────────

  async isAvailable(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/api/health`, {
        signal: AbortSignal.timeout(5_000),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async healthCheck(): Promise<ProviderStatus> {
    try {
      const res = await fetch(`${this.baseUrl}/api/health`, {
        signal: AbortSignal.timeout(5_000),
      });

      if (!res.ok) {
        return {
          available: false,
          authenticated: false,
          error: `Bodega One backend returned HTTP ${res.status}`,
        };
      }

      const activeModel = await this.resolveModel();
      return {
        available: true,
        authenticated: true,
        version: activeModel || "Bodega One (model unknown)",
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Connection failed";
      return {
        available: false,
        authenticated: false,
        error: `Cannot reach Bodega One at ${this.baseUrl}: ${message}`,
      };
    }
  }

  // ── Session management ─────────────────────────────────────────────────────

  /**
   * Get or create a Bodega One session for the given Cabinet conversation ID.
   * Returns the numeric Bodega One session ID to pass as `sessionId` in requests.
   *
   * If `conversationId` is not supplied, returns undefined (stateless request).
   */
  async getOrCreateBodegaSession(conversationId?: string, title?: string): Promise<number | undefined> {
    if (!conversationId) return undefined;

    const existing = this.sessionRegistry.get(conversationId);
    if (existing !== undefined) return existing;

    try {
      const res = await fetch(`${this.baseUrl}/api/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title ?? `Cabinet: ${conversationId.slice(0, 40)}`,
          type: "chat",
        }),
        signal: AbortSignal.timeout(10_000),
      });

      if (!res.ok) return undefined;

      const session = (await res.json()) as BodegaSession;
      if (typeof session.id === "number") {
        this.sessionRegistry.set(conversationId, session.id);
        return session.id;
      }
      return undefined;
    } catch {
      return undefined;
    }
  }

  /** Explicitly bind a Cabinet conversation ID to an existing Bodega One session ID. */
  bindSession(conversationId: string, bodegaSessionId: number): void {
    this.sessionRegistry.set(conversationId, bodegaSessionId);
  }

  /** Release a session mapping (e.g. after a conversation is archived). */
  releaseSession(conversationId: string): void {
    this.sessionRegistry.delete(conversationId);
  }

  // ── Blocking API path ──────────────────────────────────────────────────────

  /**
   * runPrompt — blocking API call via /api/chat/complete.
   * `conversationId` (optional) enables session reuse across calls.
   */
  async runPrompt(prompt: string, context: string, conversationId?: string): Promise<string> {
    const model = await this.resolveModel();
    const sessionId = await this.getOrCreateBodegaSession(conversationId);

    const messages: BodegaMessage[] = [];
    if (context?.trim()) {
      messages.push({ role: "system", content: context.trim() });
    }
    messages.push({ role: "user", content: prompt });

    const body = this.buildRequestBody(messages, model, sessionId);

    if (this.preToolUseHook) {
      await this.preToolUseHook("chat/complete", body).catch(() => {});
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

    try {
      const res = await fetch(`${this.baseUrl}/api/chat/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!res.ok) {
        const errorText = await res.text().catch(() => `HTTP ${res.status}`);
        throw new Error(`Bodega One request failed (${res.status}): ${errorText}`);
      }

      const data = (await res.json()) as BodegaChatResponse;
      const result = data.content ?? "";

      if (this.subagentStopHook) {
        await this.subagentStopHook("bodega-one", result).catch(() => {});
      }

      return result;
    } catch (err) {
      clearTimeout(timeout);
      throw err;
    }
  }

  // ── Streaming API path ─────────────────────────────────────────────────────

  /**
   * streamPrompt — yields text chunks from /api/chat/stream SSE.
   * Consumes Bodega One's delta/content events and surfaces them as an AsyncIterable.
   * `conversationId` (optional) enables session reuse across calls.
   */
  async *streamPrompt(
    prompt: string,
    context: string,
    conversationId?: string
  ): AsyncIterable<string> {
    const model = await this.resolveModel();
    const sessionId = await this.getOrCreateBodegaSession(conversationId);

    const messages: BodegaMessage[] = [];
    if (context?.trim()) {
      messages.push({ role: "system", content: context.trim() });
    }
    messages.push({ role: "user", content: prompt });

    const body = this.buildRequestBody(messages, model, sessionId);

    if (this.preToolUseHook) {
      await this.preToolUseHook("chat/stream", body).catch(() => {});
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

    let fullContent = "";

    try {
      const res = await fetch(`${this.baseUrl}/api/chat/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        clearTimeout(timeout);
        const errorText = await res.text().catch(() => `HTTP ${res.status}`);
        throw new Error(`Bodega One stream failed (${res.status}): ${errorText}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let sseBuffer = "";

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

          const parsed = parseSseChunk(payload);
          if (parsed.error) {
            clearTimeout(timeout);
            throw new Error(`Bodega One stream error: ${parsed.error}`);
          }
          if (parsed.done) {
            if (parsed.content) fullContent = parsed.content;
            break;
          }
          if (parsed.chunk) {
            fullContent += parsed.chunk;
            yield parsed.chunk;
          }
        }
      }

      clearTimeout(timeout);
    } catch (err) {
      clearTimeout(timeout);
      throw err;
    }

    if (this.subagentStopHook) {
      await this.subagentStopHook("bodega-one", fullContent).catch(() => {});
    }
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private buildRequestBody(
    messages: BodegaMessage[],
    model: string,
    sessionId?: number
  ): BodegaChatRequest {
    const body: BodegaChatRequest = {
      messages,
      permissionMode: "auto",
    };

    if (model) body.model = model;
    if (sessionId !== undefined) body.sessionId = sessionId;

    // Native MCP passthrough: structured tool specs
    if (this.mcpTools.length > 0) {
      body.mcpTools = this.mcpTools.map((t) => ({
        name: t.name,
        description: t.description,
        inputSchema: t.schema,
      }));

      // Text fallback for backends that don't yet parse mcpTools
      const toolLines = this.mcpTools.map((t) => `- ${t.name}: ${t.description}`).join("\n");
      body.projectRules = `## Federated MCP Tools (Cabinet → Bodega One)\n${toolLines}`;
    }

    return body;
  }

  private async resolveModel(): Promise<string> {
    if (this.model) return this.model;

    try {
      const res = await fetch(`${this.baseUrl}/api/model-hub/catalog/local`, {
        signal: AbortSignal.timeout(3_000),
      });
      if (!res.ok) return "";
      const catalog = (await res.json()) as BodegaModelCatalogEntry[];
      return catalog[0]?.id ?? "";
    } catch {
      return "";
    }
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }

  setBaseUrl(url: string): void {
    this.baseUrl = url;
  }

  setModel(model: string): void {
    this.model = model;
  }

  /**
   * Create an isolated copy of this provider with fresh session state.
   * Each Cabinet task should use its own instance to prevent context bleed.
   */
  fork(overrides?: { model?: string; baseUrl?: string }): BodegaOneProvider {
    const instance = new BodegaOneProvider(
      overrides?.baseUrl ?? this.baseUrl,
      overrides?.model ?? this.model
    );
    instance.mcpTools = [...this.mcpTools];
    // Session registry is NOT copied — forks start with a clean slate
    return instance;
  }
}

// ─── Singleton export ─────────────────────────────────────────────────────────

export const bodegaOneProvider = new BodegaOneProvider();

export { BodegaOneProvider };
export type { McpToolDescriptor, BodegaChatRequest, BodegaChatResponse, BodegaMcpToolSpec };
