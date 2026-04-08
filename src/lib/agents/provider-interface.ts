export interface ProviderAuthMethod {
  id: string;
  name: string;
  type: "agent" | "env_var" | "terminal";
}

export interface ProviderAcpCapabilities {
  loadSession?: boolean;
  listSessions?: boolean;
  promptEmbeddedContext?: boolean;
  promptImage?: boolean;
  readTextFile?: boolean;
  writeTextFile?: boolean;
  terminal?: boolean;
}

export interface ProviderStatus {
  available: boolean;
  authenticated: boolean;
  version?: string;
  error?: string;
  runtime: "acp";
  adapterKind: "native" | "adapter";
  authMethods?: ProviderAuthMethod[];
  acpCapabilities?: ProviderAcpCapabilities;
}

export interface AgentProvider {
  id: string;
  name: string;
  type: "cli";
  runtime: "acp";
  adapterKind: "native" | "adapter";
  icon: string;
  installMessage?: string;
  installSteps?: Array<{ title: string; detail: string; link?: { label: string; url: string } }>;
  command: string;
  commandCandidates?: string[];
  commandArgs?: string[];
  isAvailable(): Promise<boolean>;
  healthCheck(): Promise<ProviderStatus>;
}

export interface ProviderRegistry {
  providers: Map<string, AgentProvider>;
  defaultProvider: string;

  register(provider: AgentProvider): void;
  get(id: string): AgentProvider | undefined;
  getDefault(): AgentProvider | undefined;
  listAll(): AgentProvider[];
  listAvailable(): Promise<AgentProvider[]>;
}
