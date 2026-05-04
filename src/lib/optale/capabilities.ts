import { getOptaleRuntimeMode, type OptaleRuntimeMode } from "./runtime-mode";

export type OptaleCapability =
  | "terminal.open"
  | "terminal.runtime"
  | "providers.configure"
  | "secrets.manage"
  | "diagnostics.raw"
  | "company_brain.view"
  | "agents.mutate"
  | "mcp.manage"
  | "updates.manage"
  | "memory.cross_tenant";

export type OptaleMemoryLane =
  | "operator_company_brain"
  | "partner_scoped_memory";

export type OptaleCapabilityProfile = {
  mode: OptaleRuntimeMode;
  label: string;
  description: string;
  memoryLane: OptaleMemoryLane;
  capabilities: Record<OptaleCapability, boolean>;
};

type CapabilityEnv = Partial<Record<string, string | undefined>>;

const OPERATOR_CAPABILITIES: Record<OptaleCapability, boolean> = {
  "terminal.open": true,
  "terminal.runtime": true,
  "providers.configure": true,
  "secrets.manage": true,
  "diagnostics.raw": true,
  "company_brain.view": true,
  "agents.mutate": true,
  "mcp.manage": true,
  "updates.manage": true,
  "memory.cross_tenant": true,
};

const RESTRICTED_CUSTOMER_CAPABILITIES: Record<OptaleCapability, boolean> = {
  "terminal.open": false,
  "terminal.runtime": false,
  "providers.configure": false,
  "secrets.manage": false,
  "diagnostics.raw": false,
  "company_brain.view": false,
  "agents.mutate": false,
  "mcp.manage": false,
  "updates.manage": false,
  "memory.cross_tenant": false,
};

const PROFILES: Record<OptaleRuntimeMode, OptaleCapabilityProfile> = {
  operator: {
    mode: "operator",
    label: "Optale operator",
    description:
      "Full Optale Command desktop profile for trusted Optale operators.",
    memoryLane: "operator_company_brain",
    capabilities: OPERATOR_CAPABILITIES,
  },
  restricted_customer: {
    mode: "restricted_customer",
    label: "Partner workspace",
    description:
      "Scoped partner/customer profile with personal and tenant memory only.",
    memoryLane: "partner_scoped_memory",
    capabilities: RESTRICTED_CUSTOMER_CAPABILITIES,
  },
};

export function getOptaleCapabilityProfile(
  env: CapabilityEnv = process.env,
): OptaleCapabilityProfile {
  return PROFILES[getOptaleRuntimeMode(env)];
}

export function hasOptaleCapability(
  capability: OptaleCapability,
  env: CapabilityEnv = process.env,
): boolean {
  return getOptaleCapabilityProfile(env).capabilities[capability] === true;
}

export function optaleCapabilityModeLabel(
  env: CapabilityEnv = process.env,
): string {
  return getOptaleCapabilityProfile(env).label;
}
