/**
 * Bodega One provider for Cabinet
 *
 * Bridges Cabinet's AgentProvider interface to a running Bodega One backend
 * (Express server on localhost:3000 by default).
 *
 * Provider type: "api" — uses runPrompt() rather than spawning a CLI process.
 * The Bodega One backend's /chat/complete endpoint handles the full agentic loop
 * (AgenticChatService) and returns the final assistant response as a string.
 *
 * Model selection: reads BODEGA_MODEL env var, falling back to the first
 * available model reported by /model-hub/catalog/local.
 *
 * MCP tool federation: the provider exposes a hook (registerMcpTools) so the
 * caller can inject tool descriptors (e.g. bodega-brain tools) that are
 * forwarded to Bodega One as project rules context until native MCP passthrough
 * is wired end-to-end.
 */

import type { AgentProvider, ProviderStatus } from "../provider-interface";

// ─── Config ──────────────────────────────────────────────────────────────────

const DEFAULT_BASE_URL = process.env.BODEGA_ONE_URL ?? "http://localhost:3000";
const DEFAULT_MODEL = process.env.BODEGA_MODEL ?? "";
const DEFAULT_TIMEOUT_MS = 120_000;

// ─── Types matching Bodega One's /chat/complete request body ──────────────────

interface BodegaMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

interface BodegaChatRequest {
  messages: BodegaMessage[];
  model?: string;
  sessionId?: number;
  projectPath?: string;
  projectRules?: string;
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

// ─── MCP tool federation state ────────────────────────────────────────────────

interface McpToolDescriptor {
  name: string;
  description: string;
  schema?: Record<string, unknown>;
}

// ─── BodegaOneProvider ────────────────────────────────────────────────────────

class BodegaOneProvider implements AgentProvider {
  readonly id = "bodega-one";
  readonly name = "Bodega One";
  readonly type = "api" as const;
  readonly icon = "zap";

  private baseUrl: string;
  private model: string;
  private mcpTools: McpToolDescriptor[] = [];

  // Hook points for PreToolUse routing and SubagentStop aggregation
  private preToolUseHook?: (toolName: string, args: unknown) => Promise<void>;
  private subagentStopHook?: (agentId: string, result: string) => Promise<void>;

  constructor(baseUrl = DEFAULT_BASE_URL, model = DEFAULT_MODEL) {
    this.baseUrl = baseUrl;
    this.model = model;
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

  // ── Core API methods ───────────────────────────────────────────────────────

  async isAvailable(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5_000);
      const res = await fetch(`${this.baseUrl}/api/health`, {
        signal: controller.signal,
      });
      clearTimeout(timeout);
      return res.ok;
    } catch {
      return false;
    }
  }

  async healthCheck(): Promise<ProviderStatus> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5_000);

      const res = await fetch(`${this.baseUrl}/api/health`, {
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!res.ok) {
        return {
          available: false,
          authenticated: false,
          error: `Bodega One backend returned HTTP ${res.status}`,
        };
      }

      // Resolve the active model to report as version
      const activeModel = await this.resolveModel();

      return {
        available: true,
        authenticated: true, // Bodega One uses local auth — if server is up, we're in
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

  /**
   * runPrompt — Cabinet's primary API provider hook.
   *
   * Sends `prompt` to Bodega One's /chat/complete endpoint. The `context`
   * argument (Cabinet passes the agent's instructions here) is injected as a
   * system message so Bodega One's agentic loop has full persona context.
   *
   * MCP tool descriptors registered via registerMcpTools() are appended to
   * projectRules so the LLM is aware of available tools without requiring
   * a native MCP passthrough (planned for v2).
   */
  async runPrompt(prompt: string, context: string): Promise<string> {
    const model = await this.resolveModel();
    const messages: BodegaMessage[] = [];

    if (context?.trim()) {
      messages.push({ role: "system", content: context.trim() });
    }
    messages.push({ role: "user", content: prompt });

    const projectRules = this.buildProjectRules();

    const body: BodegaChatRequest = {
      messages,
      ...(model ? { model } : {}),
      ...(projectRules ? { projectRules } : {}),
      permissionMode: "auto",
    };

    // Fire PreToolUse hook (informational — actual tool routing is server-side)
    if (this.preToolUseHook) {
      await this.preToolUseHook("chat/complete", body).catch(() => {
        // hooks must not block the main request
      });
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

      // Fire SubagentStop hook with result
      if (this.subagentStopHook) {
        await this.subagentStopHook("bodega-one", result).catch(() => {});
      }

      return result;
    } catch (err) {
      clearTimeout(timeout);
      throw err;
    }
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  /**
   * Resolve which model to use.
   * Priority: explicit config → BODEGA_MODEL env → first available local model.
   */
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

  /**
   * Build the projectRules string injected alongside each request.
   * Includes MCP tool descriptors so the LLM knows what tools are federated.
   */
  private buildProjectRules(): string {
    if (this.mcpTools.length === 0) return "";

    const toolLines = this.mcpTools
      .map((t) => `- ${t.name}: ${t.description}`)
      .join("\n");

    return `## Federated MCP Tools (via Cabinet → Bodega One bridge)\n${toolLines}`;
  }

  /**
   * Expose the resolved base URL for diagnostics / UI display.
   */
  getBaseUrl(): string {
    return this.baseUrl;
  }

  /**
   * Override the target URL at runtime (useful for multi-instance setups).
   */
  setBaseUrl(url: string): void {
    this.baseUrl = url;
  }

  /**
   * Override the model at runtime.
   */
  setModel(model: string): void {
    this.model = model;
  }

  /**
   * Create an isolated copy of this provider with fresh state.
   * Each Cabinet task should use its own instance to prevent context bleed.
   */
  fork(overrides?: { model?: string; baseUrl?: string }): BodegaOneProvider {
    const instance = new BodegaOneProvider(
      overrides?.baseUrl ?? this.baseUrl,
      overrides?.model ?? this.model
    );
    // MCP tools are shared (they're global registrations)
    instance.mcpTools = [...this.mcpTools];
    return instance;
  }
}

// ─── Singleton export ─────────────────────────────────────────────────────────

export const bodegaOneProvider = new BodegaOneProvider();

export { BodegaOneProvider };
export type { McpToolDescriptor, BodegaChatRequest, BodegaChatResponse };
