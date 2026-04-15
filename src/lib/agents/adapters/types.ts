export interface AdapterUsageSummary {
  inputTokens: number;
  outputTokens: number;
  cachedInputTokens?: number;
}

export type AdapterBillingType =
  | "api"
  | "subscription"
  | "metered_api"
  | "credits"
  | "unknown";

export interface AdapterInvocationMeta {
  adapterType: string;
  command: string;
  cwd?: string;
  commandArgs?: string[];
  commandNotes?: string[];
  env?: Record<string, string>;
  prompt?: string;
}

export interface AdapterExecutionContext {
  runId: string;
  adapterType: string;
  config: Record<string, unknown>;
  prompt: string;
  cwd: string;
  sessionId?: string | null;
  sessionParams?: Record<string, unknown> | null;
  onLog: (stream: "stdout" | "stderr", chunk: string) => Promise<void>;
  onMeta?: (meta: AdapterInvocationMeta) => Promise<void>;
  onSpawn?: (meta: {
    pid: number;
    processGroupId: number | null;
    startedAt: string;
  }) => Promise<void>;
}

export interface AdapterExecutionResult {
  exitCode: number | null;
  signal: string | null;
  timedOut: boolean;
  errorMessage?: string | null;
  errorCode?: string | null;
  usage?: AdapterUsageSummary;
  sessionId?: string | null;
  sessionParams?: Record<string, unknown> | null;
  sessionDisplayId?: string | null;
  provider?: string | null;
  model?: string | null;
  billingType?: AdapterBillingType | null;
  summary?: string | null;
  output?: string | null;
  clearSession?: boolean;
}

export type AdapterEnvironmentCheckLevel = "info" | "warn" | "error";
export type AdapterEnvironmentStatus = "pass" | "warn" | "fail";

export interface AdapterEnvironmentCheck {
  code: string;
  level: AdapterEnvironmentCheckLevel;
  message: string;
  detail?: string | null;
  hint?: string | null;
}

export interface AdapterEnvironmentTestContext {
  adapterType: string;
  adapterConfig?: Record<string, unknown>;
  cwd?: string;
  env?: Record<string, string>;
}

export interface AdapterEnvironmentTestResult {
  adapterType: string;
  status: AdapterEnvironmentStatus;
  checks: AdapterEnvironmentCheck[];
  testedAt: string;
}

export interface AgentAdapterModel {
  id: string;
  name: string;
  description?: string;
}

export interface AgentAdapterEffortLevel {
  id: string;
  name: string;
  description?: string;
}

export type AgentAdapterExecutionEngine =
  | "legacy_pty_cli"
  | "structured_cli"
  | "api"
  | "http"
  | "process";

export interface AgentExecutionAdapter {
  type: string;
  name: string;
  description?: string;
  providerId?: string;
  executionEngine: AgentAdapterExecutionEngine;
  experimental?: boolean;
  supportsSessionResume?: boolean;
  supportsDetachedRuns?: boolean;
  models?: AgentAdapterModel[];
  effortLevels?: AgentAdapterEffortLevel[];
  testEnvironment(
    ctx?: AdapterEnvironmentTestContext
  ): Promise<AdapterEnvironmentTestResult>;
  execute?(ctx: AdapterExecutionContext): Promise<AdapterExecutionResult>;
}

