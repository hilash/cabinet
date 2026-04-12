// Types for the Cabinet Agents system

export interface GoalMetric {
  metric: string;       // e.g., "reddit_replies"
  target: number;       // e.g., 50
  current: number;      // e.g., 32
  unit: string;         // e.g., "replies/week"
  period?: string;      // "daily" | "weekly" | "monthly" — default "weekly"
  floor?: number;       // Minimum acceptable — below this triggers alert
  stretch?: number;     // Stretch goal
}


export interface SlackMessage {
  id: string;
  channel: string;
  agent: string;        // agent slug or "human"
  emoji?: string;       // agent emoji for display (e.g., "📝")
  displayName?: string; // agent display name (e.g., "Content Agent")
  type: "message" | "task" | "alert" | "report" | "question";
  content: string;
  mentions: string[];
  kbRefs: string[];     // KB paths referenced
  timestamp: string;
  thread?: string;      // parent message ID (for thread replies)
  replyCount?: number;  // number of thread replies (computed on read)
}

export interface AgentTask {
  id: string;
  fromAgent: string;
  fromEmoji?: string;
  fromName?: string;
  toAgent: string;
  channel?: string;
  title: string;
  description: string;
  kbRefs: string[];
  status: "pending" | "in_progress" | "completed" | "failed";
  priority: number;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  result?: string;
}

export type AgentType = "lead" | "specialist" | "support";

/** Lightweight agent summary used in list/card views */
export interface AgentListItem {
  scopedId?: string;
  name: string;
  slug: string;
  emoji: string;
  role: string;
  provider?: string;
  active: boolean;
  type?: AgentType | string;
  department?: string;
  heartbeat?: string;
  workspace?: string;
  setupComplete?: boolean;
  body?: string;
  jobCount?: number;
  runningCount?: number;
  status?: "active" | "running" | "idle";
  cabinetPath?: string;
  cabinetName?: string;
}
export interface ProviderModel {
  id: string;
  name: string;
  description?: string;
}

export interface ProviderEffortLevel {
  id: string;
  name: string;
  description?: string;
}

export interface ProviderInfo {
  id: string;
  name: string;
  type: "cli" | "api";
  icon?: string;
  enabled?: boolean;
  available: boolean;
  authenticated?: boolean;
  version?: string;
  error?: string;
  installMessage?: string;
  installSteps?: Array<{ title: string; detail: string; link?: { label: string; url: string } }>;
  models?: ProviderModel[];
  effortLevels?: ProviderEffortLevel[];
  usage?: {
    agentSlugs: string[];
    jobs: Array<{
      agentSlug: string;
      jobId: string;
      jobName: string;
    }>;
    agentCount: number;
    jobCount: number;
    totalCount: number;
  };
}

export type AgentRuntime = "heartbeat" | "on-demand";

export interface Department {
  name: string;
  lead?: string;        // slug of lead agent
  agents: string[];     // slugs of all agents in department
}
