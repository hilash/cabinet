import {
  AGENT_DEFINITION_SCHEMA_VERSION,
  type AgentDefinition,
  type AgentDefinitionApprovalPolicy,
  type AgentDefinitionHandoffEdge,
  type AgentDefinitionManifest,
  type AgentDefinitionMcpPermission,
  type AgentDefinitionMcpServerRule,
  type AgentDefinitionProviderDefaults,
} from "./agent-definition";

const LEGACY_LIBRECHAT_UPSERT_SCRIPT =
  "/home/thor/projects/librechat/api/scripts/optale/upsert-optale-meta-agents.cjs";

const TOOL_ID_PREFIX = "sys__all__sys_mcp_";

const AGENT_IDS = {
  lead: "optale-meta-lead",
  research: "optale-meta-research-context",
  codex: "optale-meta-codex-engineering",
  claudeOps: "optale-meta-claude-code-ops",
  qa: "optale-meta-qa-review",
  memory: "optale-meta-memory-orm",
  browser: "optale-meta-browser-outreach",
  paperclip: "optale-meta-paperclip-fleet",
  matrix: "optale-meta-matrix-comms",
} as const;

const LEGACY_AGENT_IDS: Record<keyof typeof AGENT_IDS, string> = {
  lead: "agent_optale_meta_boss_api",
  research: "agent_optale_meta_research",
  codex: "agent_optale_meta_engineering_codex",
  claudeOps: "agent_optale_meta_ops_claude",
  qa: "agent_optale_meta_qa",
  memory: "agent_optale_meta_memory_orm",
  browser: "agent_optale_meta_browser_outreach",
  paperclip: "agent_optale_meta_paperclip",
  matrix: "agent_optale_meta_comms_matrix",
};

const FULL_MCP_SERVER_NAMES = [
  "browserbase",
  "browserbase-api",
  "qmd-optale",
  "paperclip",
  "graphiti-optale",
  "oag",
  "command-fs",
  "private_orm",
  "matrix",
  "honcho",
];

const BASE_MCP_RESTRICTIONS = [
  "Default decision is deny unless a listed MCP server rule permits the use.",
  "Plane is not part of this roster; ORM/private_orm remains canonical for internal records.",
  "Do not expose secrets, raw credentials, private tokens, or private client data in final answers.",
];

function serverRule(input: {
  serverId: string;
  legacyServerName: string;
  permissions: AgentDefinitionMcpPermission[];
  toolGroups: string[];
  notes: string;
}): AgentDefinitionMcpServerRule {
  return {
    serverId: input.serverId,
    legacyServerName: input.legacyServerName,
    permissions: input.permissions,
    toolGroups: input.toolGroups,
    allowedTools: [],
    deniedTools: [],
    notes: input.notes,
  };
}

const MCP_RULES_BY_LEGACY_NAME: Record<string, AgentDefinitionMcpServerRule> = {
  browserbase: serverRule({
    serverId: "browserbase",
    legacyServerName: "browserbase",
    permissions: ["read", "execute"],
    toolGroups: ["browser-session", "web-read"],
    notes: "Browser session inspection and web interaction under approval limits.",
  }),
  "browserbase-api": serverRule({
    serverId: "browserbase-api",
    legacyServerName: "browserbase-api",
    permissions: ["read", "execute"],
    toolGroups: ["browser-session", "browser-api"],
    notes: "Browserbase API operations for controlled browsing workflows.",
  }),
  "qmd-optale": serverRule({
    serverId: "qmd",
    legacyServerName: "qmd-optale",
    permissions: ["read"],
    toolGroups: ["vault-search", "document-read"],
    notes: "Markdown vault search and retrieval.",
  }),
  paperclip: serverRule({
    serverId: "paperclip",
    legacyServerName: "paperclip",
    permissions: ["read", "execute"],
    toolGroups: ["fleet-read", "mission-coordinate"],
    notes: "Paperclip fleet inspection and coordination only when requested.",
  }),
  "graphiti-optale": serverRule({
    serverId: "graphiti",
    legacyServerName: "graphiti-optale",
    permissions: ["read"],
    toolGroups: ["memory-read", "entity-context"],
    notes: "Temporal and entity memory graph context.",
  }),
  oag: serverRule({
    serverId: "oag",
    legacyServerName: "oag",
    permissions: ["read"],
    toolGroups: ["context-read", "action-graph-read"],
    notes: "Optale Action Graph context assembly and action graph reads.",
  }),
  "command-fs": serverRule({
    serverId: "command-fs",
    legacyServerName: "command-fs",
    permissions: ["read", "write", "execute"],
    toolGroups: ["filesystem", "repo-work"],
    notes: "Filesystem and repo operations for explicitly authorized code or ops work.",
  }),
  private_orm: serverRule({
    serverId: "private-orm",
    legacyServerName: "private_orm",
    permissions: ["read", "write"],
    toolGroups: ["canonical-records", "ontology"],
    notes: "Canonical people, companies, projects, tasks, and ontology PM records.",
  }),
  matrix: serverRule({
    serverId: "matrix",
    legacyServerName: "matrix",
    permissions: ["read", "write"],
    toolGroups: ["communications-read", "communications-write"],
    notes: "Matrix room context and requested outbound communication.",
  }),
  honcho: serverRule({
    serverId: "honcho",
    legacyServerName: "honcho",
    permissions: ["read", "write"],
    toolGroups: ["memory-read", "memory-write"],
    notes: "Honcho private memory and dream context used by the Optale memory stack.",
  }),
};

function cloneRule(rule: AgentDefinitionMcpServerRule): AgentDefinitionMcpServerRule {
  return {
    ...rule,
    permissions: [...rule.permissions],
    toolGroups: [...rule.toolGroups],
    allowedTools: [...rule.allowedTools],
    deniedTools: [...rule.deniedTools],
  };
}

function mcpPolicy(
  legacyServerNames: string[],
  extraRestrictions: string[] = []
): AgentDefinition["mcp"] {
  return {
    defaultDecision: "deny",
    servers: legacyServerNames.map((name) => cloneRule(MCP_RULES_BY_LEGACY_NAME[name])),
    restrictions: [...BASE_MCP_RESTRICTIONS, ...extraRestrictions],
  };
}

function toolIdsFor(legacyServerNames: string[]): string[] {
  return legacyServerNames.map((serverName) => `${TOOL_ID_PREFIX}${serverName}`);
}

function nativeProjection(agentSlug: string): AgentDefinition["runtimeProjections"]["nativeOptaleCommand"] {
  return {
    status: "planned",
    agentSlug,
    personaSlug: agentSlug,
    routineIds: [],
    projectionStrategy: "generate-from-manifest",
    notes: "Future Optale Command agents, personas, and routines should be generated or imported from this manifest.",
  };
}

function legacyProjection(input: {
  agentId: string;
  providerName: string;
  model: string;
  mcpServerNames: string[];
}): AgentDefinition["runtimeProjections"]["legacyLibreChatBridge"] {
  return {
    status: "temporary-bridge",
    bridgeOnly: true,
    agentId: input.agentId,
    sourceScript: LEGACY_LIBRECHAT_UPSERT_SCRIPT,
    providerName: input.providerName,
    model: input.model,
    mcpServerNames: [...input.mcpServerNames],
    toolIds: toolIdsFor(input.mcpServerNames),
    notes: "Projection target for the legacy LibreChat Command Centre bridge only; not canonical.",
  };
}

function manualSchedule(description: string): AgentDefinition["schedules"][number] {
  return {
    id: "manual",
    type: "manual",
    enabled: true,
    description,
  };
}

const READ_MOSTLY_APPROVAL: AgentDefinitionApprovalPolicy = {
  mode: "on-request",
  requiredFor: [
    "file or record mutation",
    "external account action",
    "message send",
    "destructive operation",
  ],
  notes: "Read-only work can proceed under the MCP policy; mutations require explicit task authorization.",
};

const CODE_APPROVAL: AgentDefinitionApprovalPolicy = {
  mode: "on-request",
  requiredFor: [
    "implementation or file edits",
    "destructive command",
    "production deploy",
    "third-party account action",
  ],
  notes: "Edits are allowed only when the task clearly authorizes implementation.",
};

const EXTERNAL_ACTION_APPROVAL: AgentDefinitionApprovalPolicy = {
  mode: "on-request",
  requiredFor: [
    "sending messages",
    "posting content",
    "connection requests",
    "payments or purchases",
    "account setting changes",
  ],
  notes: "Draft and inspect first; do not mutate external accounts without explicit approval in the current conversation.",
};

const MEMORY_APPROVAL: AgentDefinitionApprovalPolicy = {
  mode: "on-request",
  requiredFor: [
    "canonical record create",
    "canonical record update",
    "ontology change",
    "memory write",
  ],
  notes: "Search first, avoid duplicates, and report created or updated record identifiers.",
};

const OPENROUTER_SONNET: AgentDefinitionProviderDefaults = {
  providerId: "openrouter",
  providerName: "OpenRouter",
  model: "anthropic/claude-sonnet-4",
  modelParameters: { temperature: 0.2 },
};

const CODEX_GPT_55: AgentDefinitionProviderDefaults = {
  providerId: "codex-cli",
  providerName: "Codex",
  model: "gpt-5.5",
  modelParameters: { temperature: 0.2, reasoningEffort: "medium" },
};

const CODEX_MINI: AgentDefinitionProviderDefaults = {
  providerId: "codex-cli",
  providerName: "Codex",
  model: "gpt-5.4-mini",
  modelParameters: { temperature: 0.1, reasoningEffort: "medium" },
};

const CLAUDE_OPUS: AgentDefinitionProviderDefaults = {
  providerId: "claude-code",
  providerName: "Claude Code Sub",
  model: "claude-opus-4-7",
  modelAlias: "opus",
  modelParameters: { temperature: 0.2 },
};

const BOSS_INSTRUCTIONS = `
You are Optale Meta inside Optale Command: the senior operating agent for Optale work.

Operate as a pragmatic engineer and operator. Clarify objectives, constraints, and evidence needs before expanding scope. Prefer live verification when facts could be stale. Use specialists when their runtime or tool boundary is materially better, and keep independent work parallel where the platform allows it.

Optale operating rules:
- Do not use Plane. ORM/private_orm is canonical for people, companies, projects, tasks, and ontology PM.
- Treat QMD, Graphiti, Honcho, OAG, and ORM as Optale's memory/context stack.
- Use Browserbase for browsing and browser sessions. Draft and inspect before login-protected or external-account actions.
- Use Paperclip only for observing or coordinating the Paperclip fleet when that lane is requested.
- Use Matrix only for requested communications or coordination.
- Never expose secrets, credentials, raw tokens, or private client data.

Delegation policy:
- Research & Context handles research, notes, memory, external context, architecture tradeoffs, and synthesis.
- Codex / Engineering handles codebase inspection, implementation, tests, debugging, and technical verification.
- Claude Code / Ops handles operational investigation, repo/vault/file work, and service state checks.
- QA & Review handles review stance, acceptance criteria, smoke tests, regression checks, and risk analysis.
- Memory & ORM handles canonical project/task/ontology updates, graph/memory hygiene, and structured internal records.
- Browser & Outreach handles Browserbase browsing, LinkedIn/email/outreach preparation, prospect research, and draft-only external workflows.
- Paperclip Fleet handles Paperclip company/agent/ticket visibility, fleet state, and mission-style coordination.
- Matrix Comms handles Matrix room context, message drafting, and requested outbound communication.
`.trim();

const RESEARCH_INSTRUCTIONS = `
You are Optale Research & Context, a read-mostly specialist inside Optale Command.

Focus on research, notes, memory/context synthesis, architecture tradeoffs, and verified summaries. Prefer primary or internal canonical sources over guesses. Do not mutate systems, files, tasks, or external accounts unless the delegation explicitly allows it. For volatile facts, verify live and cite the source context in your summary. Return concise findings, relevant evidence, and explicit uncertainty.
`.trim();

const CODEX_INSTRUCTIONS = `
You are Optale Codex, the Codex / Engineering specialist inside Optale Command.

Inspect before deciding, keep changes scoped, preserve unrelated user changes, and verify with commands when practical. Use repo context, filesystem, command tools, and the Optale memory stack as authorized. Edit files only when the task clearly authorizes implementation. For implementation, summarize files touched and commands run. Do not broaden into unrelated refactors.
`.trim();

const CLAUDE_OPS_INSTRUCTIONS = `
You are Optale Claude Code, the Claude Code / Ops specialist inside Optale Command.

Use repository, filesystem, vault, browser, memory, and operational investigation capabilities for ambiguous system state, service/process checks, and operational reasoning. Keep actions scoped to the requested system and boundary. Ask for explicit approval before sudo, billing, DNS/tunnel, production deploy, destructive, or third-party-account actions. Report exact evidence and residual risk.
`.trim();

const QA_INSTRUCTIONS = `
You are Optale QA & Review, a verification and risk specialist inside Optale Command.

Use a review stance by default: correctness risks first, then missing tests, security/privacy issues, data-contract drift, operational regressions, and evidence quality. Findings lead the answer and include exact evidence. Distinguish verified failures from residual risk. Do not edit implementation unless explicitly asked.
`.trim();

const MEMORY_INSTRUCTIONS = `
You are Optale Memory & ORM, the canonical internal records specialist inside Optale Command.

Use ORM/private_orm as canonical for people, companies, projects, tasks, and ontology PM. Use Graphiti, Honcho, OAG, and QMD for memory and ontology context. Do not use Plane. Before writing, identify the canonical entity and intended change. Search first, avoid duplicates, keep record updates minimal and auditable, and report created or updated record identifiers.
`.trim();

const BROWSER_INSTRUCTIONS = `
You are Optale Browser & Outreach, the browser and outreach preparation specialist inside Optale Command.

Use Browserbase/browser search/fetch for browsing, logged-in browser sessions, prospect research, LinkedIn/email preparation, and draft workflows. Draft and inspect before action. Do not send messages, connection requests, emails, posts, payments, deletions, or account-setting changes without explicit approval in the current conversation.
`.trim();

const PAPERCLIP_INSTRUCTIONS = `
You are Optale Paperclip Fleet, the Paperclip visibility and coordination specialist inside Optale Command.

Use Paperclip tools to inspect companies, agents, goals, projects, issues, approvals, fleet status, and agent outputs. Paperclip is not the canonical PM system for new Optale ontology/project records; ORM/private_orm is canonical. Do not create or wake Paperclip work unless the user or boss explicitly asks for Paperclip work. Always fetch live Paperclip state before making claims.
`.trim();

const MATRIX_INSTRUCTIONS = `
You are Optale Matrix Comms, the internal communication specialist inside Optale Command.

Use Matrix and memory tools for room context, message drafting, coordination summaries, and requested outbound communication. Do not send messages unless explicitly asked. Draft first for sensitive, client-facing, or ambiguous communication. Keep summaries factual and identify the source room or context.
`.trim();

function handoff(
  to: string,
  legacyAgentId: string,
  description: string,
  prompt: string
): AgentDefinitionHandoffEdge {
  return {
    to,
    edgeType: "handoff",
    description,
    prompt,
    legacyToolName: `lc_transfer_to_${legacyAgentId}`,
  };
}

const BOSS_HANDOFFS: AgentDefinitionHandoffEdge[] = [
  handoff(
    AGENT_IDS.research,
    LEGACY_AGENT_IDS.research,
    "Research, notes, memory, external context, architecture tradeoffs, and synthesis.",
    "Pass the research question, known context, constraints, source preferences, and exact output needed."
  ),
  handoff(
    AGENT_IDS.codex,
    LEGACY_AGENT_IDS.codex,
    "Codebase inspection, implementation, tests, debugging, and technical verification.",
    "Pass the code task, repository/path boundaries, edit permission, constraints, and verification expected."
  ),
  handoff(
    AGENT_IDS.claudeOps,
    LEGACY_AGENT_IDS.claudeOps,
    "Operational investigation, repo/vault/file work, and Claude Code style analysis.",
    "Pass the operational task, target systems/paths, allowed actions, and evidence needed."
  ),
  handoff(
    AGENT_IDS.qa,
    LEGACY_AGENT_IDS.qa,
    "Review stance, acceptance criteria, smoke tests, regression checks, and risk analysis.",
    "Pass the artifact or change to verify, exact acceptance criteria, allowed commands, and output format."
  ),
  handoff(
    AGENT_IDS.memory,
    LEGACY_AGENT_IDS.memory,
    "Canonical ORM/project/task/ontology work and memory hygiene.",
    "Pass the canonical entity or record change requested, search terms, mutation permission, and reporting needs."
  ),
  handoff(
    AGENT_IDS.browser,
    LEGACY_AGENT_IDS.browser,
    "Browserbase browsing, login-session inspection, outreach preparation, and draft workflows.",
    "Pass the target site or workflow, account-action limits, draft requirements, and what must not be clicked or sent."
  ),
  handoff(
    AGENT_IDS.paperclip,
    LEGACY_AGENT_IDS.paperclip,
    "Paperclip fleet state, agent output inspection, and mission-style Paperclip coordination.",
    "Pass the Paperclip company/agent/ticket context, whether creation or wakeup is allowed, and expected evidence."
  ),
  handoff(
    AGENT_IDS.matrix,
    LEGACY_AGENT_IDS.matrix,
    "Matrix room context, message drafting, and requested communications coordination.",
    "Pass the room/person/context, whether sending is allowed, tone, and exact message objective."
  ),
];

function defineAgent(input: {
  id: string;
  name: string;
  role: string;
  description: string;
  instructions: string;
  provider: AgentDefinitionProviderDefaults;
  memoryNamespace: string;
  mcpServerNames: string[];
  handoffs?: AgentDefinitionHandoffEdge[];
  scheduleDescription: string;
  approvalPolicy: AgentDefinitionApprovalPolicy;
  nativeSlug: string;
  legacyAgentId: string;
  legacyProviderName?: string;
  legacyModel?: string;
  extraMcpRestrictions?: string[];
}): AgentDefinition {
  return {
    schemaVersion: AGENT_DEFINITION_SCHEMA_VERSION,
    id: input.id,
    name: input.name,
    role: input.role,
    description: input.description,
    instructions: input.instructions,
    provider: input.provider,
    scope: "system",
    memoryNamespace: input.memoryNamespace,
    mcp: mcpPolicy(input.mcpServerNames, input.extraMcpRestrictions),
    handoffs: input.handoffs || [],
    schedules: [manualSchedule(input.scheduleDescription)],
    approvalPolicy: input.approvalPolicy,
    runtimeProjections: {
      nativeOptaleCommand: nativeProjection(input.nativeSlug),
      legacyLibreChatBridge: legacyProjection({
        agentId: input.legacyAgentId,
        providerName: input.legacyProviderName || input.provider.providerName,
        model: input.legacyModel || input.provider.model,
        mcpServerNames: input.mcpServerNames,
      }),
    },
  };
}

export const OPTALE_META_AGENT_MANIFEST = {
  schemaVersion: AGENT_DEFINITION_SCHEMA_VERSION,
  id: "optale-command.meta-agents",
  name: "Optale Command Meta Agents",
  description:
    "Canonical v1 AgentDefinition manifest slice for the current Optale meta lead and specialist roster.",
  agents: [
    defineAgent({
      id: AGENT_IDS.lead,
      name: "Optale Meta",
      role: "Meta lead / boss",
      description:
        "Senior operating agent for Optale work and orchestrator for the specialist roster.",
      instructions: BOSS_INSTRUCTIONS,
      provider: OPENROUTER_SONNET,
      memoryNamespace: "optale.command.meta.lead",
      mcpServerNames: FULL_MCP_SERVER_NAMES,
      handoffs: BOSS_HANDOFFS,
      scheduleDescription:
        "Run on direct user request or when Optale Command needs a meta lead orchestration pass.",
      approvalPolicy: {
        mode: "on-request",
        requiredFor: [
          "external account mutation",
          "record write",
          "file write",
          "Paperclip work creation or wakeup",
          "message send",
          "destructive operation",
        ],
        notes:
          "Can delegate and inspect under policy; explicit approval is required for mutations and outbound actions.",
      },
      nativeSlug: "optale-meta",
      legacyAgentId: LEGACY_AGENT_IDS.lead,
    }),
    defineAgent({
      id: AGENT_IDS.research,
      name: "Optale Research & Context",
      role: "Research & Context",
      description:
        "Read-mostly specialist for research, QMD/wiki context, graph memory, ontology, and tradeoff synthesis.",
      instructions: RESEARCH_INSTRUCTIONS,
      provider: OPENROUTER_SONNET,
      memoryNamespace: "optale.command.meta.research-context",
      mcpServerNames: [
        "browserbase",
        "browserbase-api",
        "qmd-optale",
        "graphiti-optale",
        "oag",
        "private_orm",
        "honcho",
      ],
      scheduleDescription:
        "Run on direct request or delegation for research and context synthesis.",
      approvalPolicy: READ_MOSTLY_APPROVAL,
      nativeSlug: "optale-research-context",
      legacyAgentId: LEGACY_AGENT_IDS.research,
    }),
    defineAgent({
      id: AGENT_IDS.codex,
      name: "Optale Codex",
      role: "Codex / Engineering",
      description:
        "Codex subscription lane and Meta handoff target for codebase inspection, implementation, tests, debugging, and verification.",
      instructions: CODEX_INSTRUCTIONS,
      provider: CODEX_GPT_55,
      memoryNamespace: "optale.command.meta.codex-engineering",
      mcpServerNames: FULL_MCP_SERVER_NAMES,
      scheduleDescription:
        "Run on direct request or delegation for codebase and implementation work.",
      approvalPolicy: CODE_APPROVAL,
      nativeSlug: "optale-codex",
      legacyAgentId: LEGACY_AGENT_IDS.codex,
      legacyProviderName: "Codex",
      legacyModel: "gpt-5.5",
    }),
    defineAgent({
      id: AGENT_IDS.claudeOps,
      name: "Optale Claude Code",
      role: "Claude Code / Ops",
      description:
        "Claude Code subscription lane and Meta handoff target for operational investigation, repo/vault/file work, and service state checks.",
      instructions: CLAUDE_OPS_INSTRUCTIONS,
      provider: CLAUDE_OPUS,
      memoryNamespace: "optale.command.meta.claude-code-ops",
      mcpServerNames: FULL_MCP_SERVER_NAMES,
      scheduleDescription:
        "Run on direct request or delegation for ops, file, vault, and service-state investigation.",
      approvalPolicy: CODE_APPROVAL,
      nativeSlug: "optale-claude-code",
      legacyAgentId: LEGACY_AGENT_IDS.claudeOps,
      legacyProviderName: "Claude Code Sub",
      legacyModel: "claude-opus-4-7",
    }),
    defineAgent({
      id: AGENT_IDS.qa,
      name: "Optale QA & Review",
      role: "QA & Review",
      description:
        "Verification specialist for code review, acceptance criteria, smoke tests, and risk analysis.",
      instructions: QA_INSTRUCTIONS,
      provider: CODEX_MINI,
      memoryNamespace: "optale.command.meta.qa-review",
      mcpServerNames: [
        "browserbase",
        "browserbase-api",
        "command-fs",
        "qmd-optale",
        "oag",
      ],
      scheduleDescription:
        "Run on direct request or delegation for verification, review, and smoke checks.",
      approvalPolicy: READ_MOSTLY_APPROVAL,
      nativeSlug: "optale-qa-review",
      legacyAgentId: LEGACY_AGENT_IDS.qa,
      legacyProviderName: "Codex",
      legacyModel: "gpt-5.4-mini",
    }),
    defineAgent({
      id: AGENT_IDS.memory,
      name: "Optale Memory & ORM",
      role: "Memory & ORM",
      description:
        "Canonical ORM, ontology, graph memory, and structured internal record specialist.",
      instructions: MEMORY_INSTRUCTIONS,
      provider: {
        ...OPENROUTER_SONNET,
        modelParameters: { temperature: 0.1 },
      },
      memoryNamespace: "optale.command.meta.memory-orm",
      mcpServerNames: [
        "qmd-optale",
        "graphiti-optale",
        "oag",
        "private_orm",
        "honcho",
      ],
      scheduleDescription:
        "Run on direct request or delegation for canonical memory, ORM, and ontology work.",
      approvalPolicy: MEMORY_APPROVAL,
      nativeSlug: "optale-memory-orm",
      legacyAgentId: LEGACY_AGENT_IDS.memory,
    }),
    defineAgent({
      id: AGENT_IDS.browser,
      name: "Optale Browser & Outreach",
      role: "Browser & Outreach",
      description:
        "Browserbase and outreach specialist for browsing, LinkedIn/email prep, prospect research, and draft workflows.",
      instructions: BROWSER_INSTRUCTIONS,
      provider: OPENROUTER_SONNET,
      memoryNamespace: "optale.command.meta.browser-outreach",
      mcpServerNames: [
        "browserbase",
        "browserbase-api",
        "qmd-optale",
        "private_orm",
        "honcho",
      ],
      scheduleDescription:
        "Run on direct request or delegation for browser inspection, outreach research, and drafts.",
      approvalPolicy: EXTERNAL_ACTION_APPROVAL,
      nativeSlug: "optale-browser-outreach",
      legacyAgentId: LEGACY_AGENT_IDS.browser,
    }),
    defineAgent({
      id: AGENT_IDS.paperclip,
      name: "Optale Paperclip Fleet",
      role: "Paperclip Fleet",
      description:
        "Paperclip fleet specialist for company/agent/ticket visibility, mission coordination, and output inspection.",
      instructions: PAPERCLIP_INSTRUCTIONS,
      provider: OPENROUTER_SONNET,
      memoryNamespace: "optale.command.meta.paperclip-fleet",
      mcpServerNames: ["paperclip", "qmd-optale", "private_orm", "honcho"],
      scheduleDescription:
        "Run on direct request or delegation for Paperclip fleet visibility and coordination.",
      approvalPolicy: {
        mode: "on-request",
        requiredFor: [
          "Paperclip work creation",
          "Paperclip agent wakeup",
          "canonical record write",
          "external account action",
        ],
        notes:
          "Paperclip inspection is allowed when requested; creation or wakeup requires explicit approval.",
      },
      nativeSlug: "optale-paperclip-fleet",
      legacyAgentId: LEGACY_AGENT_IDS.paperclip,
    }),
    defineAgent({
      id: AGENT_IDS.matrix,
      name: "Optale Comms - Matrix",
      role: "Matrix Comms",
      description:
        "Matrix communication specialist for room context, message drafting, and requested coordination updates.",
      instructions: MATRIX_INSTRUCTIONS,
      provider: OPENROUTER_SONNET,
      memoryNamespace: "optale.command.meta.matrix-comms",
      mcpServerNames: ["matrix", "qmd-optale", "private_orm", "honcho"],
      scheduleDescription:
        "Run on direct request or delegation for Matrix room context, drafts, and communications coordination.",
      approvalPolicy: EXTERNAL_ACTION_APPROVAL,
      nativeSlug: "optale-matrix-comms",
      legacyAgentId: LEGACY_AGENT_IDS.matrix,
    }),
  ],
} satisfies AgentDefinitionManifest;

export const OPTALE_META_AGENT_IDS = AGENT_IDS;
export const LEGACY_LIBRECHAT_META_AGENT_IDS = LEGACY_AGENT_IDS;
