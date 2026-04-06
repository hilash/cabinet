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
  name: string;
  slug: string;
  emoji: string;
  role: string;
  active: boolean;
  type?: AgentType | string;
  department?: string;
  heartbeat?: string;
  workspace?: string;
  body?: string;
  jobCount?: number;
  runningCount?: number;
  status?: "active" | "running" | "idle";
}
export type AgentRuntime = "heartbeat" | "on-demand";

export interface Department {
  name: string;
  lead?: string;        // slug of lead agent
  agents: string[];     // slugs of all agents in department
}
