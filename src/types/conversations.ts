export type ConversationTrigger = "manual" | "job" | "heartbeat";

export type ConversationStatus =
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

export interface ConversationArtifact {
  path: string;
  label?: string;
}

export interface ConversationMeta {
  id: string;
  agentSlug: string;
  cabinetPath?: string;
  title: string;
  trigger: ConversationTrigger;
  status: ConversationStatus;
  startedAt: string;
  completedAt?: string;
  exitCode?: number | null;
  jobId?: string;
  jobName?: string;
  promptPath: string;
  transcriptPath: string;
  mentionedPaths: string[];
  artifactPaths: string[];
  summary?: string;
  contextSummary?: string;
}

export interface ConversationDetail {
  meta: ConversationMeta;
  prompt: string;
  request: string;
  transcript: string;
  rawTranscript: string;
  mentions: string[];
  artifacts: ConversationArtifact[];
}
