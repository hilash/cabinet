import type { OptaleAgentScope } from "@/lib/optale/product";

export const AGENT_DEFINITION_SCHEMA_VERSION = 1 as const;

export const AGENT_DEFINITION_SCHEMA = {
  kind: "optale.agent-definition",
  version: AGENT_DEFINITION_SCHEMA_VERSION,
  requiredFields: [
    "id",
    "name",
    "role",
    "description",
    "instructions",
    "provider",
    "scope",
    "memoryNamespace",
    "mcp",
    "handoffs",
    "schedules",
    "approvalPolicy",
    "runtimeProjections",
  ],
} as const;

export type AgentDefinitionSchemaVersion =
  typeof AGENT_DEFINITION_SCHEMA_VERSION;

export type AgentDefinitionMcpPermission = "read" | "write" | "execute";
export type AgentDefinitionApprovalMode = "never" | "on-request" | "always";
export type AgentDefinitionScheduleType = "manual" | "event" | "cron";

export interface AgentDefinitionProviderDefaults {
  providerId: string;
  providerName: string;
  model: string;
  modelAlias?: string;
  modelParameters?: {
    temperature?: number;
    reasoningEffort?: string;
  };
}

export interface AgentDefinitionMcpServerRule {
  serverId: string;
  legacyServerName?: string;
  permissions: AgentDefinitionMcpPermission[];
  toolGroups: string[];
  allowedTools: string[];
  deniedTools: string[];
  notes?: string;
}

export interface AgentDefinitionMcpPolicy {
  defaultDecision: "deny";
  servers: AgentDefinitionMcpServerRule[];
  restrictions: string[];
}

export interface AgentDefinitionHandoffEdge {
  to: string;
  edgeType: "handoff";
  description: string;
  prompt: string;
  legacyToolName?: string;
}

export interface AgentDefinitionSchedule {
  id: string;
  type: AgentDefinitionScheduleType;
  description: string;
  enabled: boolean;
  cron?: string;
}

export interface AgentDefinitionApprovalPolicy {
  mode: AgentDefinitionApprovalMode;
  requiredFor: string[];
  notes?: string;
}

export interface AgentDefinitionRuntimeProjections {
  nativeOptaleCommand: {
    status: "planned" | "active";
    agentSlug: string;
    personaSlug?: string;
    routineIds: string[];
    projectionStrategy: "generate-from-manifest" | "import-from-manifest";
    notes?: string;
  };
  legacyLibreChatBridge: {
    status: "temporary-bridge" | "disabled";
    bridgeOnly: true;
    agentId: string;
    sourceScript: string;
    providerName: string;
    model: string;
    mcpServerNames: string[];
    toolIds: string[];
    notes?: string;
  };
}

export interface AgentDefinition {
  schemaVersion: AgentDefinitionSchemaVersion;
  id: string;
  name: string;
  role: string;
  description: string;
  instructions: string;
  provider: AgentDefinitionProviderDefaults;
  scope: OptaleAgentScope;
  memoryNamespace: string;
  mcp: AgentDefinitionMcpPolicy;
  handoffs: AgentDefinitionHandoffEdge[];
  schedules: AgentDefinitionSchedule[];
  approvalPolicy: AgentDefinitionApprovalPolicy;
  runtimeProjections: AgentDefinitionRuntimeProjections;
}

export interface AgentDefinitionManifest {
  schemaVersion: AgentDefinitionSchemaVersion;
  id: string;
  name: string;
  description: string;
  agents: AgentDefinition[];
}

export interface AgentDefinitionValidationIssue {
  path: string;
  message: string;
}

export interface AgentDefinitionValidationResult<T> {
  ok: boolean;
  value?: T;
  issues: AgentDefinitionValidationIssue[];
}

const VALID_SCOPES = new Set<OptaleAgentScope>([
  "personal",
  "company",
  "system",
]);
const VALID_MCP_PERMISSIONS = new Set<AgentDefinitionMcpPermission>([
  "read",
  "write",
  "execute",
]);
const VALID_APPROVAL_MODES = new Set<AgentDefinitionApprovalMode>([
  "never",
  "on-request",
  "always",
]);
const VALID_SCHEDULE_TYPES = new Set<AgentDefinitionScheduleType>([
  "manual",
  "event",
  "cron",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function addIssue(
  issues: AgentDefinitionValidationIssue[],
  path: string,
  message: string
): void {
  issues.push({ path, message });
}

function requireSchemaVersion(
  value: unknown,
  path: string,
  issues: AgentDefinitionValidationIssue[]
): void {
  if (value !== AGENT_DEFINITION_SCHEMA_VERSION) {
    addIssue(
      issues,
      path,
      `must be ${AGENT_DEFINITION_SCHEMA_VERSION}`
    );
  }
}

function requireNonEmptyString(
  value: unknown,
  path: string,
  issues: AgentDefinitionValidationIssue[]
): void {
  if (typeof value !== "string" || value.trim() === "") {
    addIssue(issues, path, "must be a non-empty string");
  }
}

function requireStringArray(
  value: unknown,
  path: string,
  issues: AgentDefinitionValidationIssue[],
  options: { minLength?: number } = {}
): void {
  if (!Array.isArray(value)) {
    addIssue(issues, path, "must be an array");
    return;
  }
  if (options.minLength && value.length < options.minLength) {
    addIssue(issues, path, `must contain at least ${options.minLength} item(s)`);
  }
  value.forEach((entry, index) => {
    if (typeof entry !== "string" || entry.trim() === "") {
      addIssue(issues, `${path}[${index}]`, "must be a non-empty string");
    }
  });
}

function requireBoolean(
  value: unknown,
  path: string,
  issues: AgentDefinitionValidationIssue[]
): void {
  if (typeof value !== "boolean") {
    addIssue(issues, path, "must be a boolean");
  }
}

function validateProviderDefaults(
  value: unknown,
  path: string,
  issues: AgentDefinitionValidationIssue[]
): void {
  if (!isRecord(value)) {
    addIssue(issues, path, "must be an object");
    return;
  }
  requireNonEmptyString(value.providerId, `${path}.providerId`, issues);
  requireNonEmptyString(value.providerName, `${path}.providerName`, issues);
  requireNonEmptyString(value.model, `${path}.model`, issues);
  if (value.modelAlias !== undefined) {
    requireNonEmptyString(value.modelAlias, `${path}.modelAlias`, issues);
  }
  if (value.modelParameters !== undefined) {
    if (!isRecord(value.modelParameters)) {
      addIssue(issues, `${path}.modelParameters`, "must be an object");
      return;
    }
    const parameters = value.modelParameters;
    if (
      parameters.temperature !== undefined &&
      (typeof parameters.temperature !== "number" ||
        parameters.temperature < 0 ||
        parameters.temperature > 2)
    ) {
      addIssue(
        issues,
        `${path}.modelParameters.temperature`,
        "must be a number from 0 to 2"
      );
    }
    if (parameters.reasoningEffort !== undefined) {
      requireNonEmptyString(
        parameters.reasoningEffort,
        `${path}.modelParameters.reasoningEffort`,
        issues
      );
    }
  }
}

function validateMcpServerRule(
  value: unknown,
  path: string,
  issues: AgentDefinitionValidationIssue[]
): void {
  if (!isRecord(value)) {
    addIssue(issues, path, "must be an object");
    return;
  }
  requireNonEmptyString(value.serverId, `${path}.serverId`, issues);
  if (value.legacyServerName !== undefined) {
    requireNonEmptyString(value.legacyServerName, `${path}.legacyServerName`, issues);
  }
  requireStringArray(value.toolGroups, `${path}.toolGroups`, issues, {
    minLength: 1,
  });
  requireStringArray(value.allowedTools, `${path}.allowedTools`, issues);
  requireStringArray(value.deniedTools, `${path}.deniedTools`, issues);
  if (value.notes !== undefined) {
    requireNonEmptyString(value.notes, `${path}.notes`, issues);
  }
  if (!Array.isArray(value.permissions) || value.permissions.length === 0) {
    addIssue(issues, `${path}.permissions`, "must contain at least one permission");
    return;
  }
  value.permissions.forEach((permission, index) => {
    if (
      typeof permission !== "string" ||
      !VALID_MCP_PERMISSIONS.has(permission as AgentDefinitionMcpPermission)
    ) {
      addIssue(
        issues,
        `${path}.permissions[${index}]`,
        "must be one of read, write, execute"
      );
    }
  });
}

function validateMcpPolicy(
  value: unknown,
  path: string,
  issues: AgentDefinitionValidationIssue[]
): void {
  if (!isRecord(value)) {
    addIssue(issues, path, "must be an object");
    return;
  }
  if (value.defaultDecision !== "deny") {
    addIssue(issues, `${path}.defaultDecision`, "must be deny");
  }
  requireStringArray(value.restrictions, `${path}.restrictions`, issues, {
    minLength: 1,
  });
  if (!Array.isArray(value.servers) || value.servers.length === 0) {
    addIssue(issues, `${path}.servers`, "must contain at least one server rule");
    return;
  }
  value.servers.forEach((server, index) =>
    validateMcpServerRule(server, `${path}.servers[${index}]`, issues)
  );
}

function validateHandoffEdge(
  value: unknown,
  path: string,
  issues: AgentDefinitionValidationIssue[]
): void {
  if (!isRecord(value)) {
    addIssue(issues, path, "must be an object");
    return;
  }
  requireNonEmptyString(value.to, `${path}.to`, issues);
  if (value.edgeType !== "handoff") {
    addIssue(issues, `${path}.edgeType`, "must be handoff");
  }
  requireNonEmptyString(value.description, `${path}.description`, issues);
  requireNonEmptyString(value.prompt, `${path}.prompt`, issues);
  if (value.legacyToolName !== undefined) {
    requireNonEmptyString(value.legacyToolName, `${path}.legacyToolName`, issues);
  }
}

function validateSchedule(
  value: unknown,
  path: string,
  issues: AgentDefinitionValidationIssue[]
): void {
  if (!isRecord(value)) {
    addIssue(issues, path, "must be an object");
    return;
  }
  requireNonEmptyString(value.id, `${path}.id`, issues);
  if (
    typeof value.type !== "string" ||
    !VALID_SCHEDULE_TYPES.has(value.type as AgentDefinitionScheduleType)
  ) {
    addIssue(issues, `${path}.type`, "must be one of manual, event, cron");
  }
  requireNonEmptyString(value.description, `${path}.description`, issues);
  requireBoolean(value.enabled, `${path}.enabled`, issues);
  if (value.type === "cron") {
    requireNonEmptyString(value.cron, `${path}.cron`, issues);
  } else if (value.cron !== undefined) {
    addIssue(issues, `${path}.cron`, "is only valid for cron schedules");
  }
}

function validateApprovalPolicy(
  value: unknown,
  path: string,
  issues: AgentDefinitionValidationIssue[]
): void {
  if (!isRecord(value)) {
    addIssue(issues, path, "must be an object");
    return;
  }
  if (
    typeof value.mode !== "string" ||
    !VALID_APPROVAL_MODES.has(value.mode as AgentDefinitionApprovalMode)
  ) {
    addIssue(issues, `${path}.mode`, "must be one of never, on-request, always");
  }
  requireStringArray(value.requiredFor, `${path}.requiredFor`, issues, {
    minLength: 1,
  });
  if (value.notes !== undefined) {
    requireNonEmptyString(value.notes, `${path}.notes`, issues);
  }
}

function validateRuntimeProjections(
  value: unknown,
  path: string,
  issues: AgentDefinitionValidationIssue[]
): void {
  if (!isRecord(value)) {
    addIssue(issues, path, "must be an object");
    return;
  }

  const nativePath = `${path}.nativeOptaleCommand`;
  if (!isRecord(value.nativeOptaleCommand)) {
    addIssue(issues, nativePath, "must be an object");
  } else {
    const native = value.nativeOptaleCommand;
    if (native.status !== "planned" && native.status !== "active") {
      addIssue(issues, `${nativePath}.status`, "must be planned or active");
    }
    requireNonEmptyString(native.agentSlug, `${nativePath}.agentSlug`, issues);
    if (native.personaSlug !== undefined) {
      requireNonEmptyString(native.personaSlug, `${nativePath}.personaSlug`, issues);
    }
    requireStringArray(native.routineIds, `${nativePath}.routineIds`, issues);
    if (
      native.projectionStrategy !== "generate-from-manifest" &&
      native.projectionStrategy !== "import-from-manifest"
    ) {
      addIssue(
        issues,
        `${nativePath}.projectionStrategy`,
        "must be generate-from-manifest or import-from-manifest"
      );
    }
    if (native.notes !== undefined) {
      requireNonEmptyString(native.notes, `${nativePath}.notes`, issues);
    }
  }

  const legacyPath = `${path}.legacyLibreChatBridge`;
  if (!isRecord(value.legacyLibreChatBridge)) {
    addIssue(issues, legacyPath, "must be an object");
  } else {
    const legacy = value.legacyLibreChatBridge;
    if (legacy.status !== "temporary-bridge" && legacy.status !== "disabled") {
      addIssue(
        issues,
        `${legacyPath}.status`,
        "must be temporary-bridge or disabled"
      );
    }
    if (legacy.bridgeOnly !== true) {
      addIssue(issues, `${legacyPath}.bridgeOnly`, "must be true");
    }
    requireNonEmptyString(legacy.agentId, `${legacyPath}.agentId`, issues);
    requireNonEmptyString(legacy.sourceScript, `${legacyPath}.sourceScript`, issues);
    requireNonEmptyString(legacy.providerName, `${legacyPath}.providerName`, issues);
    requireNonEmptyString(legacy.model, `${legacyPath}.model`, issues);
    requireStringArray(
      legacy.mcpServerNames,
      `${legacyPath}.mcpServerNames`,
      issues
    );
    requireStringArray(legacy.toolIds, `${legacyPath}.toolIds`, issues);
    if (legacy.notes !== undefined) {
      requireNonEmptyString(legacy.notes, `${legacyPath}.notes`, issues);
    }
  }
}

function validateAgentDefinitionObject(
  value: unknown,
  path: string,
  issues: AgentDefinitionValidationIssue[]
): void {
  if (!isRecord(value)) {
    addIssue(issues, path, "must be an object");
    return;
  }

  requireSchemaVersion(value.schemaVersion, `${path}.schemaVersion`, issues);
  requireNonEmptyString(value.id, `${path}.id`, issues);
  requireNonEmptyString(value.name, `${path}.name`, issues);
  requireNonEmptyString(value.role, `${path}.role`, issues);
  requireNonEmptyString(value.description, `${path}.description`, issues);
  requireNonEmptyString(value.instructions, `${path}.instructions`, issues);
  validateProviderDefaults(value.provider, `${path}.provider`, issues);
  if (
    typeof value.scope !== "string" ||
    !VALID_SCOPES.has(value.scope as OptaleAgentScope)
  ) {
    addIssue(issues, `${path}.scope`, "must be personal, company, or system");
  }
  requireNonEmptyString(value.memoryNamespace, `${path}.memoryNamespace`, issues);
  validateMcpPolicy(value.mcp, `${path}.mcp`, issues);

  if (!Array.isArray(value.handoffs)) {
    addIssue(issues, `${path}.handoffs`, "must be an array");
  } else {
    value.handoffs.forEach((handoff, index) =>
      validateHandoffEdge(handoff, `${path}.handoffs[${index}]`, issues)
    );
  }

  if (!Array.isArray(value.schedules) || value.schedules.length === 0) {
    addIssue(issues, `${path}.schedules`, "must contain at least one schedule");
  } else {
    value.schedules.forEach((schedule, index) =>
      validateSchedule(schedule, `${path}.schedules[${index}]`, issues)
    );
  }

  validateApprovalPolicy(
    value.approvalPolicy,
    `${path}.approvalPolicy`,
    issues
  );
  validateRuntimeProjections(
    value.runtimeProjections,
    `${path}.runtimeProjections`,
    issues
  );
}

export function validateAgentDefinition(
  value: unknown
): AgentDefinitionValidationResult<AgentDefinition> {
  const issues: AgentDefinitionValidationIssue[] = [];
  validateAgentDefinitionObject(value, "agent", issues);
  return {
    ok: issues.length === 0,
    value: issues.length === 0 ? (value as AgentDefinition) : undefined,
    issues,
  };
}

export function validateAgentManifest(
  value: unknown
): AgentDefinitionValidationResult<AgentDefinitionManifest> {
  const issues: AgentDefinitionValidationIssue[] = [];

  if (!isRecord(value)) {
    addIssue(issues, "manifest", "must be an object");
    return { ok: false, issues };
  }

  requireSchemaVersion(value.schemaVersion, "manifest.schemaVersion", issues);
  requireNonEmptyString(value.id, "manifest.id", issues);
  requireNonEmptyString(value.name, "manifest.name", issues);
  requireNonEmptyString(value.description, "manifest.description", issues);

  if (!Array.isArray(value.agents) || value.agents.length === 0) {
    addIssue(issues, "manifest.agents", "must contain at least one agent");
  } else {
    const ids = new Map<string, number>();
    const legacyIds = new Map<string, number>();

    value.agents.forEach((agent, index) => {
      validateAgentDefinitionObject(agent, `manifest.agents[${index}]`, issues);
      if (!isRecord(agent)) return;

      if (typeof agent.id === "string" && agent.id.trim()) {
        const previous = ids.get(agent.id);
        if (previous !== undefined) {
          addIssue(
            issues,
            `manifest.agents[${index}].id`,
            `duplicates manifest.agents[${previous}].id`
          );
        } else {
          ids.set(agent.id, index);
        }
      }

      const legacy = isRecord(agent.runtimeProjections)
        ? agent.runtimeProjections.legacyLibreChatBridge
        : undefined;
      if (isRecord(legacy) && typeof legacy.agentId === "string" && legacy.agentId.trim()) {
        const previous = legacyIds.get(legacy.agentId);
        if (previous !== undefined) {
          addIssue(
            issues,
            `manifest.agents[${index}].runtimeProjections.legacyLibreChatBridge.agentId`,
            `duplicates manifest.agents[${previous}].runtimeProjections.legacyLibreChatBridge.agentId`
          );
        } else {
          legacyIds.set(legacy.agentId, index);
        }
      }
    });

    value.agents.forEach((agent, index) => {
      if (!isRecord(agent) || !Array.isArray(agent.handoffs)) return;
      agent.handoffs.forEach((handoff, handoffIndex) => {
        if (!isRecord(handoff) || typeof handoff.to !== "string") return;
        if (!ids.has(handoff.to)) {
          addIssue(
            issues,
            `manifest.agents[${index}].handoffs[${handoffIndex}].to`,
            `references unknown agent id ${handoff.to}`
          );
        }
        if (handoff.to === agent.id) {
          addIssue(
            issues,
            `manifest.agents[${index}].handoffs[${handoffIndex}].to`,
            "cannot reference the same agent"
          );
        }
      });
    });
  }

  return {
    ok: issues.length === 0,
    value:
      issues.length === 0
        ? (value as unknown as AgentDefinitionManifest)
        : undefined,
    issues,
  };
}

export function assertValidAgentDefinition(
  value: unknown
): asserts value is AgentDefinition {
  const result = validateAgentDefinition(value);
  if (!result.ok) {
    throw new Error(
      `Invalid AgentDefinition:\n${result.issues
        .map((issue) => `- ${issue.path}: ${issue.message}`)
        .join("\n")}`
    );
  }
}

export function assertValidAgentManifest(
  value: unknown
): asserts value is AgentDefinitionManifest {
  const result = validateAgentManifest(value);
  if (!result.ok) {
    throw new Error(
      `Invalid AgentDefinition manifest:\n${result.issues
        .map((issue) => `- ${issue.path}: ${issue.message}`)
        .join("\n")}`
    );
  }
}
