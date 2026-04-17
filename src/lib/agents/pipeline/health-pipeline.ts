import { spawn } from "child_process";
import { existsSync } from "fs";
import fs from "fs/promises";
import path from "path";
import cron from "node-cron";
import { DATA_DIR } from "@/lib/storage/path-utils";
import { getAppOrigin } from "@/lib/runtime/runtime-config";
import { postSystemMessage } from "@/lib/agents/runtime/slack-manager";
import { sendNotification } from "@/lib/agents/runtime/notification-service";
import { loadCabinetConfig, saveCabinetConfig } from "@/lib/config/cabinet-config";
import type { CabinetSchedule } from "@/lib/config/schema";

const HEALTH_ROOT = path.join(DATA_DIR, ".agents", ".health");
const HEALTH_REPORTS_DIR = path.join(HEALTH_ROOT, "reports");

export type HealthProfile = "quick" | "full";

type StepStatus = "passed" | "failed" | "skipped";

export interface HealthStepResult {
  id: string;
  name: string;
  status: StepStatus;
  durationMs: number;
  details: string;
}

export interface HealthReport {
  id: string;
  profile: HealthProfile;
  source: "manual" | "scheduler";
  scheduleId?: string;
  startedAt: string;
  completedAt: string;
  overallStatus: "passed" | "failed";
  steps: HealthStepResult[];
  failedCount: number;
  alertSent: boolean;
}

export interface HealthSchedule {
  id: string;
  name: string;
  schedule: string;
  profile: HealthProfile;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
  lastRunAt?: string;
  lastStatus?: "passed" | "failed";
  lastReportId?: string;
}

export interface RunHealthPipelineInput {
  profile?: HealthProfile;
  source?: "manual" | "scheduler";
  scheduleId?: string;
  appOriginOverride?: string;
  reportIdOverride?: string;
}

interface CommandResult {
  status: StepStatus;
  details: string;
  outputTruncated?: boolean;
}

const MAX_COMMAND_OUTPUT_BYTES = 4 * 1024 * 1024; // 4 MB per stream
const SOURCE_WORKSPACE_MARKERS = [
  ["package.json"],
  ["src", "app"],
];
const NEXT_ROOT_MARKERS = [
  ["next.config.ts"],
  ["next.config.js"],
  ["next.config.mjs"],
  ["next.config.cjs"],
  ["app"],
  ["pages"],
  ["src", "pages"],
];

function nowIso(): string {
  return new Date().toISOString();
}

function hasPathSegments(rootPath: string, segments: string[]): boolean {
  return segments.every((segment, index) =>
    existsSync(path.join(rootPath, ...segments.slice(0, index + 1)))
  );
}

export function isBuildableWorkspaceRoot(candidatePath: string): boolean {
  const resolvedPath = path.resolve(candidatePath);
  const hasRequiredMarkers = SOURCE_WORKSPACE_MARKERS.every((segments) =>
    hasPathSegments(resolvedPath, segments)
  );
  if (!hasRequiredMarkers) {
    return false;
  }

  return NEXT_ROOT_MARKERS.some((segments) => hasPathSegments(resolvedPath, segments));
}

export function resolveHealthBuildWorkspaceRoot(input: {
  projectRoot?: string;
  pwd?: string;
  dataDir?: string;
} = {}): { cwd: string | null; reason?: string } {
  const projectRoot = input.projectRoot ?? process.cwd();
  const pwd = input.pwd ?? process.env.PWD;
  const dataDir = input.dataDir ?? DATA_DIR;
  const candidates = [
    projectRoot,
    pwd,
    dataDir ? path.dirname(dataDir) : undefined,
  ]
    .filter((value): value is string => Boolean(value && value.trim()))
    .map((value) => path.resolve(value));

  const seen = new Set<string>();
  for (const candidate of candidates) {
    if (seen.has(candidate)) continue;
    seen.add(candidate);
    if (isBuildableWorkspaceRoot(candidate)) {
      return { cwd: candidate };
    }
  }

  return {
    cwd: null,
    reason: `Skipped because no buildable source workspace was found from candidates: ${Array.from(seen).join(", ") || "(none)"}`,
  };
}

async function ensureHealthDirs(): Promise<void> {
  await fs.mkdir(HEALTH_REPORTS_DIR, { recursive: true });
}

async function runCommand(
  command: string,
  args: string[],
  cwd: string,
  timeoutMs: number
): Promise<CommandResult> {
  return new Promise<CommandResult>((resolve) => {
    const proc = spawn(command, args, {
      cwd,
      stdio: ["ignore", "pipe", "pipe"],
      env: {
        ...process.env,
        NODE_ENV: "production",
        TURBOPACK: "",
      },
    });

    let stdout = "";
    let stderr = "";
    let stdoutBytes = 0;
    let stderrBytes = 0;
    let outputTruncated = false;
    let settled = false;
    const timeout = setTimeout(() => {
      if (settled) return;
      settled = true;
      proc.kill();
      resolve({
        status: "failed",
        details: `Timed out after ${Math.round(timeoutMs / 1000)}s`,
        outputTruncated,
      });
    }, timeoutMs);

    proc.stdout.on("data", (chunk: Buffer) => {
      if (stdoutBytes >= MAX_COMMAND_OUTPUT_BYTES) return;
      stdoutBytes += chunk.length;
      if (stdoutBytes > MAX_COMMAND_OUTPUT_BYTES) {
        const remaining = MAX_COMMAND_OUTPUT_BYTES - (stdoutBytes - chunk.length);
        if (remaining > 0) stdout += chunk.toString("utf8", 0, remaining);
        outputTruncated = true;
      } else {
        stdout += chunk.toString();
      }
    });
    proc.stderr.on("data", (chunk: Buffer) => {
      if (stderrBytes >= MAX_COMMAND_OUTPUT_BYTES) return;
      stderrBytes += chunk.length;
      if (stderrBytes > MAX_COMMAND_OUTPUT_BYTES) {
        const remaining = MAX_COMMAND_OUTPUT_BYTES - (stderrBytes - chunk.length);
        if (remaining > 0) stderr += chunk.toString("utf8", 0, remaining);
        outputTruncated = true;
      } else {
        stderr += chunk.toString();
      }
    });

    proc.on("error", (error: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      resolve({
        status: "failed",
        details: `Failed to start command: ${error.message}`,
      });
    });

    proc.on("close", (code: number | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);

      let output = [stdout.trim(), stderr.trim()].filter(Boolean).join("\n");
      if (outputTruncated) {
        output += `\n...[output truncated at ${MAX_COMMAND_OUTPUT_BYTES} bytes]`;
      }
      if (code === 0) {
        resolve({
          status: "passed",
          details: output || "Command completed successfully.",
          outputTruncated,
        });
        return;
      }

      resolve({
        status: "failed",
        details: output || `Command exited with code ${code ?? -1}`,
        outputTruncated,
      });
    });
  });
}

async function runHttpCheck(
  id: string,
  name: string,
  url: string,
  expectedStatus = 200
): Promise<HealthStepResult> {
  const started = Date.now();
  try {
    const response = await fetch(url, { cache: "no-store" });
    const durationMs = Date.now() - started;
    if (response.status === expectedStatus) {
      return {
        id,
        name,
        status: "passed",
        durationMs,
        details: `${url} -> ${response.status}`,
      };
    }
    return {
      id,
      name,
      status: "failed",
      durationMs,
      details: `${url} -> ${response.status} (expected ${expectedStatus})`,
    };
  } catch (error) {
    return {
      id,
      name,
      status: "failed",
      durationMs: Date.now() - started,
      details: error instanceof Error ? error.message : "Unknown network error",
    };
  }
}

async function runCommandStep(input: {
  id: string;
  name: string;
  command: string;
  args: string[];
  cwd: string;
  timeoutMs: number;
  skip?: boolean;
  skipDetails?: string;
}): Promise<HealthStepResult> {
  const started = Date.now();
  if (input.skip) {
    return {
      id: input.id,
      name: input.name,
      status: "skipped",
      durationMs: Date.now() - started,
      details: input.skipDetails || "Skipped by profile",
    };
  }

  const result = await runCommand(
    input.command,
    input.args,
    input.cwd,
    input.timeoutMs
  );
  return {
    id: input.id,
    name: input.name,
    status: result.status,
    durationMs: Date.now() - started,
    details: result.details.slice(0, 4000),
  };
}

function toHealthSchedule(schedule: CabinetSchedule): HealthSchedule | null {
  if (!schedule.name) return null;
  const now = nowIso();
  return {
    id: schedule.id,
    name: schedule.name,
    schedule: schedule.schedule,
    profile: schedule.profile ?? "quick",
    enabled: schedule.enabled,
    createdAt: schedule.createdAt ?? now,
    updatedAt: schedule.updatedAt ?? schedule.createdAt ?? now,
    lastRunAt: schedule.lastRunAt,
    lastStatus: schedule.lastStatus,
    lastReportId: schedule.lastReportId,
  };
}

async function readSchedules(): Promise<HealthSchedule[]> {
  const config = await loadCabinetConfig(DATA_DIR);
  return config.schedules
    .map(toHealthSchedule)
    .filter((schedule): schedule is HealthSchedule => schedule !== null);
}

async function writeSchedules(schedules: HealthSchedule[]): Promise<void> {
  const config = await loadCabinetConfig(DATA_DIR);
  await saveCabinetConfig(DATA_DIR, { ...config, schedules });
}

async function saveHealthReport(report: HealthReport): Promise<string> {
  await ensureHealthDirs();
  const filePath = path.join(HEALTH_REPORTS_DIR, `${report.id}.json`);
  await fs.writeFile(filePath, JSON.stringify(report, null, 2), "utf8");
  return filePath;
}

async function setScheduleRunState(input: {
  scheduleId: string;
  status: "passed" | "failed";
  reportId: string;
}): Promise<void> {
  const schedules = await readSchedules();
  const next = schedules.map((schedule) =>
    schedule.id === input.scheduleId
      ? {
          ...schedule,
          lastRunAt: nowIso(),
          lastStatus: input.status,
          lastReportId: input.reportId,
          updatedAt: nowIso(),
        }
      : schedule
  );
  await writeSchedules(next);
}

export async function getHealthReport(id: string): Promise<HealthReport | null> {
  try {
    const raw = await fs.readFile(path.join(HEALTH_REPORTS_DIR, `${id}.json`), "utf8");
    return JSON.parse(raw) as HealthReport;
  } catch {
    return null;
  }
}

export async function listHealthReports(limit = 20): Promise<HealthReport[]> {
  await ensureHealthDirs();
  const entries = await fs.readdir(HEALTH_REPORTS_DIR, { withFileTypes: true });
  const files = entries.filter((entry) => entry.isFile() && entry.name.endsWith(".json"));
  const reports: HealthReport[] = [];

  for (const file of files) {
    try {
      const raw = await fs.readFile(path.join(HEALTH_REPORTS_DIR, file.name), "utf8");
      reports.push(JSON.parse(raw) as HealthReport);
    } catch {
      // skip malformed report file
    }
  }

  return reports
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
    .slice(0, limit);
}

export async function listHealthSchedules(): Promise<HealthSchedule[]> {
  const schedules = await readSchedules();
  return schedules.sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

export async function upsertHealthSchedule(input: {
  id?: string;
  name: string;
  schedule: string;
  profile?: HealthProfile;
  enabled?: boolean;
}): Promise<HealthSchedule> {
  if (!cron.validate(input.schedule)) {
    throw new Error("Invalid cron expression");
  }

  const schedules = await readSchedules();
  const now = nowIso();
  const nextId = input.id || `health-${Date.now()}`;
  const existing = schedules.find((schedule) => schedule.id === nextId);

  const next: HealthSchedule = existing
    ? {
        ...existing,
        name: input.name,
        schedule: input.schedule,
        profile: input.profile || existing.profile || "quick",
        enabled: input.enabled ?? existing.enabled,
        updatedAt: now,
      }
    : {
        id: nextId,
        name: input.name,
        schedule: input.schedule,
        profile: input.profile || "quick",
        enabled: input.enabled ?? true,
        createdAt: now,
        updatedAt: now,
      };

  const remaining = schedules.filter((schedule) => schedule.id !== nextId);
  await writeSchedules([next, ...remaining]);
  return next;
}

export async function deleteHealthSchedule(id: string): Promise<boolean> {
  const schedules = await readSchedules();
  const next = schedules.filter((schedule) => schedule.id !== id);
  if (next.length === schedules.length) return false;
  await writeSchedules(next);
  return true;
}

export async function runHealthPipeline(
  input: RunHealthPipelineInput = {}
): Promise<{ report: HealthReport; reportPath: string }> {
  const profile: HealthProfile = input.profile === "full" ? "full" : "quick";
  const source = input.source === "scheduler" ? "scheduler" : "manual";
  const startedAt = nowIso();
  const reportId = input.reportIdOverride || `health-${Date.now()}`;
  const appOrigin =
    typeof input.appOriginOverride === "string" && input.appOriginOverride.trim()
      ? input.appOriginOverride.trim().replace(/\/+$/, "")
      : getAppOrigin();
  const buildWorkspace = resolveHealthBuildWorkspaceRoot();
  const buildWorkspaceRoot = buildWorkspace.cwd || process.cwd();
  const buildWorkspaceMissing = !buildWorkspace.cwd;

  const steps: HealthStepResult[] = [];
  steps.push(
    await runHttpCheck("api-health", "App health API", `${appOrigin}/api/health`)
  );
  steps.push(
    await runHttpCheck(
      "daemon-health",
      "Daemon health API",
      `${appOrigin}/api/health/daemon`
    )
  );
  steps.push(
    await runHttpCheck(
      "multica-health",
      "Multica health API",
      `${appOrigin}/multica-api/health`
    )
  );
  steps.push(
    await runCommandStep({
      id: "build-check",
      name: "Build check (npm run build)",
      command: "npm",
      args: ["run", "build"],
      cwd: buildWorkspaceRoot,
      timeoutMs: 20 * 60 * 1000,
      skip: buildWorkspaceMissing,
      skipDetails: buildWorkspace.reason,
    })
  );
  steps.push(
    await runCommandStep({
      id: "package-check",
      name: "Packaging check (npm run electron:package)",
      command: "npm",
      args: ["run", "electron:package"],
      cwd: buildWorkspaceRoot,
      timeoutMs: 60 * 60 * 1000,
      skip: profile !== "full" || buildWorkspaceMissing,
      skipDetails:
        profile !== "full" && !buildWorkspaceMissing
          ? "Skipped by profile"
          : buildWorkspace.reason,
    })
  );

  const failedCount = steps.filter((step) => step.status === "failed").length;
  const overallStatus: "passed" | "failed" =
    failedCount > 0 ? "failed" : "passed";

  let alertSent = false;
  if (overallStatus === "failed") {
    const failedSummary = steps
      .filter((step) => step.status === "failed")
      .map((step) => `- ${step.name}: ${step.details}`)
      .join("\n");
    const alertMessage = [
      `Regression health check failed (${reportId}).`,
      `Profile: ${profile}`,
      failedSummary || "- Unknown failure",
    ].join("\n");
    await postSystemMessage("alerts", `🚨 ${alertMessage}`).catch(() => {});
    await sendNotification({
      title: "Regression health check failed",
      message: alertMessage,
      severity: "critical",
      agentName: "Health Watcher",
      agentEmoji: "🚨",
      channel: "alerts",
    }).catch(() => {});
    alertSent = true;
  }

  const report: HealthReport = {
    id: reportId,
    profile,
    source,
    scheduleId: input.scheduleId,
    startedAt,
    completedAt: nowIso(),
    overallStatus,
    steps,
    failedCount,
    alertSent,
  };
  const reportPath = await saveHealthReport(report);

  if (input.scheduleId) {
    await setScheduleRunState({
      scheduleId: input.scheduleId,
      status: overallStatus,
      reportId,
    }).catch(() => {});
  }

  return { report, reportPath };
}
