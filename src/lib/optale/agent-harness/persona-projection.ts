import path from "path";
import matter from "gray-matter";
import type { AgentPersona } from "@/lib/agents/persona-manager";
import { DATA_DIR } from "@/lib/storage/path-utils";
import {
  ensureDirectory,
  fileExists,
  writeFileContent,
} from "@/lib/storage/fs-operations";
import {
  validateAgentManifest,
  type AgentDefinition,
  type AgentDefinitionManifest,
} from "./agent-definition";

export const OPTALE_AGENT_HARNESS_PERSONA_GENERATOR =
  "optale-agent-harness/persona-projection";

type PersonaFrontmatter = Pick<
  AgentPersona,
  | "name"
  | "role"
  | "provider"
  | "adapterType"
  | "adapterConfig"
  | "heartbeat"
  | "budget"
  | "active"
  | "workdir"
  | "focus"
  | "tags"
  | "emoji"
  | "department"
  | "type"
  | "channels"
  | "workspace"
  | "setupComplete"
  | "canDispatch"
> & {
  slug: string;
  optaleScope: AgentDefinition["scope"];
  optaleMemoryNamespace: string;
  optaleLabels: string[];
  optaleHarness: AgentHarnessPersonaMetadata;
};

export interface AgentHarnessPersonaMetadata {
  generator: typeof OPTALE_AGENT_HARNESS_PERSONA_GENERATOR;
  manifestId: string;
  manifestSchemaVersion: AgentDefinitionManifest["schemaVersion"];
  definitionId: string;
  definitionSchemaVersion: AgentDefinition["schemaVersion"];
  projectedAt: string;
  nativeOptaleCommand: {
    status: AgentDefinition["runtimeProjections"]["nativeOptaleCommand"]["status"];
    agentSlug: string;
    personaSlug?: string;
    projectionStrategy: AgentDefinition["runtimeProjections"]["nativeOptaleCommand"]["projectionStrategy"];
  };
  legacyLibreChatBridge: {
    status: AgentDefinition["runtimeProjections"]["legacyLibreChatBridge"]["status"];
    agentId: string;
  };
}

export interface ProjectedAgentPersonaDocument {
  definitionId: string;
  slug: string;
  frontmatter: PersonaFrontmatter;
  body: string;
}

export type AgentPersonaProjectionAction = "create" | "overwrite" | "skip";

export interface AgentPersonaProjectionPlanEntry {
  definitionId: string;
  slug: string;
  targetPath: string;
  exists: boolean;
  action: AgentPersonaProjectionAction;
  reason: string;
  document: ProjectedAgentPersonaDocument;
}

export interface ProjectAgentManifestPersonasOptions {
  dryRun?: boolean;
  overwrite?: boolean;
  targetAgentsDir?: string;
  projectedAt?: string;
  agentIds?: string[];
}

export interface AgentPersonaProjectionResult {
  dryRun: boolean;
  overwrite: boolean;
  targetAgentsDir: string;
  entries: AgentPersonaProjectionPlanEntry[];
  writtenCount: number;
  skippedCount: number;
}

const ADAPTER_TYPE_BY_PROVIDER_ID: Record<string, string> = {
  "claude-code": "claude_local",
  "codex-cli": "codex_local",
  openrouter: "openrouter_api",
};

const ICON_TEXT_BY_ROLE: Record<string, string> = {
  "Meta lead / boss": "M",
  "Research & Context": "R",
  "Codex / Engineering": "C",
  "Claude Code / Ops": "O",
  "QA & Review": "Q",
  "Memory & ORM": "D",
  "Browser & Outreach": "B",
  "Paperclip Fleet": "P",
  "Matrix Comms": "X",
};

function adapterConfigFor(agent: AgentDefinition): Record<string, unknown> {
  const parameters = agent.provider.modelParameters || {};
  return Object.fromEntries(
    Object.entries({
      model: agent.provider.modelAlias || agent.provider.model,
      effort: parameters.reasoningEffort,
      reasoningEffort: parameters.reasoningEffort,
      temperature: parameters.temperature,
    }).filter(([, value]) => value !== undefined && value !== "")
  );
}

function stripUndefined<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map(stripUndefined) as T;
  }
  if (!value || typeof value !== "object") {
    return value;
  }
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([, entry]) => entry !== undefined)
      .map(([key, entry]) => [key, stripUndefined(entry)])
  ) as T;
}

function roleType(agent: AgentDefinition): AgentPersona["type"] {
  return agent.handoffs.length > 0 ? "lead" : "specialist";
}

function personaSlugFor(agent: AgentDefinition): string {
  return (
    agent.runtimeProjections.nativeOptaleCommand.personaSlug ||
    agent.runtimeProjections.nativeOptaleCommand.agentSlug ||
    agent.id
  );
}

function targetPathFor(targetAgentsDir: string, slug: string): string {
  return path.join(targetAgentsDir, slug, "persona.md");
}

function renderList(items: string[]): string {
  if (items.length === 0) return "- None";
  return items.map((item) => `- ${item}`).join("\n");
}

function renderMcpPolicy(agent: AgentDefinition): string {
  const servers = agent.mcp.servers.map((server) => {
    const name = server.legacyServerName
      ? `${server.serverId} (${server.legacyServerName})`
      : server.serverId;
    const permissions = server.permissions.join(", ");
    const groups = server.toolGroups.join(", ");
    return `${name}: ${permissions}; groups: ${groups}`;
  });

  return [
    "## MCP Policy",
    "",
    `Default decision: ${agent.mcp.defaultDecision}`,
    "",
    "Allowed server rules:",
    renderList(servers),
    "",
    "Restrictions:",
    renderList(agent.mcp.restrictions),
  ].join("\n");
}

function renderHandoffs(agent: AgentDefinition): string {
  if (agent.handoffs.length === 0) {
    return [
      "## Handoffs",
      "",
      "- None. Receive delegated work from the Optale meta lead unless a future manifest adds outbound edges.",
    ].join("\n");
  }

  return [
    "## Handoffs",
    "",
    ...agent.handoffs.map((edge) =>
      [
        `- ${edge.to}: ${edge.description}`,
        `  Prompt: ${edge.prompt}`,
      ].join("\n")
    ),
  ].join("\n");
}

function renderSchedules(agent: AgentDefinition): string {
  return [
    "## Schedules And Triggers",
    "",
    ...agent.schedules.map((schedule) => {
      const status = schedule.enabled ? "enabled" : "disabled";
      const cron = schedule.cron ? `; cron: ${schedule.cron}` : "";
      return `- ${schedule.id}: ${schedule.type}, ${status}${cron}. ${schedule.description}`;
    }),
  ].join("\n");
}

function renderApprovalPolicy(agent: AgentDefinition): string {
  return [
    "## Approval Policy",
    "",
    `Mode: ${agent.approvalPolicy.mode}`,
    "",
    "Required for:",
    renderList(agent.approvalPolicy.requiredFor),
    ...(agent.approvalPolicy.notes
      ? ["", `Notes: ${agent.approvalPolicy.notes}`]
      : []),
  ].join("\n");
}

function renderProjectionTrace(
  manifest: AgentDefinitionManifest,
  agent: AgentDefinition
): string {
  const native = agent.runtimeProjections.nativeOptaleCommand;
  const legacy = agent.runtimeProjections.legacyLibreChatBridge;
  return [
    "## Harness Projection",
    "",
    `Manifest: ${manifest.id} v${manifest.schemaVersion}`,
    `Definition: ${agent.id} v${agent.schemaVersion}`,
    `Memory namespace: ${agent.memoryNamespace}`,
    `Native persona slug: ${native.personaSlug || native.agentSlug}`,
    `Legacy LibreChat bridge agent: ${legacy.agentId}`,
  ].join("\n");
}

export function mapAgentDefinitionToPersona(
  manifest: AgentDefinitionManifest,
  agent: AgentDefinition,
  options: { projectedAt?: string } = {}
): ProjectedAgentPersonaDocument {
  const slug = personaSlugFor(agent);
  const projectedAt = options.projectedAt || new Date().toISOString();
  const adapterConfig = adapterConfigFor(agent);
  const frontmatter = stripUndefined<PersonaFrontmatter>({
    name: agent.name,
    slug,
    role: agent.description || agent.role,
    provider: agent.provider.providerId,
    adapterType: ADAPTER_TYPE_BY_PROVIDER_ID[agent.provider.providerId],
    adapterConfig,
    heartbeat: "0 8 * * *",
    budget: 100,
    active: false,
    workdir: "/data",
    focus: [agent.role, agent.description],
    tags: ["optale", "agent-harness", "meta"],
    emoji: ICON_TEXT_BY_ROLE[agent.role] || "A",
    department: "optale-command",
    type: roleType(agent),
    channels: ["optale-command"],
    workspace: `/optale-command/${slug}`,
    setupComplete: true,
    canDispatch: agent.handoffs.length > 0 ? true : undefined,
    optaleScope: agent.scope,
    optaleMemoryNamespace: agent.memoryNamespace,
    optaleLabels: ["agent-harness", manifest.id, agent.id],
    optaleHarness: {
      generator: OPTALE_AGENT_HARNESS_PERSONA_GENERATOR,
      manifestId: manifest.id,
      manifestSchemaVersion: manifest.schemaVersion,
      definitionId: agent.id,
      definitionSchemaVersion: agent.schemaVersion,
      projectedAt,
      nativeOptaleCommand: {
        status: agent.runtimeProjections.nativeOptaleCommand.status,
        agentSlug: agent.runtimeProjections.nativeOptaleCommand.agentSlug,
        personaSlug: agent.runtimeProjections.nativeOptaleCommand.personaSlug,
        projectionStrategy:
          agent.runtimeProjections.nativeOptaleCommand.projectionStrategy,
      },
      legacyLibreChatBridge: {
        status: agent.runtimeProjections.legacyLibreChatBridge.status,
        agentId: agent.runtimeProjections.legacyLibreChatBridge.agentId,
      },
    },
  });

  return {
    definitionId: agent.id,
    slug,
    frontmatter,
    body: [
      agent.instructions,
      "",
      renderMcpPolicy(agent),
      "",
      renderHandoffs(agent),
      "",
      renderSchedules(agent),
      "",
      renderApprovalPolicy(agent),
      "",
      renderProjectionTrace(manifest, agent),
    ].join("\n"),
  };
}

export function renderProjectedPersonaMarkdown(
  document: ProjectedAgentPersonaDocument
): string {
  return matter.stringify(document.body, document.frontmatter);
}

export function defaultAgentHarnessPersonaTargetDir(): string {
  return path.join(DATA_DIR, ".agents");
}

export async function projectAgentManifestPersonas(
  manifest: AgentDefinitionManifest,
  options: ProjectAgentManifestPersonasOptions = {}
): Promise<AgentPersonaProjectionResult> {
  const validation = validateAgentManifest(manifest);
  if (!validation.ok) {
    throw new Error(
      `Invalid AgentDefinition manifest:\n${validation.issues
        .map((issue) => `- ${issue.path}: ${issue.message}`)
        .join("\n")}`
    );
  }

  const dryRun = options.dryRun !== false;
  const overwrite = options.overwrite === true;
  const targetAgentsDir = path.resolve(
    options.targetAgentsDir || defaultAgentHarnessPersonaTargetDir()
  );
  const agentIdFilter = options.agentIds ? new Set(options.agentIds) : null;
  const agents = agentIdFilter
    ? manifest.agents.filter((agent) => agentIdFilter.has(agent.id))
    : manifest.agents;

  const entries: AgentPersonaProjectionPlanEntry[] = [];
  let writtenCount = 0;
  let skippedCount = 0;

  for (const agent of agents) {
    const document = mapAgentDefinitionToPersona(manifest, agent, {
      projectedAt: options.projectedAt,
    });
    const targetPath = targetPathFor(targetAgentsDir, document.slug);
    const exists = await fileExists(targetPath);
    const action: AgentPersonaProjectionAction = exists
      ? overwrite
        ? "overwrite"
        : "skip"
      : "create";
    const reason = exists
      ? overwrite
        ? "existing persona will be overwritten because overwrite is enabled"
        : "existing persona preserved; pass overwrite to replace it"
      : "persona does not exist";

    if (action === "skip") skippedCount += 1;

    if (!dryRun && action !== "skip") {
      await ensureDirectory(path.dirname(targetPath));
      await writeFileContent(targetPath, renderProjectedPersonaMarkdown(document));
      writtenCount += 1;
    }

    entries.push({
      definitionId: agent.id,
      slug: document.slug,
      targetPath,
      exists,
      action,
      reason,
      document,
    });
  }

  return {
    dryRun,
    overwrite,
    targetAgentsDir,
    entries,
    writtenCount,
    skippedCount,
  };
}
