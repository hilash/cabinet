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
import {
  jobIdMatches,
  normalizeJobConfig,
  normalizeJobId,
} from "@/lib/jobs/job-normalization";

const JOBS_DIR = path.join(DATA_DIR, ".jobs");
const AGENTS_DIR = path.join(DATA_DIR, ".agents");
const HISTORY_DIR = path.join(JOBS_DIR, ".history");

const runHistory = new Map<string, JobRun>();

async function loadNormalizedJobFile(
  filePath: string,
  agentSlug?: string
): Promise<JobConfig | null> {
  const raw = await readFileContent(filePath);
  const parsed = yaml.load(raw) as Partial<JobConfig> | null;
  if (!parsed) return null;

  const normalized = normalizeJobConfig(
    parsed,
    agentSlug,
    normalizeJobId(path.basename(filePath, ".yaml"), parsed.name)
  );
  const nextRaw = yaml.dump(normalized, { lineWidth: -1, noRefs: true });
  const nextPath = path.join(path.dirname(filePath), `${normalized.id}.yaml`);

  if (nextPath !== filePath || nextRaw !== raw) {
    await writeFileContent(nextPath, nextRaw);
    if (nextPath !== filePath) {
      const fs = await import("fs/promises");
      await fs.rm(filePath, { force: true });
    }
  }

  return normalized;
}

/** Load jobs from the legacy /data/.jobs/ directory */
async function loadLegacyJobs(): Promise<JobConfig[]> {
  await ensureDirectory(JOBS_DIR);
  const entries = await listDirectory(JOBS_DIR);
  const jobs = new Map<string, JobConfig>();

  for (const entry of entries) {
    if (entry.name.endsWith(".yaml") && !entry.isDirectory) {
      try {
        const config = await loadNormalizedJobFile(path.join(JOBS_DIR, entry.name));
        if (config?.id) jobs.set(config.id, config);
      } catch { /* skip */ }
    }
  }
  return Array.from(jobs.values());
}

/** Load jobs from /data/.agents/{slug}/jobs/ directories */
async function loadAgentJobs(): Promise<JobConfig[]> {
  const jobs = new Map<string, JobConfig>();
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
          const config = await loadNormalizedJobFile(
            path.join(agentJobsDir, jf.name),
            entry.name
          );
          if (config?.id) jobs.set(`${entry.name}/${config.id}`, config);
        } catch { /* skip */ }
      }
    }
  } catch { /* agents dir may not exist */ }
  return Array.from(jobs.values());
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
  const jobs = new Map<string, JobConfig>();

  for (const entry of entries) {
    if (!entry.name.endsWith(".yaml") || entry.isDirectory) continue;
    try {
      const config = await loadNormalizedJobFile(
        path.join(agentJobsDir, entry.name),
        agentSlug
      );
      if (config?.id) jobs.set(config.id, config);
    } catch { /* skip */ }
  }
  return Array.from(jobs.values());
}

/** Save a job to the appropriate directory based on agentSlug */
export async function saveAgentJob(agentSlug: string, job: JobConfig): Promise<void> {
  const agentJobsDir = path.join(AGENTS_DIR, agentSlug, "jobs");
  await ensureDirectory(agentJobsDir);
  const normalized = normalizeJobConfig(
    job,
    agentSlug,
    normalizeJobId(job.id, job.name)
  );
  const filePath = path.join(agentJobsDir, `${normalized.id}.yaml`);
  const raw = yaml.dump(normalized, { lineWidth: -1, noRefs: true });
  await writeFileContent(filePath, raw);

  if (typeof job.id === "string" && job.id !== normalized.id) {
    const fs = await import("fs/promises");
    await fs.rm(path.join(agentJobsDir, `${job.id}.yaml`), { force: true });
  }
}

/** Delete a job from the agent's jobs directory */
export async function deleteAgentJob(agentSlug: string, jobId: string): Promise<void> {
  const fs = await import("fs/promises");
  const jobsDir = path.join(AGENTS_DIR, agentSlug, "jobs");
  if (!(await fileExists(jobsDir))) return;

  const normalizedJobId = normalizeJobId(jobId);
  const entries = await listDirectory(jobsDir);
  await Promise.all(
    entries
      .filter((entry) => entry.name.endsWith(".yaml") && !entry.isDirectory)
      .filter((entry) =>
        jobIdMatches(path.basename(entry.name, ".yaml"), normalizedJobId)
      )
      .map((entry) => fs.rm(path.join(jobsDir, entry.name), { force: true }))
  );
}

export async function getJob(id: string): Promise<JobConfig | null> {
  const normalizedId = normalizeJobId(id);
  const filePath = path.join(JOBS_DIR, `${normalizedId}.yaml`);
  if (await fileExists(filePath)) {
    return loadNormalizedJobFile(filePath);
  }

  const entries = await listDirectory(JOBS_DIR);
  for (const entry of entries) {
    if (!entry.name.endsWith(".yaml") || entry.isDirectory) continue;
    if (!jobIdMatches(path.basename(entry.name, ".yaml"), normalizedId)) continue;
    return loadNormalizedJobFile(path.join(JOBS_DIR, entry.name));
  }

  return null;
}

export async function saveJob(job: JobConfig): Promise<void> {
  await ensureDirectory(JOBS_DIR);
  const normalized = normalizeJobConfig(
    job,
    job.agentSlug,
    normalizeJobId(job.id, job.name)
  );
  const filePath = path.join(JOBS_DIR, `${normalized.id}.yaml`);
  const raw = yaml.dump(normalized, { lineWidth: -1, noRefs: true });
  await writeFileContent(filePath, raw);

  if (typeof job.id === "string" && job.id !== normalized.id) {
    const fs = await import("fs/promises");
    await fs.rm(path.join(JOBS_DIR, `${job.id}.yaml`), { force: true });
  }
}

export async function deleteJob(id: string): Promise<void> {
  const fs = await import("fs/promises");
  const normalizedId = normalizeJobId(id);
  const entries = await listDirectory(JOBS_DIR);
  await Promise.all(
    entries
      .filter((entry) => entry.name.endsWith(".yaml") && !entry.isDirectory)
      .filter((entry) =>
        jobIdMatches(path.basename(entry.name, ".yaml"), normalizedId)
      )
      .map((entry) => fs.rm(path.join(JOBS_DIR, entry.name), { force: true }))
  );
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
