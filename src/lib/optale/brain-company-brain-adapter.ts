import { readOptaleBrainCoreStatus } from "@/lib/optale/brain-core";
import {
  redactBrainCoreStatusForClient,
  type OptaleBrainAdapterBinding,
  type OptaleBrainPublicCoreStatus,
} from "@/lib/optale/brain-contracts";
import {
  getPublicCommandBrainBridgeStatus,
  proxyCommandBrainMutation,
  proxyCommandBrainRead,
  type OptaleCommandBrainPublicStatus,
} from "@/lib/optale/command-brain-bridge";
import {
  normalizeBrainDownstreamError,
  redactBrainTextForClient,
  redactBrainValueForClient,
  trimBrainAdapterString,
  type OptaleBrainAdapterReadOptions,
  type OptaleBrainDownstreamCall,
} from "@/lib/optale/brain-adapters";
import {
  resolveOptaleCompanyBrainReviewerAddon,
  type OptaleCompanyBrainReviewerAddon,
} from "@/lib/optale/brain-company-brain-addon";

export interface OptaleCompanyBrainTarget {
  targetId: string;
  label: string;
  companyName: string;
  description?: string;
  status: string;
  scopes: Record<string, unknown>;
  policies: Record<string, unknown>;
}

export interface OptaleCompanyBrainHealthSource {
  id: string;
  state: string;
  configured: boolean;
  missing: string[];
  error?: string;
  sample?: unknown;
}

export interface OptaleCompanyBrainHealth {
  targetId: string;
  status: string;
  healthy: number;
  missing: number;
  failing: number;
  sources: OptaleCompanyBrainHealthSource[];
}

export interface OptaleCompanyBrainPromotion {
  id?: string;
  promotionId: string;
  targetId: string;
  sourceType: string;
  title: string;
  summary: string;
  content: string;
  status: string;
  sensitivity: string;
  entityTypes: string[];
  tags: string[];
  reviewerNotes?: string;
  agentReview: {
    status?: string;
    confidence?: number | null;
    contradictions: unknown[];
    duplicates: unknown[];
    recommendations: string[];
    rationale?: string;
    model?: string;
    provider?: string;
    checkedAt?: string;
  };
  reviewHistory: unknown[];
  writeResult: {
    status?: string;
    adapter?: string;
    attempts?: number;
    completedAt?: string;
    failedAt?: string;
    error?: string;
    writes: Array<{
      tool?: string;
      ok?: boolean;
      verification?: {
        status?: string;
        tool?: string;
        checkedAt?: string;
        matchedAt?: string;
        attempts: unknown[];
        result?: unknown;
      };
    }>;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface OptaleCompanyBrainReviewQueueJob {
  id: string;
  status: string;
  attempts: number;
  maxAttempts: number;
  targetId?: string;
  promotionId?: string;
  trigger?: string;
  queuedAt?: string;
  createdAt?: number;
  updatedAt?: number;
  result?: unknown;
  error?: {
    name?: string;
    message?: string;
  };
}

export interface OptaleCompanyBrainReviewQueue {
  queueName: string;
  available: boolean;
  enabled: boolean;
  autoReviewEnabled: boolean;
  workerConcurrency: number;
  maxAttempts: number;
  pending: number;
  processing: number;
  pendingJobs: OptaleCompanyBrainReviewQueueJob[];
  processingJobs: OptaleCompanyBrainReviewQueueJob[];
  completedJobs: OptaleCompanyBrainReviewQueueJob[];
  failedJobs: OptaleCompanyBrainReviewQueueJob[];
}

export interface OptaleCompanyBrainAddonResponse {
  version: 1;
  generatedAt: string;
  httpStatus: number;
  request: OptaleBrainPublicCoreStatus["request"];
  addon: OptaleCompanyBrainReviewerAddon;
  source: OptaleBrainAdapterBinding;
  bridge: OptaleCommandBrainPublicStatus;
  actions: OptaleCompanyBrainActionsStatus;
  targetId?: string;
  statusFilter: string;
  targets: OptaleCompanyBrainTarget[];
  overview: {
    target: OptaleCompanyBrainTarget | null;
    health: OptaleCompanyBrainHealth | null;
    counts: Record<string, number>;
    recentPromotions: OptaleCompanyBrainPromotion[];
  } | null;
  promotions: OptaleCompanyBrainPromotion[];
  reviewQueue: OptaleCompanyBrainReviewQueue | null;
  downstream: OptaleBrainDownstreamCall[];
  stats: {
    addonEnabled: boolean;
    bridgeEnabled: boolean;
    bridgeConfigured: boolean;
    targetSelected: boolean;
    targetsLoaded: number;
    promotionsLoaded: number;
    recentPromotionsLoaded: number;
    queueJobsLoaded: number;
    downstreamCalls: number;
    downstreamErrors: number;
  };
}

export interface OptaleCompanyBrainReadOptions extends OptaleBrainAdapterReadOptions {
  targetId?: string | null;
  status?: string | null;
  requestHeaders?: Headers;
  fetchImpl?: typeof fetch;
}

export type OptaleCompanyBrainAction =
  | "run-agent-review"
  | "mark-in-review"
  | "request-changes"
  | "approve"
  | "reject"
  | "promote"
  | "promote-dry-run";

export interface OptaleCompanyBrainActionsStatus {
  enabled: boolean;
  reason?: string;
  allowed: OptaleCompanyBrainAction[];
}

export interface OptaleCompanyBrainActionOptions {
  cabinetPath?: string | null;
  targetId?: string | null;
  promotionId?: string | null;
  action?: string | null;
  reviewerNotes?: string | null;
  force?: boolean;
  dryRun?: boolean;
  requestHeaders?: Headers;
  fetchImpl?: typeof fetch;
  env?: Record<string, string | undefined>;
}

export interface OptaleCompanyBrainActionResponse {
  version: 1;
  generatedAt: string;
  httpStatus: number;
  request: OptaleBrainPublicCoreStatus["request"];
  addon: OptaleCompanyBrainReviewerAddon;
  source: OptaleBrainAdapterBinding;
  bridge: OptaleCommandBrainPublicStatus;
  actions: OptaleCompanyBrainActionsStatus;
  targetId?: string;
  promotionId?: string;
  action: OptaleCompanyBrainAction | "invalid";
  ok: boolean;
  result: unknown;
  promotion?: OptaleCompanyBrainPromotion;
  writeResult?: unknown;
  idempotent?: boolean;
  downstream: OptaleBrainDownstreamCall[];
  error?: string;
}

export interface OptaleCompanyBrainPromotionCreateOptions {
  cabinetPath?: string | null;
  targetId?: string | null;
  sourceType?: string | null;
  title?: string | null;
  summary?: string | null;
  content?: string | null;
  sensitivity?: string | null;
  entityTypes?: unknown;
  tags?: unknown;
  notes?: string | null;
  submit?: boolean;
  sourceRef?: unknown;
  payload?: unknown;
  requestHeaders?: Headers;
  fetchImpl?: typeof fetch;
  env?: Record<string, string | undefined>;
}

export interface OptaleCompanyBrainPromotionCreateResponse {
  version: 1;
  generatedAt: string;
  httpStatus: number;
  request: OptaleBrainPublicCoreStatus["request"];
  addon: OptaleCompanyBrainReviewerAddon;
  source: OptaleBrainAdapterBinding;
  bridge: OptaleCommandBrainPublicStatus;
  actions: OptaleCompanyBrainActionsStatus;
  targetId?: string;
  ok: boolean;
  submitted: boolean;
  promotion?: OptaleCompanyBrainPromotion;
  reviewJob?: unknown;
  result: unknown;
  downstream: OptaleBrainDownstreamCall[];
  error?: string;
}

interface BridgeCallResult {
  call: OptaleBrainDownstreamCall;
  data?: unknown;
}

const DEFAULT_STATUS_FILTER = "submitted,in_review,needs_changes";
const COMPANY_BRAIN_SOURCE_TYPES = new Set([
  "manual",
  "memory_conclusion",
  "memory_peer_card",
  "graph_fact",
  "entity_record",
  "doc",
  "honcho_conclusion",
  "honcho_peer_card",
  "graphiti_fact",
  "orm_entity",
  "vault_doc",
  "other",
]);
const COMPANY_BRAIN_SENSITIVITIES = new Set([
  "personal",
  "internal",
  "confidential",
  "restricted",
]);
const COMPANY_BRAIN_ACTIONS: OptaleCompanyBrainAction[] = [
  "run-agent-review",
  "mark-in-review",
  "request-changes",
  "approve",
  "reject",
  "promote",
  "promote-dry-run",
];
const MAX_CLIENT_STRING = 6_000;
const MAX_CLIENT_ARRAY_ITEMS = 30;
const MAX_CLIENT_OBJECT_KEYS = 60;
const MAX_DOWNSTREAM_TEXT = 8_000;

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function numberValue(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function booleanValue(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function stringArray(value: unknown): string[] {
  return asArray(value)
    .filter((entry): entry is string => typeof entry === "string" && entry.trim() !== "")
    .map((entry) => entry.trim());
}

function stringList(value: unknown): string[] {
  if (Array.isArray(value)) return stringArray(value);
  if (typeof value === "string" && value.trim()) {
    return value
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);
  }
  return [];
}

function compactCompanyBrainValueForClient(value: unknown, depth = 0): unknown {
  if (typeof value === "string") {
    return redactBrainTextForClient(value).slice(0, MAX_CLIENT_STRING);
  }
  if (typeof value !== "object" || value === null) return value;
  if (depth > 6) return "[max-depth]";
  if (Array.isArray(value)) {
    return value
      .slice(0, MAX_CLIENT_ARRAY_ITEMS)
      .map((entry) => compactCompanyBrainValueForClient(entry, depth + 1));
  }

  const record = asRecord(redactBrainValueForClient(value));
  return Object.fromEntries(
    Object.entries(record)
      .slice(0, MAX_CLIENT_OBJECT_KEYS)
      .map(([key, entry]) => [
        key,
        compactCompanyBrainValueForClient(entry, depth + 1),
      ])
  );
}

function renderDownstreamText(value: unknown): string {
  if (typeof value === "string") {
    return redactBrainTextForClient(value).slice(0, MAX_DOWNSTREAM_TEXT);
  }
  try {
    return JSON.stringify(compactCompanyBrainValueForClient(value)).slice(
      0,
      MAX_DOWNSTREAM_TEXT
    );
  } catch {
    return String(value ?? "").slice(0, MAX_DOWNSTREAM_TEXT);
  }
}

function objectMap(value: unknown): Record<string, unknown> {
  return asRecord(compactCompanyBrainValueForClient(asRecord(value)));
}

function normalizeTarget(value: unknown): OptaleCompanyBrainTarget {
  const record = asRecord(value);
  const targetId = stringValue(record.targetId) || stringValue(record.id) || "";
  return {
    targetId,
    label: stringValue(record.label) || targetId || "Company Brain",
    companyName: stringValue(record.companyName) || stringValue(record.companyId) || "Company",
    description: stringValue(record.description),
    status: stringValue(record.status) || "unknown",
    scopes: objectMap(record.scopes),
    policies: objectMap(record.policies),
  };
}

function normalizeHealth(value: unknown, fallbackTargetId = ""): OptaleCompanyBrainHealth | null {
  const record = asRecord(value);
  if (Object.keys(record).length === 0) return null;
  const sourcesRecord = asRecord(record.sources);
  const sources = Object.entries(sourcesRecord).map(([id, entry]) => {
    const source = asRecord(entry);
    return {
      id,
      state: stringValue(source.state) || "unknown",
      configured: booleanValue(source.configured),
      missing: stringArray(source.missing),
      error: stringValue(source.error),
      sample: compactCompanyBrainValueForClient(source.sample),
    };
  });

  return {
    targetId: stringValue(record.targetId) || fallbackTargetId,
    status: stringValue(record.status) || "unknown",
    healthy: numberValue(record.healthy),
    missing: numberValue(record.missing),
    failing: numberValue(record.failing),
    sources,
  };
}

function normalizeWriteResult(value: unknown): OptaleCompanyBrainPromotion["writeResult"] {
  const record = asRecord(value);
  return {
    status: stringValue(record.status),
    adapter: stringValue(record.adapter),
    attempts: record.attempts === undefined ? undefined : numberValue(record.attempts),
    completedAt: stringValue(record.completedAt),
    failedAt: stringValue(record.failedAt),
    error: stringValue(record.error),
    writes: asArray(record.writes).map((entry) => {
      const write = asRecord(entry);
      const verification = asRecord(write.verification);
      return {
        tool: stringValue(write.tool),
        ok: typeof write.ok === "boolean" ? write.ok : undefined,
        verification:
          Object.keys(verification).length > 0
            ? {
                status: stringValue(verification.status),
                tool: stringValue(verification.tool),
                checkedAt: stringValue(verification.checkedAt),
                matchedAt: stringValue(verification.matchedAt),
                attempts: asArray(
                  compactCompanyBrainValueForClient(verification.attempts)
                ),
                result: compactCompanyBrainValueForClient(verification.result),
              }
            : undefined,
      };
    }),
  };
}

function normalizePromotion(value: unknown): OptaleCompanyBrainPromotion {
  const record = asRecord(value);
  const agentReview = asRecord(record.agentReview);
  return {
    id: stringValue(record.id),
    promotionId:
      stringValue(record.promotionId) || stringValue(record.id) || "unknown-promotion",
    targetId: stringValue(record.targetId) || "",
    sourceType: stringValue(record.sourceType) || "unknown",
    title: stringValue(record.title) || "Untitled promotion",
    summary: redactBrainTextForClient(String(record.summary || "")).slice(0, MAX_CLIENT_STRING),
    content: redactBrainTextForClient(String(record.content || "")).slice(0, MAX_CLIENT_STRING),
    status: stringValue(record.status) || "unknown",
    sensitivity: stringValue(record.sensitivity) || "unknown",
    entityTypes: stringArray(record.entityTypes),
    tags: stringArray(record.tags),
    reviewerNotes: stringValue(record.reviewerNotes),
    agentReview: {
      status: stringValue(agentReview.status),
      confidence:
        agentReview.confidence === null
          ? null
          : agentReview.confidence === undefined
            ? undefined
            : numberValue(agentReview.confidence),
      contradictions: asArray(
        compactCompanyBrainValueForClient(agentReview.contradictions)
      ),
      duplicates: asArray(compactCompanyBrainValueForClient(agentReview.duplicates)),
      recommendations: stringArray(agentReview.recommendations),
      rationale: stringValue(agentReview.rationale),
      model: stringValue(agentReview.model),
      provider: stringValue(agentReview.provider),
      checkedAt: stringValue(agentReview.checkedAt),
    },
    reviewHistory: asArray(compactCompanyBrainValueForClient(record.reviewHistory)),
    writeResult: normalizeWriteResult(record.writeResult),
    createdAt: stringValue(record.createdAt),
    updatedAt: stringValue(record.updatedAt),
  };
}

function normalizeQueueJob(value: unknown): OptaleCompanyBrainReviewQueueJob {
  const record = asRecord(value);
  const error = asRecord(record.error);
  return {
    id: stringValue(record.id) || "job",
    status: stringValue(record.status) || "unknown",
    attempts: numberValue(record.attempts),
    maxAttempts: numberValue(record.maxAttempts),
    targetId: stringValue(record.targetId),
    promotionId: stringValue(record.promotionId),
    trigger: stringValue(record.trigger),
    queuedAt: stringValue(record.queuedAt),
    createdAt: record.createdAt === undefined ? undefined : numberValue(record.createdAt),
    updatedAt: record.updatedAt === undefined ? undefined : numberValue(record.updatedAt),
    result: compactCompanyBrainValueForClient(record.result),
    error:
      Object.keys(error).length > 0
        ? {
            name: stringValue(error.name),
            message: stringValue(error.message),
          }
        : undefined,
  };
}

function normalizeReviewQueue(value: unknown): OptaleCompanyBrainReviewQueue | null {
  const record = asRecord(value);
  if (Object.keys(record).length === 0) return null;
  return {
    queueName: stringValue(record.queueName) || "company-brain-review",
    available: booleanValue(record.available),
    enabled: booleanValue(record.enabled),
    autoReviewEnabled: booleanValue(record.autoReviewEnabled),
    workerConcurrency: numberValue(record.workerConcurrency),
    maxAttempts: numberValue(record.maxAttempts),
    pending: numberValue(record.pending),
    processing: numberValue(record.processing),
    pendingJobs: asArray(record.pendingJobs).map(normalizeQueueJob),
    processingJobs: asArray(record.processingJobs).map(normalizeQueueJob),
    completedJobs: asArray(record.completedJobs).map(normalizeQueueJob),
    failedJobs: asArray(record.failedJobs).map(normalizeQueueJob),
  };
}

function normalizeCounts(value: unknown): Record<string, number> {
  return Object.fromEntries(
    Object.entries(asRecord(value))
      .map(([key, entry]) => [key, numberValue(entry, NaN)] as const)
      .filter((entry): entry is readonly [string, number] => Number.isFinite(entry[1]))
  );
}

function booleanEnv(
  env: Record<string, string | undefined>,
  name: string
): boolean | undefined {
  const value = env[name]?.trim().toLowerCase();
  if (!value) return undefined;
  if (["1", "true", "yes", "on"].includes(value)) return true;
  if (["0", "false", "no", "off"].includes(value)) return false;
  return undefined;
}

function companyBrainActionsStatus(input: {
  addon: OptaleCompanyBrainReviewerAddon;
  bridge: OptaleCommandBrainPublicStatus;
  targetId?: string;
  env?: Record<string, string | undefined>;
}): OptaleCompanyBrainActionsStatus {
  const env = input.env || process.env;
  const explicit = booleanEnv(env, "OPTALE_COMPANY_BRAIN_ACTIONS_ENABLED");
  if (explicit === false) {
    return {
      enabled: false,
      reason: "Company Brain actions are disabled by environment.",
      allowed: [],
    };
  }
  if (!input.addon.enabled) {
    return {
      enabled: false,
      reason: input.addon.reason || "Company Brain reviewer add-on is not enabled.",
      allowed: [],
    };
  }
  if (!input.targetId) {
    return {
      enabled: false,
      reason: "No Company Brain target is bound to this scope.",
      allowed: [],
    };
  }
  if (!input.bridge.enabled) {
    return {
      enabled: false,
      reason: input.bridge.reason || "Command Brain bridge is not enabled.",
      allowed: [],
    };
  }
  if (explicit !== true) {
    return {
      enabled: false,
      reason: "Set OPTALE_COMPANY_BRAIN_ACTIONS_ENABLED=true to enable review actions.",
      allowed: [],
    };
  }
  return {
    enabled: true,
    allowed: COMPANY_BRAIN_ACTIONS,
  };
}

function normalizeCompanyBrainAction(value: string): OptaleCompanyBrainAction | undefined {
  return COMPANY_BRAIN_ACTIONS.find((action) => action === value);
}

function safePromotionId(value: string): string | undefined {
  const promotionId = value.trim();
  if (!promotionId || promotionId.includes("/") || promotionId.includes("\\") || promotionId.includes("\0")) {
    return undefined;
  }
  if (promotionId === "." || promotionId === ".." || promotionId.length > 160) {
    return undefined;
  }
  return promotionId;
}

function sourceFromCore(core: OptaleBrainPublicCoreStatus): OptaleBrainAdapterBinding {
  return (
    core.sources.find((source) => source.id === "company-brain") || {
      id: "company-brain",
      name: "Company Brain",
      kind: "company_brain",
      source: "bridge",
      status: "blocked",
      statusReason: "Company Brain reviewer add-on is not enabled for this scope.",
      readOnly: true,
      scopes: ["company", "personal", "system"],
      permissions: [],
      rawPolicyPermissions: [],
      capabilities: [],
      namespace: core.request.brain.companyBrainTargetId,
      profile: core.request.brain.mcpClientProfile,
    }
  );
}

function emptyOverview(): OptaleCompanyBrainAddonResponse["overview"] {
  return {
    target: null,
    health: null,
    counts: {},
    recentPromotions: [],
  };
}

async function callCompanyBrainBridge(input: {
  name: string;
  path: string[];
  searchParams?: URLSearchParams;
  requestHeaders?: Headers;
  actor: {
    userId: string;
    role: string;
    tenantId?: string;
    subjectType?: string;
    allowedTargetIds?: string[];
  };
  fetchImpl?: typeof fetch;
}): Promise<BridgeCallResult> {
  const result = await proxyCommandBrainRead({
    path: input.path,
    searchParams: input.searchParams,
    requestHeaders: input.requestHeaders,
    actor: input.actor,
    fetchImpl: input.fetchImpl,
  });
  const ok = result.status >= 200 && result.status < 300;
  const text = renderDownstreamText(result.body);
  return {
    call: {
      name: input.name,
      ok,
      status: ok ? "ok" : "error",
      text: text || (ok ? "ok" : `Request failed with ${result.status}`),
      json: compactCompanyBrainValueForClient(result.body),
      error: ok
        ? undefined
        : normalizeBrainDownstreamError(`${result.status} ${text}`),
    },
    data: ok ? result.body : undefined,
  };
}

function buildResponse(input: {
  generatedAt: string;
  httpStatus?: number;
  core: OptaleBrainPublicCoreStatus;
  addon: OptaleCompanyBrainReviewerAddon;
  source: OptaleBrainAdapterBinding;
  bridge: OptaleCommandBrainPublicStatus;
  actions?: OptaleCompanyBrainActionsStatus;
  targetId?: string;
  statusFilter: string;
  targets?: OptaleCompanyBrainTarget[];
  overview?: OptaleCompanyBrainAddonResponse["overview"];
  promotions?: OptaleCompanyBrainPromotion[];
  reviewQueue?: OptaleCompanyBrainReviewQueue | null;
  downstream?: OptaleBrainDownstreamCall[];
}): OptaleCompanyBrainAddonResponse {
  const targets = input.targets || [];
  const promotions = input.promotions || [];
  const overview = input.overview || emptyOverview();
  const reviewQueue = input.reviewQueue || null;
  const downstream = input.downstream || [];
  const queueJobsLoaded = reviewQueue
    ? reviewQueue.pendingJobs.length +
      reviewQueue.processingJobs.length +
      reviewQueue.completedJobs.length +
      reviewQueue.failedJobs.length
    : 0;

  return {
    version: 1,
    generatedAt: input.generatedAt,
    httpStatus: input.httpStatus || 200,
    request: input.core.request,
    addon: input.addon,
    source: input.source,
    bridge: input.bridge,
    actions:
      input.actions ||
      companyBrainActionsStatus({
        addon: input.addon,
        bridge: input.bridge,
        targetId: input.targetId,
      }),
    targetId: input.targetId,
    statusFilter: input.statusFilter,
    targets,
    overview,
    promotions,
    reviewQueue,
    downstream,
    stats: {
      addonEnabled: input.addon.enabled,
      bridgeEnabled: input.bridge.enabled,
      bridgeConfigured: input.bridge.configured,
      targetSelected: Boolean(input.targetId),
      targetsLoaded: targets.length,
      promotionsLoaded: promotions.length,
      recentPromotionsLoaded: overview?.recentPromotions.length || 0,
      queueJobsLoaded,
      downstreamCalls: downstream.length,
      downstreamErrors: downstream.filter((call) => !call.ok).length,
    },
  };
}

export async function readOptaleCompanyBrainAddon(
  input: OptaleCompanyBrainReadOptions = {}
): Promise<OptaleCompanyBrainAddonResponse> {
  const addonState = await resolveOptaleCompanyBrainReviewerAddon(input.cabinetPath);
  const core = redactBrainCoreStatusForClient(
    await readOptaleBrainCoreStatus({
      cabinetPath: addonState.context.cabinetPath,
    })
  );
  const source = sourceFromCore(core);
  const bridge = getPublicCommandBrainBridgeStatus();
  const generatedAt = new Date().toISOString();
  const statusFilter =
    trimBrainAdapterString(input.status) || DEFAULT_STATUS_FILTER;
  const requestedTargetId = trimBrainAdapterString(input.targetId);
  const addonTargetId = trimBrainAdapterString(addonState.addon.targetId);
  const targetId = addonTargetId || requestedTargetId;
  const actions = companyBrainActionsStatus({
    addon: addonState.addon,
    bridge,
    targetId,
  });

  if (!addonState.addon.enabled) {
    return buildResponse({
      generatedAt,
      httpStatus: 403,
      core,
      addon: addonState.addon,
      source,
      bridge,
      actions,
      targetId: addonTargetId,
      statusFilter,
    });
  }

  if (requestedTargetId && addonTargetId && requestedTargetId !== addonTargetId) {
    return buildResponse({
      generatedAt,
      httpStatus: 403,
      core,
      addon: {
        ...addonState.addon,
        reason: "Requested Company Brain target is outside this scope add-on.",
      },
      source: {
        ...source,
        status: "blocked",
        statusReason: "Requested Company Brain target is outside this scope add-on.",
        permissions: [],
        capabilities: [],
      },
      bridge,
      actions: companyBrainActionsStatus({
        addon: addonState.addon,
        bridge,
        targetId: addonTargetId,
      }),
      targetId: addonTargetId,
      statusFilter,
    });
  }

  if (!targetId || !bridge.enabled) {
    return buildResponse({
      generatedAt,
      core,
      addon: addonState.addon,
      source,
      bridge,
      actions,
      targetId,
      statusFilter,
    });
  }

  const actor = {
    userId:
      addonState.context.personId ||
      addonState.context.ownerId ||
      "optale-observatory",
    role: "ADMIN",
    tenantId: addonState.context.tenantId,
    subjectType: addonState.context.subjectType,
    allowedTargetIds: [targetId],
  };

  const targetSearchParams = new URLSearchParams();
  const promotionsSearchParams = new URLSearchParams({ status: statusFilter });
  const [targetsCall, overviewCall, promotionsCall, queueCall] = await Promise.all([
    callCompanyBrainBridge({
      name: "companyBrain.targets",
      path: ["company-brain", "targets"],
      searchParams: targetSearchParams,
      requestHeaders: input.requestHeaders,
      actor,
      fetchImpl: input.fetchImpl,
    }),
    callCompanyBrainBridge({
      name: "companyBrain.overview",
      path: ["company-brain", targetId, "overview"],
      requestHeaders: input.requestHeaders,
      actor,
      fetchImpl: input.fetchImpl,
    }),
    callCompanyBrainBridge({
      name: "companyBrain.promotions",
      path: ["company-brain", targetId, "promotions"],
      searchParams: promotionsSearchParams,
      requestHeaders: input.requestHeaders,
      actor,
      fetchImpl: input.fetchImpl,
    }),
    callCompanyBrainBridge({
      name: "companyBrain.reviewQueue",
      path: ["company-brain", targetId, "review-queue"],
      requestHeaders: input.requestHeaders,
      actor,
      fetchImpl: input.fetchImpl,
    }),
  ]);

  const targetsBody = asRecord(targetsCall.data);
  const overviewBody = asRecord(overviewCall.data);
  const promotionsBody = asRecord(promotionsCall.data);
  const targets = asArray(targetsBody.targets).map(normalizeTarget);
  const overviewTarget = overviewBody.target
    ? normalizeTarget(overviewBody.target)
    : targets.find((target) => target.targetId === targetId) || null;
  const overviewHealth = normalizeHealth(overviewBody.health, targetId);
  const promotions = asArray(promotionsBody.promotions).map(normalizePromotion);
  const reviewQueue = normalizeReviewQueue(queueCall.data);

  return buildResponse({
    generatedAt,
    core,
    addon: addonState.addon,
    source,
    bridge,
    actions,
    targetId,
    statusFilter,
    targets,
    overview: {
      target: overviewTarget,
      health: overviewHealth,
      counts: normalizeCounts(overviewBody.counts),
      recentPromotions: asArray(overviewBody.recentPromotions).map(normalizePromotion),
    },
    promotions,
    reviewQueue,
    downstream: [
      targetsCall.call,
      overviewCall.call,
      promotionsCall.call,
      queueCall.call,
    ],
  });
}

function companyBrainActionRequest(input: {
  action: OptaleCompanyBrainAction;
  targetId: string;
  promotionId: string;
  reviewerNotes?: string;
  force?: boolean;
  dryRun?: boolean;
}): {
  method: "POST" | "PATCH";
  path: string[];
  body: Record<string, unknown>;
} {
  if (input.action === "run-agent-review") {
    return {
      method: "POST",
      path: [
        "company-brain",
        input.targetId,
        "promotions",
        input.promotionId,
        "review-agent",
      ],
      body: {},
    };
  }

  if (input.action === "promote" || input.action === "promote-dry-run") {
    return {
      method: "POST",
      path: [
        "company-brain",
        input.targetId,
        "promotions",
        input.promotionId,
        "promote",
      ],
      body: {
        force: input.force === true,
        dryRun: input.dryRun === true || input.action === "promote-dry-run",
      },
    };
  }

  const statusByAction: Record<
    Exclude<OptaleCompanyBrainAction, "run-agent-review" | "promote" | "promote-dry-run">,
    string
  > = {
    "mark-in-review": "in_review",
    "request-changes": "needs_changes",
    approve: "approved",
    reject: "rejected",
  };

  return {
    method: "PATCH",
    path: [
      "company-brain",
      input.targetId,
      "promotions",
      input.promotionId,
      "review",
    ],
    body: {
      status: statusByAction[input.action],
      reviewerNotes: input.reviewerNotes || "",
    },
  };
}

function buildActionResponse(input: {
  generatedAt: string;
  httpStatus: number;
  core: OptaleBrainPublicCoreStatus;
  addon: OptaleCompanyBrainReviewerAddon;
  source: OptaleBrainAdapterBinding;
  bridge: OptaleCommandBrainPublicStatus;
  actions: OptaleCompanyBrainActionsStatus;
  targetId?: string;
  promotionId?: string;
  action: OptaleCompanyBrainAction | "invalid";
  ok: boolean;
  result?: unknown;
  downstream?: OptaleBrainDownstreamCall[];
  error?: string;
}): OptaleCompanyBrainActionResponse {
  const resultRecord = asRecord(input.result);
  const promotion = resultRecord.promotion
    ? normalizePromotion(resultRecord.promotion)
    : undefined;
  return {
    version: 1,
    generatedAt: input.generatedAt,
    httpStatus: input.httpStatus,
    request: input.core.request,
    addon: input.addon,
    source: input.source,
    bridge: input.bridge,
    actions: input.actions,
    targetId: input.targetId,
    promotionId: input.promotionId,
    action: input.action,
    ok: input.ok,
    result: compactCompanyBrainValueForClient(input.result ?? null),
    promotion,
    writeResult: compactCompanyBrainValueForClient(resultRecord.writeResult),
    idempotent:
      typeof resultRecord.idempotent === "boolean" ? resultRecord.idempotent : undefined,
    downstream: input.downstream || [],
    error: input.error,
  };
}

function buildPromotionCreateResponse(input: {
  generatedAt: string;
  httpStatus: number;
  core: OptaleBrainPublicCoreStatus;
  addon: OptaleCompanyBrainReviewerAddon;
  source: OptaleBrainAdapterBinding;
  bridge: OptaleCommandBrainPublicStatus;
  actions: OptaleCompanyBrainActionsStatus;
  targetId?: string;
  submitted: boolean;
  ok: boolean;
  result?: unknown;
  downstream?: OptaleBrainDownstreamCall[];
  error?: string;
}): OptaleCompanyBrainPromotionCreateResponse {
  const resultRecord = asRecord(input.result);
  const promotion = resultRecord.promotion
    ? normalizePromotion(resultRecord.promotion)
    : undefined;
  return {
    version: 1,
    generatedAt: input.generatedAt,
    httpStatus: input.httpStatus,
    request: input.core.request,
    addon: input.addon,
    source: input.source,
    bridge: input.bridge,
    actions: input.actions,
    targetId: input.targetId,
    ok: input.ok,
    submitted: input.submitted,
    promotion,
    reviewJob: compactCompanyBrainValueForClient(resultRecord.reviewJob),
    result: compactCompanyBrainValueForClient(input.result ?? null),
    downstream: input.downstream || [],
    error: input.error,
  };
}

export async function submitOptaleCompanyBrainAction(
  input: OptaleCompanyBrainActionOptions
): Promise<OptaleCompanyBrainActionResponse> {
  const addonState = await resolveOptaleCompanyBrainReviewerAddon(input.cabinetPath);
  const core = redactBrainCoreStatusForClient(
    await readOptaleBrainCoreStatus({
      cabinetPath: addonState.context.cabinetPath,
    })
  );
  const source = sourceFromCore(core);
  const bridge = getPublicCommandBrainBridgeStatus(input.env);
  const generatedAt = new Date().toISOString();
  const requestedTargetId = trimBrainAdapterString(input.targetId);
  const addonTargetId = trimBrainAdapterString(addonState.addon.targetId);
  const targetId = addonTargetId || requestedTargetId;
  const actions = companyBrainActionsStatus({
    addon: addonState.addon,
    bridge,
    targetId,
    env: input.env,
  });
  const action =
    normalizeCompanyBrainAction(trimBrainAdapterString(input.action)) || "invalid";
  const promotionId = safePromotionId(trimBrainAdapterString(input.promotionId));

  if (!addonState.addon.enabled) {
    return buildActionResponse({
      generatedAt,
      httpStatus: 403,
      core,
      addon: addonState.addon,
      source,
      bridge,
      actions,
      targetId,
      promotionId,
      action,
      ok: false,
      error: addonState.addon.reason || "Company Brain reviewer add-on is not enabled.",
    });
  }

  if (requestedTargetId && addonTargetId && requestedTargetId !== addonTargetId) {
    return buildActionResponse({
      generatedAt,
      httpStatus: 403,
      core,
      addon: addonState.addon,
      source,
      bridge,
      actions,
      targetId: addonTargetId,
      promotionId,
      action,
      ok: false,
      error: "Requested Company Brain target is outside this scope add-on.",
    });
  }

  if (!targetId || action === "invalid" || !promotionId) {
    return buildActionResponse({
      generatedAt,
      httpStatus: 400,
      core,
      addon: addonState.addon,
      source,
      bridge,
      actions,
      targetId,
      promotionId,
      action,
      ok: false,
      error: "A valid targetId, promotionId, and action are required.",
    });
  }

  if (!actions.enabled) {
    return buildActionResponse({
      generatedAt,
      httpStatus: 403,
      core,
      addon: addonState.addon,
      source,
      bridge,
      actions,
      targetId,
      promotionId,
      action,
      ok: false,
      error: actions.reason || "Company Brain actions are disabled.",
    });
  }

  const actor = {
    userId:
      addonState.context.personId ||
      addonState.context.ownerId ||
      "optale-observatory",
    role: "ADMIN",
    tenantId: addonState.context.tenantId,
    subjectType: addonState.context.subjectType,
    allowedTargetIds: [targetId],
  };
  const upstream = companyBrainActionRequest({
    action,
    targetId,
    promotionId,
    reviewerNotes: trimBrainAdapterString(input.reviewerNotes),
    force: input.force,
    dryRun: input.dryRun,
  });
  const result = await proxyCommandBrainMutation({
    ...upstream,
    requestHeaders: input.requestHeaders,
    actor,
    env: input.env,
    fetchImpl: input.fetchImpl,
  });
  const ok = result.status >= 200 && result.status < 300;
  const text = renderDownstreamText(result.body);
  const downstream: OptaleBrainDownstreamCall[] = [
    {
      name: `companyBrain.action.${action}`,
      ok,
      status: ok ? "ok" : "error",
      text: text || (ok ? "ok" : `Request failed with ${result.status}`),
      json: compactCompanyBrainValueForClient(result.body),
      error: ok
        ? undefined
        : normalizeBrainDownstreamError(`${result.status} ${text}`),
    },
  ];

  return buildActionResponse({
    generatedAt,
    httpStatus: result.status,
    core,
    addon: addonState.addon,
    source,
    bridge,
    actions,
    targetId,
    promotionId,
    action,
    ok,
    result: result.body,
    downstream,
    error: ok
      ? undefined
      : stringValue(asRecord(result.body).error) ||
        stringValue(asRecord(result.body).message) ||
        `Company Brain action failed with ${result.status}.`,
  });
}

export async function createOptaleCompanyBrainPromotion(
  input: OptaleCompanyBrainPromotionCreateOptions
): Promise<OptaleCompanyBrainPromotionCreateResponse> {
  const addonState = await resolveOptaleCompanyBrainReviewerAddon(input.cabinetPath);
  const core = redactBrainCoreStatusForClient(
    await readOptaleBrainCoreStatus({
      cabinetPath: addonState.context.cabinetPath,
    })
  );
  const source = sourceFromCore(core);
  const bridge = getPublicCommandBrainBridgeStatus(input.env);
  const generatedAt = new Date().toISOString();
  const requestedTargetId = trimBrainAdapterString(input.targetId);
  const addonTargetId = trimBrainAdapterString(addonState.addon.targetId);
  const targetId = addonTargetId || requestedTargetId;
  const submitted = input.submit === true;
  const actions = companyBrainActionsStatus({
    addon: addonState.addon,
    bridge,
    targetId,
    env: input.env,
  });

  if (!addonState.addon.enabled) {
    return buildPromotionCreateResponse({
      generatedAt,
      httpStatus: 403,
      core,
      addon: addonState.addon,
      source,
      bridge,
      actions,
      targetId,
      submitted,
      ok: false,
      error: addonState.addon.reason || "Company Brain reviewer add-on is not enabled.",
    });
  }

  if (requestedTargetId && addonTargetId && requestedTargetId !== addonTargetId) {
    return buildPromotionCreateResponse({
      generatedAt,
      httpStatus: 403,
      core,
      addon: addonState.addon,
      source,
      bridge,
      actions,
      targetId: addonTargetId,
      submitted,
      ok: false,
      error: "Requested Company Brain target is outside this scope add-on.",
    });
  }

  const title = trimBrainAdapterString(input.title).slice(0, 300);
  const summary = trimBrainAdapterString(input.summary).slice(0, MAX_CLIENT_STRING);
  const content = trimBrainAdapterString(input.content).slice(0, 24_000);
  if (!targetId || !title) {
    return buildPromotionCreateResponse({
      generatedAt,
      httpStatus: 400,
      core,
      addon: addonState.addon,
      source,
      bridge,
      actions,
      targetId,
      submitted,
      ok: false,
      error: "A valid targetId and title are required.",
    });
  }

  if (!actions.enabled) {
    return buildPromotionCreateResponse({
      generatedAt,
      httpStatus: 403,
      core,
      addon: addonState.addon,
      source,
      bridge,
      actions,
      targetId,
      submitted,
      ok: false,
      error: actions.reason || "Company Brain actions are disabled.",
    });
  }

  const sourceType = COMPANY_BRAIN_SOURCE_TYPES.has(trimBrainAdapterString(input.sourceType))
    ? trimBrainAdapterString(input.sourceType)
    : "manual";
  const sensitivity = COMPANY_BRAIN_SENSITIVITIES.has(
    trimBrainAdapterString(input.sensitivity)
  )
    ? trimBrainAdapterString(input.sensitivity)
    : "internal";
  const actor = {
    userId:
      addonState.context.personId ||
      addonState.context.ownerId ||
      "optale-observatory",
    role: "ADMIN",
    tenantId: addonState.context.tenantId,
    subjectType: addonState.context.subjectType,
    allowedTargetIds: [targetId],
  };

  const result = await proxyCommandBrainMutation({
    path: ["brain", "promotions"],
    method: "POST",
    body: {
      targetId,
      sourceType,
      sourceRef: asRecord(input.sourceRef),
      title,
      summary,
      content,
      payload: asRecord(input.payload),
      sensitivity,
      entityTypes: stringList(input.entityTypes),
      tags: stringList(input.tags),
      notes: trimBrainAdapterString(input.notes).slice(0, 2000),
      submit: submitted,
    },
    requestHeaders: input.requestHeaders,
    actor,
    env: input.env,
    fetchImpl: input.fetchImpl,
  });
  const ok = result.status >= 200 && result.status < 300;
  const text = renderDownstreamText(result.body);
  const downstream: OptaleBrainDownstreamCall[] = [
    {
      name: "companyBrain.promotion.create",
      ok,
      status: ok ? "ok" : "error",
      text: text || (ok ? "ok" : `Request failed with ${result.status}`),
      json: compactCompanyBrainValueForClient(result.body),
      error: ok
        ? undefined
        : normalizeBrainDownstreamError(`${result.status} ${text}`),
    },
  ];

  return buildPromotionCreateResponse({
    generatedAt,
    httpStatus: result.status,
    core,
    addon: addonState.addon,
    source,
    bridge,
    actions,
    targetId,
    submitted,
    ok,
    result: result.body,
    downstream,
    error: ok
      ? undefined
      : stringValue(asRecord(result.body).error) ||
        stringValue(asRecord(result.body).message) ||
        `Company Brain promotion create failed with ${result.status}.`,
  });
}
