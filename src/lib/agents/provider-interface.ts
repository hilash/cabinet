export interface ProviderStatus {
  available: boolean;
  authenticated: boolean;
  version?: string;
  error?: string;
}

export interface AgentProvider {
  id: string;
  name: string;
  type: "cli" | "api";
  icon: string;

  // CLI providers
  command?: string;
  buildArgs?(prompt: string, workdir: string): string[];

  // API providers
  apiKeyEnvVar?: string;
  runPrompt?(prompt: string, context: string): Promise<string>;

  // Common
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
