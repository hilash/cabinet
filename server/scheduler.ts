import fs from "fs";
import path from "path";
import cron from "node-cron";
import yaml from "js-yaml";
import matter from "gray-matter";
import {
  normalizeJobConfig,
  normalizeJobId,
} from "../src/lib/jobs/job-normalization";
import { loadCabinetConfig } from "../src/lib/config/cabinet-config";

export interface JobConfig {
  id: string;
  name: string;
  enabled: boolean;
  schedule: string;
  prompt: string;
  timeout?: number;
  agentSlug: string;
}

export interface HealthScheduleConfig {
  id: string;
  name?: string;
  schedule: string;
  enabled?: boolean;
}

export interface SchedulerCounts {
  jobs: number;
  heartbeats: number;
  healthChecks: number;
}

export interface Scheduler {
  reload(): Promise<void>;
  queueReload(): void;
  stopAll(): void;
  counts(): SchedulerCounts;
}

export interface SchedulerOptions {
  agentsDir: string;
  dataDir: string;
  getAppOrigin: () => string;
  reloadDebounceMs?: number;
}

export function createScheduler(opts: SchedulerOptions): Scheduler {
  const scheduledJobs = new Map<string, ReturnType<typeof cron.schedule>>();
  const scheduledHeartbeats = new Map<string, ReturnType<typeof cron.schedule>>();
  const scheduledHealthChecks = new Map<string, ReturnType<typeof cron.schedule>>();
  let reloadTimer: NodeJS.Timeout | null = null;
  const debounceMs = opts.reloadDebounceMs ?? 200;

  async function requestJson(
    method: "POST" | "PUT",
    url: string,
    body: Record<string, unknown>,
  ): Promise<void> {
    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`);
    }
  }

  function stopAll(): void {
    for (const [, task] of scheduledJobs) task.stop();
    for (const [, task] of scheduledHeartbeats) task.stop();
    for (const [, task] of scheduledHealthChecks) task.stop();
    scheduledJobs.clear();
    scheduledHeartbeats.clear();
    scheduledHealthChecks.clear();
  }

  function scheduleJob(job: JobConfig): void {
    const key = `${job.agentSlug}/${job.id}`;
    const existingTask = scheduledJobs.get(key);
    if (existingTask) existingTask.stop();

    if (!cron.validate(job.schedule)) {
      console.warn(`Invalid cron schedule for job ${key}: ${job.schedule}`);
      return;
    }

    const task = cron.schedule(job.schedule, () => {
      console.log(`Triggering scheduled job ${key}`);
      void requestJson(
        "PUT",
        `${opts.getAppOrigin()}/api/agents/${job.agentSlug}/jobs/${job.id}`,
        {
          action: "run",
          source: "scheduler",
        },
      ).catch((error) => {
        console.error(`Failed to trigger scheduled job ${key}:`, error);
      });
    });

    scheduledJobs.set(key, task);
    console.log(`  Scheduled job: ${key} (${job.schedule})`);
  }

  function scheduleHeartbeat(slug: string, cronExpr: string): void {
    if (!cron.validate(cronExpr)) {
      console.warn(`Invalid heartbeat schedule for ${slug}: ${cronExpr}`);
      return;
    }

    const task = cron.schedule(cronExpr, () => {
      console.log(`Triggering heartbeat ${slug}`);
      void requestJson("PUT", `${opts.getAppOrigin()}/api/agents/personas/${slug}`, {
        action: "run",
        source: "scheduler",
      }).catch((error) => {
        console.error(`Failed to trigger heartbeat ${slug}:`, error);
      });
    });

    scheduledHeartbeats.set(slug, task);
    console.log(`  Scheduled heartbeat: ${slug} (${cronExpr})`);
  }

  function scheduleHealthCheck(config: HealthScheduleConfig): void {
    const key = config.id;
    const existingTask = scheduledHealthChecks.get(key);
    if (existingTask) existingTask.stop();

    if (!cron.validate(config.schedule)) {
      console.warn(`Invalid health schedule for ${key}: ${config.schedule}`);
      return;
    }

    const task = cron.schedule(config.schedule, () => {
      console.log(`Triggering health check ${key}`);
      void requestJson("POST", `${opts.getAppOrigin()}/api/agents/pipelines/health`, {
        action: "run",
        source: "scheduler",
        scheduleId: key,
      }).catch((error) => {
        console.error(`Failed to trigger health check ${key}:`, error);
      });
    });

    scheduledHealthChecks.set(key, task);
    console.log(`  Scheduled health check: ${key} (${config.schedule})`);
  }

  async function reload(): Promise<void> {
    stopAll();

    if (!fs.existsSync(opts.agentsDir)) return;

    const entries = fs.readdirSync(opts.agentsDir, { withFileTypes: true });
    let jobCount = 0;
    let heartbeatCount = 0;
    let healthCount = 0;

    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name.startsWith(".")) continue;

      const personaPath = path.join(opts.agentsDir, entry.name, "persona.md");
      if (fs.existsSync(personaPath)) {
        try {
          const rawPersona = fs.readFileSync(personaPath, "utf-8");
          const { data } = matter(rawPersona);
          const active = data.active !== false;
          const heartbeat = typeof data.heartbeat === "string" ? data.heartbeat : "";
          if (active && heartbeat) {
            scheduleHeartbeat(entry.name, heartbeat);
            heartbeatCount++;
          }
        } catch {
          // Skip malformed personas.
        }
      }

      const jobsDir = path.join(opts.agentsDir, entry.name, "jobs");
      if (!fs.existsSync(jobsDir)) continue;

      const jobFiles = fs.readdirSync(jobsDir);
      for (const jf of jobFiles) {
        if (!jf.endsWith(".yaml")) continue;

        try {
          const raw = fs.readFileSync(path.join(jobsDir, jf), "utf-8");
          const config: JobConfig = {
            ...normalizeJobConfig(
              yaml.load(raw) as Partial<JobConfig>,
              entry.name,
              normalizeJobId(path.basename(jf, ".yaml")),
            ),
            agentSlug: entry.name,
          };
          if (config.id && config.enabled && config.schedule) {
            scheduleJob(config);
            jobCount++;
          }
        } catch {
          // Skip malformed jobs.
        }
      }
    }

    try {
      const config = await loadCabinetConfig(opts.dataDir);
      for (const schedule of config.schedules) {
        if (schedule.id.trim() && schedule.schedule.trim() && schedule.enabled) {
          scheduleHealthCheck({
            id: schedule.id.trim(),
            name: schedule.name,
            schedule: schedule.schedule.trim(),
            enabled: schedule.enabled,
          });
          healthCount++;
        }
      }
    } catch {
      // Skip malformed health schedules.
    }

    console.log(
      `Scheduled ${jobCount} jobs, ${heartbeatCount} heartbeats, and ${healthCount} health checks.`,
    );
  }

  function queueReload(): void {
    if (reloadTimer) {
      clearTimeout(reloadTimer);
    }

    reloadTimer = setTimeout(() => {
      reloadTimer = null;
      void reload().catch((error) => {
        console.error("Failed to reload daemon schedules:", error);
      });
    }, debounceMs);
  }

  function counts(): SchedulerCounts {
    return {
      jobs: scheduledJobs.size,
      heartbeats: scheduledHeartbeats.size,
      healthChecks: scheduledHealthChecks.size,
    };
  }

  return { reload, queueReload, stopAll, counts };
}
