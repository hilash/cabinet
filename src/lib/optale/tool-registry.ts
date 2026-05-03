type ProductToolCategory = "memory" | "search" | "action" | "analysis";
type ProductToolStatus = "active" | "deprecated";

export interface OptaleProductToolDefinition {
  id: string;
  productName: string;
  productLabel: string;
  description: string;
  category: ProductToolCategory;
  executionMode: "mcp";
  executionConfig: {
    mcpServer: string;
    mcpTool: string;
    internalTarget: string;
  };
  tags: string[];
  status: ProductToolStatus;
}

export interface OptaleResolvedToolName {
  requestedToolName: string;
  internalToolName: string;
  internalServerId: string;
  productToolName?: string;
  productToolLabel?: string;
  productDescription?: string;
}

const INTERNAL_TOOL_SEPARATOR = "__";

const PRODUCT_TOOL_DEFINITIONS: OptaleProductToolDefinition[] = [
  {
    id: "sense_search_knowledge",
    productName: "sense_search_knowledge",
    productLabel: "Docs / Knowledge Search",
    description:
      "Search Optale knowledge sources for relevant notes, docs, and source artifacts.",
    category: "search",
    executionMode: "mcp",
    executionConfig: {
      mcpServer: "qmd",
      mcpTool: "query",
      internalTarget: "qmd__query",
    },
    tags: ["sense-memory", "knowledge", "docs", "read-only"],
    status: "active",
  },
];

function trimToolName(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function internalServerIdForToolName(toolName: string): string {
  const separator = toolName.indexOf(INTERNAL_TOOL_SEPARATOR);
  return separator > 0 ? toolName.slice(0, separator) : "optale-agents";
}

function copyDefinition(
  definition: OptaleProductToolDefinition,
): OptaleProductToolDefinition {
  return {
    ...definition,
    executionConfig: { ...definition.executionConfig },
    tags: [...definition.tags],
  };
}

export function listOptaleProductTools(): OptaleProductToolDefinition[] {
  return PRODUCT_TOOL_DEFINITIONS.map(copyDefinition);
}

export function findOptaleProductTool(
  name: string,
): OptaleProductToolDefinition | undefined {
  const normalized = trimToolName(name);
  if (!normalized) return undefined;
  return PRODUCT_TOOL_DEFINITIONS.find(
    (definition) =>
      definition.productName === normalized ||
      definition.executionConfig.internalTarget === normalized,
  );
}

export function resolveOptaleToolName(name: string): OptaleResolvedToolName {
  const requestedToolName = trimToolName(name) || "unknown";
  const productTool = findOptaleProductTool(requestedToolName);

  if (productTool) {
    return {
      requestedToolName,
      internalToolName: productTool.executionConfig.internalTarget,
      internalServerId: productTool.executionConfig.mcpServer,
      productToolName: productTool.productName,
      productToolLabel: productTool.productLabel,
      productDescription: productTool.description,
    };
  }

  return {
    requestedToolName,
    internalToolName: requestedToolName,
    internalServerId: internalServerIdForToolName(requestedToolName),
  };
}

export function optaleToolNameMatches(
  candidateToolName: string,
  allowedOrDeniedToolName: string,
): boolean {
  const candidate = resolveOptaleToolName(candidateToolName);
  const configured = trimToolName(allowedOrDeniedToolName);
  if (!configured) return false;

  return (
    configured === candidate.internalToolName ||
    configured === candidate.productToolName
  );
}

export function optaleToolNameAllowedByList(
  candidateToolName: string,
  configuredToolNames: string[] | undefined,
): boolean {
  if (!configuredToolNames || configuredToolNames.length === 0) return true;
  return configuredToolNames.some((configuredToolName) =>
    optaleToolNameMatches(candidateToolName, configuredToolName),
  );
}

export function toProductFacingTool<
  T extends { name: string; description: string },
>(tool: T): T {
  const resolved = resolveOptaleToolName(tool.name);
  if (!resolved.productToolName) return tool;

  return {
    ...tool,
    name: resolved.productToolName,
    description: resolved.productDescription || tool.description,
  };
}

export function productFacingToolName(name: string): string | null {
  const normalized = trimToolName(name);
  if (!normalized) return null;
  const resolved = resolveOptaleToolName(normalized);
  if (resolved.productToolName) return resolved.productToolName;
  if (normalized.includes(INTERNAL_TOOL_SEPARATOR)) return null;
  return normalized;
}

export function isProductFacingToolName(name: string): boolean {
  const normalized = trimToolName(name);
  return Boolean(
    normalized && productFacingToolName(normalized) === normalized,
  );
}

export function toProductFacingToolOrNull<
  T extends { name: string; description: string },
>(tool: T): T | null {
  const productName = productFacingToolName(tool.name);
  if (!productName) return null;
  if (productName === tool.name) return tool;

  return {
    ...tool,
    name: productName,
    description:
      resolveOptaleToolName(tool.name).productDescription || tool.description,
  };
}
