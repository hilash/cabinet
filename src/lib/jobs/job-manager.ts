import path from "path";
import yaml from "js-yaml";
import type { JobConfig, JobRun } from "@/types/jobs";
import { DATA_DIR } from "@/lib/storage/path-utils";
import {
  readFileContent,
  writeFileContent,
  fileExists,
  ensureDirectory,
  listDirectory,
} from "@/lib/storage/fs-operations";
import { startJobConversation } from "@/lib/agents/conversation-runner";
import { reloadDaemonSchedules } from "@/lib/agents/daemon-client";
import { resolveEnabledProviderId } from "@/lib/agents/provider-settings";

const JOBS_DIR = path.join(DATA_DIR, ".jobs");
const AGENTS_DIR = path.join(DATA_DIR, ".agents");
const HISTORY_DIR = path.join(JOBS_DIR, ".history");

const runHistory = new Map<string, JobRun>();

/** Load jobs from the legacy /data/.jobs/ directory */
async function loadLegacyJobs(): Promise<JobConfig[]> {
  await ensureDirectory(JOBS_DIR);
  const entries = await listDirectory(JOBS_DIR);
  const jobs: JobConfig[] = [];

  for (const entry of entries) {
    if (entry.name.endsWith(".yaml") && !entry.isDirectory) {
        try {
          const raw = await readFileContent(path.join(JOBS_DIR, entry.name));
          const config = yaml.load(raw) as JobConfig;
          if (config && config.id) {
            config.provider = resolveEnabledProviderId(config.provider);
            jobs.push(config);
          }
        } catch { /* skip */ }
    }
  }
  return jobs;
}

/** Load jobs from /data/.agents/{slug}/jobs/ directories */
async function loadAgentJobs(): Promise<JobConfig[]> {
  const jobs: JobConfig[] = [];
  try {
    const entries = await listDirectory(AGENTS_DIR);
    for (const entry of entries) {
      if (!entry.isDirectory || entry.name.startsWith(".")) continue;
      const agentJobsDir = path.join(AGENTS_DIR, entry.name, "jobs");
      if (!(await fileExists(agentJobsDir))) continue;

      const jobFiles = await listDirectory(agentJobsDir);
      for (const jf of jobFiles) {
        if (!jf.name.endsWith(".yaml") || jf.isDirectory) continue;
        try {
          const raw = await readFileContent(path.join(agentJobsDir, jf.name));
          const config = yaml.load(raw) as JobConfig;
          if (config && config.id) {
            config.provider = resolveEnabledProviderId(config.provider);
            config.agentSlug = entry.name;
            jobs.push(config);
          }
        } catch { /* skip */ }
      }
    }
  } catch { /* agents dir may not exist */ }
  return jobs;
}

/** Load all jobs from both legacy and agent-scoped directories */
export async function loadAllJobs(): Promise<JobConfig[]> {
  await ensureDirectory(HISTORY_DIR);
  const [legacy, agentScoped] = await Promise.all([
    loadLegacyJobs(),
    loadAgentJobs(),
  ]);
  return [...legacy, ...agentScoped];
}

/** Load jobs for a specific agent */
export async function loadAgentJobsBySlug(agentSlug: string): Promise<JobConfig[]> {
  const agentJobsDir = path.join(AGENTS_DIR, agentSlug, "jobs");
  if (!(await fileExists(agentJobsDir))) return [];

  const entries = await listDirectory(agentJobsDir);
  const jobs: JobConfig[] = [];

  for (const entry of entries) {
    if (!entry.name.endsWith(".yaml") || entry.isDirectory) continue;
    try {
      const raw = await readFileContent(path.join(agentJobsDir, entry.name));
      const config = yaml.load(raw) as JobConfig;
      if (config && config.id) {
        config.provider = resolveEnabledProviderId(config.provider);
        config.agentSlug = agentSlug;
        jobs.push(config);
      }
    } catch { /* skip */ }
  }
  return jobs;
}

/** Save a job to the appropriate directory based on agentSlug */
export async function saveAgentJob(agentSlug: string, job: JobConfig): Promise<void> {
  const agentJobsDir = path.join(AGENTS_DIR, agentSlug, "jobs");
  await ensureDirectory(agentJobsDir);
  job.agentSlug = agentSlug;
  job.provider = resolveEnabledProviderId(job.provider);
  const filePath = path.join(agentJobsDir, `${job.id}.yaml`);
  const raw = yaml.dump(job, { lineWidth: -1, noRefs: true });
  await writeFileContent(filePath, raw);
}

/** Delete a job from the agent's jobs directory */
export async function deleteAgentJob(agentSlug: string, jobId: string): Promise<void> {
  const filePath = path.join(AGENTS_DIR, agentSlug, "jobs", `${jobId}.yaml`);
  const fs = await import("fs/promises");
  await fs.rm(filePath, { force: true });
}

export async function getJob(id: string): Promise<JobConfig | null> {
  const filePath = path.join(JOBS_DIR, `${id}.yaml`);
  if (!(await fileExists(filePath))) return null;
  const raw = await readFileContent(filePath);
  return yaml.load(raw) as JobConfig;
}

export async function saveJob(job: JobConfig): Promise<void> {
  await ensureDirectory(JOBS_DIR);
  job.provider = resolveEnabledProviderId(job.provider);
  const filePath = path.join(JOBS_DIR, `${job.id}.yaml`);
  const raw = yaml.dump(job, { lineWidth: -1, noRefs: true });
  await writeFileContent(filePath, raw);
}

export async function deleteJob(id: string): Promise<void> {
  const filePath = path.join(JOBS_DIR, `${id}.yaml`);
  const fs = await import("fs/promises");
  await fs.rm(filePath, { force: true });
}

export async function toggleJob(id: string): Promise<JobConfig | null> {
  const job = await getJob(id);
  if (!job) return null;
  job.enabled = !job.enabled;
  job.updatedAt = new Date().toISOString();
  await saveJob(job);

  if (job.enabled) {
    await reloadDaemonSchedules().catch(() => {});
  } else {
    await reloadDaemonSchedules().catch(() => {});
  }

  return job;
}

export function scheduleJob(job: JobConfig): void {
  void job;
  void reloadDaemonSchedules().catch(() => {});
}

export async function executeJob(job: JobConfig): Promise<JobRun> {
  const run = await startJobConversation(job);
  runHistory.set(run.id, run);
  return run;
}

export function getRunHistory(): JobRun[] {
  return Array.from(runHistory.values())
    .sort(
      (a, b) =>
        new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
    )
    .slice(0, 50)
    .map((run) => ({ ...run, output: "" }));
}

export async function initScheduler(): Promise<void> {
  await reloadDaemonSchedules().catch(() => {});
}
