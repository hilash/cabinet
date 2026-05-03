export interface JobPostAction {
  action: "git_commit" | "update_page" | "notify";
  message?: string;
  path?: string;
  channel?: string;
}

export interface JobConfig {
  id: string;
  name: string;
  enabled: boolean;
  schedule: string;
  provider: string;
  adapterType?: string;
  adapterConfig?: Record<string, unknown>;
  ownerAgent?: string;
  agentSlug?: string;
  workdir?: string;
  timeout?: number;
  prompt: string;
  on_complete?: JobPostAction[];
  on_failure?: JobPostAction[];
  cabinetPath?: string;
  createdAt: string;
  updatedAt: string;
  /** One-shot job: auto-disable after first successful fire. */
  oneShot?: boolean;
  /** ISO datetime this job was created to run at (informational; the cron
   *  expression is the actual trigger). */
  runAfter?: string;
  /** Conversation id that dispatched this job via an agent action. */
  ownerTaskId?: string;
  /** Cabinet path for ownerTaskId; required when owner and job scopes differ. */
  ownerTaskCabinetPath?: string;
}

export interface JobRun {
  id: string;
  jobId: string;
  status: "running" | "completed" | "failed";
  startedAt: string;
  completedAt?: string;
  duration?: number;
  output: string;
}
