export type OptaleAgentScope = "company" | "personal" | "system";

export type OptaleProductIdentity = {
  id: "optale-command";
  name: string;
  shortName: string;
  description: string;
  license: "MIT";
};

export const OPTALE_PRODUCT: OptaleProductIdentity = {
  id: "optale-command",
  name: process.env.NEXT_PUBLIC_OPTALE_PRODUCT_NAME || "Optale Command",
  shortName: process.env.NEXT_PUBLIC_OPTALE_PRODUCT_SHORT_NAME || "Command",
  description:
    process.env.NEXT_PUBLIC_OPTALE_PRODUCT_DESCRIPTION ||
    "Desktop command surface for Optale knowledge, agents, actions, memory, and governance.",
  license: "MIT",
};

export const OPTALE_SCOPE_LABELS: Record<OptaleAgentScope, string> = {
  company: "Company",
  personal: "Personal",
  system: "System",
};
