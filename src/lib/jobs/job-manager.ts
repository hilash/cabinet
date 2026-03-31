import path from "path";
import yaml from "js-yaml";
import cron from "node-cron";
import { spawn } from "child_process";
import type { JobConfig, JobRun, JobPostAction } from "@/types/jobs";
import { DATA_DIR } from "@/lib/storage/path-utils";
import {
  readFileContent,
  writeFileContent,
  fileExists,
  ensureDirectory,
  listDirectory,
} from "@/lib/storage/fs-operations";

const JOBS_DIR = path.join(DATA_DIR, ".jobs");
const HISTORY_DIR = path.join(JOBS_DIR, ".history");

const scheduledJobs = new Map<string, ReturnType<typeof cron.schedule>>();
const runHistory = new Map<string, JobRun>();

export async function loadAllJobs(): Promise<JobConfig[]> {
  await ensureDirectory(JOBS_DIR);
  await ensureDirectory(HISTORY_DIR);

  const entries = await listDirectory(JOBS_DIR);
  const jobs: JobConfig[] = [];

  for (const entry of entries) {
    if (entry.name.endsWith(".yaml") && !entry.isDirectory) {
      try {
        const raw = await readFileContent(path.join(JOBS_DIR, entry.name));
        const config = yaml.load(raw) as JobConfig;
        if (config && config.id) {
          jobs.push(config);
        }
      } catch {
        // skip malformed files
      }
    }
  }

  return jobs;
}

export async function getJob(id: string): Promise<JobConfig | null> {
  const filePath = path.join(JOBS_DIR, `${id}.yaml`);
  if (!(await fileExists(filePath))) return null;
  const raw = await readFileContent(filePath);
  return yaml.load(raw) as JobConfig;
}

export async function saveJob(job: JobConfig): Promise<void> {
  await ensureDirectory(JOBS_DIR);
  const filePath = path.join(JOBS_DIR, `${job.id}.yaml`);
  const raw = yaml.dump(job, { lineWidth: -1, noRefs: true });
  await writeFileContent(filePath, raw);
}

export async function deleteJob(id: string): Promise<void> {
  const filePath = path.join(JOBS_DIR, `${id}.yaml`);
  const fs = await import("fs/promises");
  await fs.rm(filePath, { force: true });
  stopScheduledJob(id);
}

export async function toggleJob(id: string): Promise<JobConfig | null> {
  const job = await getJob(id);
  if (!job) return null;
  job.enabled = !job.enabled;
  job.updatedAt = new Date().toISOString();
  await saveJob(job);

  if (job.enabled) {
    scheduleJob(job);
  } else {
    stopScheduledJob(id);
  }

  return job;
}

export function scheduleJob(job: JobConfig): void {
  stopScheduledJob(job.id);

  if (!job.enabled || !cron.validate(job.schedule)) return;

  const task = cron.schedule(job.schedule, () => {
    executeJob(job);
  });

  scheduledJobs.set(job.id, task);
}

function stopScheduledJob(id: string): void {
  const task = scheduledJobs.get(id);
  if (task) {
    task.stop();
    scheduledJobs.delete(id);
  }
}

function substituteTemplateVars(text: string, job: JobConfig): string {
  const now = new Date();
  return text
    .replace(/\{\{date\}\}/g, now.toISOString().split("T")[0])
    .replace(/\{\{datetime\}\}/g, now.toISOString())
    .replace(/\{\{job\.name\}\}/g, job.name)
    .replace(/\{\{job\.id\}\}/g, job.id)
    .replace(/\{\{job\.workdir\}\}/g, job.workdir || "/data");
}

async function processPostActions(
  actions: JobPostAction[] | undefined,
  job: JobConfig,
  run: JobRun
): Promise<void> {
  if (!actions || actions.length === 0) return;

  for (const action of actions) {
    try {
      if (action.action === "git_commit") {
        const simpleGit = (await import("simple-git")).default;
        const git = simpleGit(DATA_DIR);
        await git.add(".");
        const msg = substituteTemplateVars(
          action.message || `Job ${job.name} completed {{date}}`,
          job
        );
        await git.commit(msg);
      }
    } catch (error) {
      console.error(`Post-action ${action.action} failed:`, error);
    }
  }
}

export async function executeJob(job: JobConfig): Promise<JobRun> {
  const runId = `${new Date().toISOString().replace(/[:.]/g, "-")}_${job.id}`;
  const run: JobRun = {
    id: runId,
    jobId: job.id,
    status: "running",
    startedAt: new Date().toISOString(),
    output: "",
  };

  runHistory.set(runId, run);

  const cwd = job.workdir
    ? path.join(DATA_DIR, job.workdir)
    : DATA_DIR;

  try {
    await ensureDirectory(cwd);

    const processedPrompt = substituteTemplateVars(job.prompt, job);
    const result = await new Promise<string>((resolve, reject) => {
      const proc = spawn("claude", ["--dangerously-skip-permissions", "-p", processedPrompt, "--output-format", "text"], {
        cwd,
        env: { ...process.env },
        stdio: ["pipe", "pipe", "pipe"],
      });

      let stdout = "";

      proc.stdout?.on("data", (data: Buffer) => {
        stdout += data.toString();
        run.output = stdout;
      });

      proc.stderr?.on("data", (data: Buffer) => {
        stdout += data.toString();
        run.output = stdout;
      });

      const timeout = setTimeout(() => {
        proc.kill();
        reject(new Error("Job timed out"));
      }, (job.timeout || 600) * 1000);

      proc.on("close", (code: number | null) => {
        clearTimeout(timeout);
        if (code === 0) resolve(stdout);
        else reject(new Error(`Exited with code ${code}`));
      });

      proc.on("error", (err: Error) => {
        clearTimeout(timeout);
        reject(err);
      });
    });

    run.status = "completed";
    run.output = result;
  } catch (error) {
    run.status = "failed";
    run.output += `\nError: ${error instanceof Error ? error.message : "Unknown error"}`;
  }

  run.completedAt = new Date().toISOString();
  run.duration = Math.floor(
    (new Date(run.completedAt).getTime() - new Date(run.startedAt).getTime()) / 1000
  );

  // Process post-actions
  if (run.status === "completed") {
    await processPostActions(job.on_complete, job, run);
  } else {
    await processPostActions(job.on_failure, job, run);
  }

  // Save to history file
  try {
    const logPath = path.join(HISTORY_DIR, `${runId}.log`);
    await writeFileContent(logPath, run.output);
    const metaPath = path.join(HISTORY_DIR, `${runId}.json`);
    const { output: _o, ...meta } = run;
    await writeFileContent(metaPath, JSON.stringify(meta, null, 2));
  } catch {
    // ignore history write errors
  }

  return run;
}

export function getRunHistory(): JobRun[] {
  return Array.from(runHistory.values())
    .sort(
      (a, b) =>
        new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
    )
    .slice(0, 50)
    .map(({ output: _o, ...rest }) => ({ ...rest, output: "" }));
}

export async function initScheduler(): Promise<void> {
  const jobs = await loadAllJobs();
  for (const job of jobs) {
    if (job.enabled) {
      scheduleJob(job);
    }
  }
}
