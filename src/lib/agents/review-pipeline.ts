import { spawn } from "child_process";
import { randomUUID } from "crypto";
import fs from "fs/promises";
import path from "path";
import { DATA_DIR } from "@/lib/storage/path-utils";
import { runOneShotProviderPrompt } from "./provider-runtime";

const DEFAULT_MAX_DIFF_CHARS = 100_000;
const DEFAULT_MAX_FILES = 60;
const DEFAULT_GIT_TIMEOUT_MS = 30_000;
const DEFAULT_PROVIDER_TIMEOUT_MS = 300_000;
const DEFAULT_UNTRACKED_PREVIEW_CHARS = 2_000;
const DEFAULT_UNTRACKED_PREVIEW_FILES = 5;
const DEFAULT_MAX_STATUS_LINES = 120;
const DEFAULT_MAX_STATUS_CHARS = 8_000;
const DEFAULT_MAX_UNTRACKED_FILE_SIZE = 2 * 1024 * 1024;
const DEFAULT_MAX_GIT_OUTPUT_BYTES = 2 * 1024 * 1024;

type FindingSeverity = "critical" | "high" | "medium" | "low";
type OverallRisk = "high" | "medium" | "low";

export interface CodeReviewFinding {
  severity: FindingSeverity;
  file: string;
  line: number | null;
  title: string;
  details: string;
  suggestion: string;
}

export interface CodeReviewResult {
  summary: string;
  overallRisk: OverallRisk;
  findings: CodeReviewFinding[];
  testRecommendations: string[];
}

export interface CodeReviewPipelineInput {
  providerId?: string;
  workdir?: string;
  compareRange?: string;
  baseRef?: string;
  headRef?: string;
  includePaths?: string[];
  maxDiffChars?: number;
  maxFiles?: number;
  timeoutMs?: number;
  saveArtifact?: boolean;
}

export interface CodeReviewPipelineResult {
  review: CodeReviewResult;
  repoRoot: string;
  branch: string;
  workdir: string;
  changedFiles: string[];
  compareRange: string | null;
  diffTruncated: boolean;
  artifactPath?: string;
}

interface GitCommandOptions {
  timeoutMs?: number;
  allowExitCodes?: number[];
  maxOutputBytes?: number;
  allowPartial?: boolean;
}

interface ReviewContext {
  repoRoot: string;
  branch: string;
  statusShort: string;
  changedFiles: string[];
  compareRange: string | null;
  includePaths: string[];
  diff: string;
  diffTruncated: boolean;
}

function uniq(items: string[]): string[] {
  return Array.from(new Set(items));
}

function stripCodeFence(input: string): string {
  let text = input.trim();
  if (text.startsWith("```")) {
    text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  }
  return text.trim();
}

function tryParseJsonCandidate(candidate: string): unknown {
  return JSON.parse(candidate);
}

function parseLooseJsonObject(raw: string): unknown {
  const trimmed = stripCodeFence(raw);
  if (!trimmed) {
    throw new Error("Provider returned empty review output");
  }

  const candidates: string[] = [trimmed];

  const firstObj = trimmed.indexOf("{");
  const lastObj = trimmed.lastIndexOf("}");
  if (firstObj >= 0 && lastObj > firstObj) {
    candidates.push(trimmed.slice(firstObj, lastObj + 1));
  }

  const firstArr = trimmed.indexOf("[");
  const lastArr = trimmed.lastIndexOf("]");
  if (firstArr >= 0 && lastArr > firstArr) {
    candidates.push(trimmed.slice(firstArr, lastArr + 1));
  }

  for (const candidate of uniq(candidates)) {
    try {
      return tryParseJsonCandidate(candidate);
    } catch {
      // Try next candidate.
    }
  }

  throw new Error("Provider review output is not valid JSON");
}

function normalizeSeverity(value: unknown): FindingSeverity {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (normalized === "critical" || normalized === "high" || normalized === "medium" || normalized === "low") {
    return normalized;
  }
  if (normalized === "p0") return "critical";
  if (normalized === "p1") return "high";
  if (normalized === "p2") return "medium";
  return "medium";
}

function severityWeight(value: FindingSeverity): number {
  switch (value) {
    case "critical":
      return 4;
    case "high":
      return 3;
    case "medium":
      return 2;
    case "low":
      return 1;
    default:
      return 0;
  }
}

function normalizeOverallRisk(value: unknown, findings: CodeReviewFinding[]): OverallRisk {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (normalized === "high" || normalized === "medium" || normalized === "low") {
    return normalized;
  }
  const max = findings.reduce((acc, f) => Math.max(acc, severityWeight(f.severity)), 0);
  if (max >= 4) return "high";
  if (max >= 3) return "high";
  if (max >= 2) return "medium";
  return "low";
}

function asString(value: unknown, fallback = ""): string {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed) return trimmed;
  }
  return fallback;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter((item) => Boolean(item));
}

function normalizeFindings(value: unknown): CodeReviewFinding[] {
  if (!Array.isArray(value)) return [];
  const findings: CodeReviewFinding[] = [];

  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const file = asString(row.file || row.path || row.filename || row.location, "unknown");
    const lineValue =
      typeof row.line === "number"
        ? Math.round(row.line)
        : typeof row.line === "string"
          ? Number.parseInt(row.line, 10)
          : null;
    const line = Number.isFinite(lineValue) && (lineValue as number) > 0 ? (lineValue as number) : null;

    findings.push({
      severity: normalizeSeverity(row.severity || row.priority),
      file,
      line,
      title: asString(row.title, "Potential issue"),
      details: asString(row.details || row.description || row.reason, "Details not provided"),
      suggestion: asString(row.suggestion || row.fix || row.recommendation, "No fix suggestion provided"),
    });
  }

  return findings;
}

export function parseReviewProviderResponse(raw: string): CodeReviewResult {
  const parsed = parseLooseJsonObject(raw);

  if (Array.isArray(parsed)) {
    const findings = normalizeFindings(parsed);
    return {
      summary:
        findings.length > 0
          ? `Detected ${findings.length} issue(s) in the provided diff.`
          : "No significant issues detected in the provided diff.",
      overallRisk: normalizeOverallRisk(undefined, findings),
      findings,
      testRecommendations: [],
    };
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error("Provider review output must be a JSON object or array");
  }

  const object = parsed as Record<string, unknown>;
  const findings = normalizeFindings(object.findings || object.issues);
  const summary = asString(
    object.summary || object.overview,
    findings.length > 0
      ? `Detected ${findings.length} issue(s) in the provided diff.`
      : "No significant issues detected in the provided diff."
  );
  const testRecommendations = asStringArray(
    object.testRecommendations || object.tests || object.recommendedTests
  ).slice(0, 12);

  return {
    summary,
    overallRisk: normalizeOverallRisk(object.overallRisk || object.risk, findings),
    findings,
    testRecommendations,
  };
}

function truncateText(input: string, maxChars: number): { text: string; truncated: boolean } {
  if (input.length <= maxChars) {
    return { text: input, truncated: false };
  }
  const omitted = input.length - maxChars;
  const trimmed = input.slice(0, maxChars);
  return {
    text: `${trimmed}\n\n[Diff truncated: omitted ${omitted} chars to stay within prompt budget.]`,
    truncated: true,
  };
}

function parseStatusLinePath(line: string): string {
  const trimmed = line.trim();
  if (!trimmed) return "";
  const body = trimmed.length > 3 ? trimmed.slice(3).trim() : "";
  if (!body) return "";
  if (body.includes("->")) {
    const parts = body.split("->").map((part) => part.trim()).filter(Boolean);
    return parts[parts.length - 1] || "";
  }
  return body;
}

function normalizeStatusShort(statusShort: string, includePaths: string[]): string {
  const lines = statusShort
    .split("\n")
    .map((line) => line.trimEnd())
    .filter((line) => Boolean(line));

  const filtered = lines.filter((line) => {
    const file = parseStatusLinePath(line);
    if (!file) return false;
    return fileMatchesIncludePaths(file, includePaths);
  });

  const base = includePaths.length > 0 ? filtered : lines;
  const limited = base.slice(0, DEFAULT_MAX_STATUS_LINES);
  const joined = limited.join("\n");

  if (joined.length <= DEFAULT_MAX_STATUS_CHARS) {
    return joined;
  }
  return `${joined.slice(0, DEFAULT_MAX_STATUS_CHARS)}\n...[status truncated]`;
}

async function runGitCommand(
  cwd: string,
  args: string[],
  options: GitCommandOptions = {}
): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const proc = spawn("git", args, {
      cwd,
      stdio: ["ignore", "pipe", "pipe"],
    });

    const allowedExitCodes = options.allowExitCodes || [];
    const timeoutMs = options.timeoutMs || DEFAULT_GIT_TIMEOUT_MS;
    const maxOutputBytes =
      typeof options.maxOutputBytes === "number" && options.maxOutputBytes > 1024
        ? Math.floor(options.maxOutputBytes)
        : DEFAULT_MAX_GIT_OUTPUT_BYTES;
    const allowPartial = options.allowPartial !== false;
    let stdout = "";
    let stderr = "";
    let stdoutBytes = 0;
    let outputTruncated = false;
    let settled = false;
    const timeout = setTimeout(() => {
      if (settled) return;
      settled = true;
      proc.kill();
      reject(new Error(`git ${args.join(" ")} timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    proc.stdout.on("data", (chunk: Buffer) => {
      if (settled) return;
      if (outputTruncated) return;
      stdoutBytes += chunk.length;
      if (stdoutBytes > maxOutputBytes) {
        outputTruncated = true;
        const remaining = Math.max(0, maxOutputBytes - (stdoutBytes - chunk.length));
        if (remaining > 0) {
          stdout += chunk.toString("utf8", 0, remaining);
        }
        if (allowPartial) {
          proc.kill();
          return;
        }
      } else {
        stdout += chunk.toString();
      }
    });
    proc.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    proc.on("error", (error: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      reject(error);
    });

    proc.on("close", (code: number | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      if (outputTruncated && allowPartial) {
        resolve(`${stdout}\n\n[git output truncated to ${maxOutputBytes} bytes]`);
        return;
      }
      const normalizedCode = code ?? -1;
      if (normalizedCode === 0 || allowedExitCodes.includes(normalizedCode)) {
        resolve(stdout.trimEnd());
        return;
      }
      reject(
        new Error(
          stderr.trim() || `git ${args.join(" ")} exited with code ${normalizedCode}`
        )
      );
    });
  });
}

const REPO_ROOT = process.cwd();

function isAllowedWorkdir(resolved: string): boolean {
  // Allow the repo root itself
  if (resolved === REPO_ROOT) return true;
  // Allow subdirectories of the repo root
  if (resolved.startsWith(`${REPO_ROOT}${path.sep}`)) return true;
  // Allow DATA_DIR and its subdirectories
  if (resolved === DATA_DIR) return true;
  if (resolved.startsWith(`${DATA_DIR}${path.sep}`)) return true;
  return false;
}

export async function resolveGitWorkdir(input?: string): Promise<{ workdir: string; repoRoot: string }> {
  const requested = input?.trim();
  const candidates: string[] = [];

  if (requested) {
    if (path.isAbsolute(requested)) {
      candidates.push(path.resolve(requested));
    } else {
      candidates.push(path.resolve(process.cwd(), requested));
      candidates.push(path.resolve(DATA_DIR, requested));
    }
  } else {
    candidates.push(process.cwd());
  }

  for (const candidate of uniq(candidates)) {
    if (!isAllowedWorkdir(candidate)) continue;
    try {
      const stat = await fs.stat(candidate);
      if (!stat.isDirectory()) continue;
      const repoRoot = await runGitCommand(candidate, ["rev-parse", "--show-toplevel"]);
      return {
        workdir: candidate,
        repoRoot: repoRoot.trim(),
      };
    } catch {
      // Try next candidate.
    }
  }

  if (requested) {
    // Check if it was rejected by the allowlist (vs just not a git repo)
    const resolved = path.isAbsolute(requested)
      ? path.resolve(requested)
      : path.resolve(process.cwd(), requested);
    if (!isAllowedWorkdir(resolved)) {
      throw new Error(`Workdir "${requested}" is outside allowed directories`);
    }
  }

  const hint = requested ? ` for "${requested}"` : "";
  throw new Error(`Could not resolve a git repository${hint}`);
}

function validateGitToken(label: string, value: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("-")) {
    throw new Error(`${label} cannot start with '-'`);
  }
  if (/\s/.test(trimmed)) {
    throw new Error(`${label} cannot contain whitespace`);
  }
  return trimmed;
}

function validateCompareRange(value: string | null): string | null {
  const range = validateGitToken("compareRange", value);
  if (!range) return null;

  if (range.includes("...")) {
    const [left, right] = range.split("...");
    validateGitToken("compareRange left ref", left || null);
    validateGitToken("compareRange right ref", right || null);
    return range;
  }

  if (range.includes("..")) {
    const [left, right] = range.split("..");
    validateGitToken("compareRange left ref", left || null);
    validateGitToken("compareRange right ref", right || null);
    return range;
  }

  validateGitToken("compareRange ref", range);
  return range;
}

function buildCompareRange(input: {
  compareRange?: string;
  baseRef?: string;
  headRef?: string;
}): string | null {
  if (input.compareRange?.trim()) {
    return validateCompareRange(input.compareRange.trim());
  }
  const baseRef = validateGitToken("baseRef", input.baseRef || null);
  const headRef = validateGitToken("headRef", input.headRef || null);

  if (baseRef && headRef) {
    return validateCompareRange(`${baseRef}...${headRef}`);
  }
  if (baseRef) {
    return validateCompareRange(`${baseRef}...HEAD`);
  }
  if (headRef) {
    return validateCompareRange(`HEAD...${headRef}`);
  }
  return null;
}

function parseChangedFilesFromNameStatus(input: string): string[] {
  const files: string[] = [];
  for (const rawLine of input.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;
    const parts = rawLine.split("\t").filter(Boolean);
    if (parts.length < 2) continue;
    const status = parts[0];

    if (status.startsWith("R") || status.startsWith("C")) {
      const renamedTo = parts[2];
      if (renamedTo) files.push(renamedTo);
      continue;
    }

    const file = parts[1];
    if (file) files.push(file);
  }
  return uniq(files);
}

function normalizeIncludePaths(value: string[] | undefined): string[] {
  if (!Array.isArray(value)) return [];
  return uniq(
    value
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter((item) => Boolean(item))
  );
}

function fileMatchesIncludePaths(file: string, includePaths: string[]): boolean {
  if (includePaths.length === 0) return true;
  return includePaths.some((entry) => file === entry || file.startsWith(`${entry}/`));
}

async function collectUntrackedFileSnippet(
  repoRoot: string,
  file: string,
  maxChars: number
): Promise<string> {
  const fullPath = path.join(repoRoot, file);
  const repoRootReal = await fs.realpath(repoRoot).catch(() => repoRoot);
  let stat: Awaited<ReturnType<typeof fs.lstat>> | null = null;
  try {
    stat = await fs.lstat(fullPath);
  } catch {
    return `\n--- /dev/null\n+++ b/${file}\n@@\n+[Unable to read text preview for untracked file]\n`;
  }
  if (stat.isSymbolicLink()) {
    return `\n--- /dev/null\n+++ b/${file}\n@@\n+[Skipped preview: symbolic link]\n`;
  }
  if (!stat.isFile()) {
    return `\n--- /dev/null\n+++ b/${file}\n@@\n+[Skipped non-file untracked entry]\n`;
  }
  if (stat.size > DEFAULT_MAX_UNTRACKED_FILE_SIZE) {
    return `\n--- /dev/null\n+++ b/${file}\n@@\n+[Skipped preview: file too large (${stat.size} bytes)]\n`;
  }

  const realPath = await fs.realpath(fullPath).catch(() => fullPath);
  if (realPath !== repoRootReal && !realPath.startsWith(`${repoRootReal}/`)) {
    return `\n--- /dev/null\n+++ b/${file}\n@@\n+[Skipped preview: file resolves outside repository root]\n`;
  }

  let preview = "";
  let truncated = false;
  try {
    const handle = await fs.open(fullPath, "r");
    try {
      const buffer = Buffer.alloc(maxChars + 1);
      const { bytesRead } = await handle.read(buffer, 0, maxChars + 1, 0);
      preview = buffer.toString("utf8", 0, Math.min(bytesRead, maxChars));
      truncated = bytesRead > maxChars || stat.size > bytesRead;
    } finally {
      await handle.close();
    }
  } catch {
    return `\n--- /dev/null\n+++ b/${file}\n@@\n+[Unable to read text preview for untracked file]\n`;
  }

  if (preview.includes("\u0000")) {
    return `\n--- /dev/null\n+++ b/${file}\n@@\n+[Skipped preview: file appears to be binary]\n`;
  }
  if (truncated) {
    preview = `${preview}\n...[truncated]`;
  }

  const marked = preview
    .split("\n")
    .map((line) => `+${line}`)
    .join("\n");
  return `\n--- /dev/null\n+++ b/${file}\n@@\n${marked}\n`;
}

async function collectReviewContext(input: {
  repoRoot: string;
  compareRange: string | null;
  includePaths: string[];
  maxDiffChars: number;
  maxFiles: number;
}): Promise<ReviewContext> {
  const repoRoot = input.repoRoot;
  const range = input.compareRange;
  const includePaths = normalizeIncludePaths(input.includePaths);

  const branch = await runGitCommand(repoRoot, ["rev-parse", "--abbrev-ref", "HEAD"]).catch(() => "unknown");
  const statusRaw = await runGitCommand(repoRoot, ["status", "--short"]).catch(() => "");
  const statusShort = normalizeStatusShort(statusRaw, includePaths);

  let nameStatus = "";
  let diff = "";
  const diffArgs = ["diff", "--no-color", "--unified=3"];
  const nameArgs = ["diff", "--no-color", "--name-status"];
  const pathspecArgs = includePaths.length > 0 ? ["--", ...includePaths] : [];

  if (range) {
    nameStatus = await runGitCommand(repoRoot, [...nameArgs, range, ...pathspecArgs]);
    diff = await runGitCommand(repoRoot, [...diffArgs, range, ...pathspecArgs]);
  } else {
    try {
      nameStatus = await runGitCommand(repoRoot, [...nameArgs, "HEAD", ...pathspecArgs]);
      diff = await runGitCommand(repoRoot, [...diffArgs, "HEAD", ...pathspecArgs]);
    } catch {
      const stagedName = await runGitCommand(
        repoRoot,
        ["diff", "--no-color", "--name-status", "--cached", ...pathspecArgs]
      ).catch(() => "");
      const unstagedName = await runGitCommand(repoRoot, [...nameArgs, ...pathspecArgs]).catch(() => "");
      nameStatus = [stagedName, unstagedName].filter(Boolean).join("\n");

      const stagedDiff = await runGitCommand(
        repoRoot,
        ["diff", "--no-color", "--unified=3", "--cached", ...pathspecArgs]
      ).catch(() => "");
      const unstagedDiff = await runGitCommand(repoRoot, [...diffArgs, ...pathspecArgs]).catch(() => "");
      diff = [stagedDiff, unstagedDiff].filter(Boolean).join("\n");
    }
  }

  let untrackedFiles: string[] = [];
  const untrackedPreviewChunks: string[] = [];
  if (!range) {
    const untracked = await runGitCommand(repoRoot, ["ls-files", "--others", "--exclude-standard"]).catch(
      () => ""
    );
    untrackedFiles = untracked
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .filter((file) => fileMatchesIncludePaths(file, includePaths));

    for (const file of untrackedFiles.slice(0, DEFAULT_UNTRACKED_PREVIEW_FILES)) {
      // Untracked files are invisible to git diff; include a synthetic snippet.
      untrackedPreviewChunks.push(
        await collectUntrackedFileSnippet(repoRoot, file, DEFAULT_UNTRACKED_PREVIEW_CHARS)
      );
    }
  }

  const changedFiles = uniq([...parseChangedFilesFromNameStatus(nameStatus), ...untrackedFiles]).slice(
    0,
    input.maxFiles
  );

  const composedDiff = [diff, ...untrackedPreviewChunks].filter(Boolean).join("\n");
  const { text: truncatedDiff, truncated } = truncateText(composedDiff, input.maxDiffChars);

  return {
    repoRoot,
    branch: branch.trim(),
    statusShort,
    changedFiles,
    compareRange: range,
    includePaths,
    diff: truncatedDiff,
    diffTruncated: truncated,
  };
}

function buildCodeReviewPrompt(context: ReviewContext): string {
  const changedFileLines = context.changedFiles.length
    ? context.changedFiles.map((file) => `- ${file}`).join("\n")
    : "- (none)";

  return `You are a senior staff engineer performing a strict code review.

Review only correctness, security, data integrity, performance regressions, concurrency issues, and missing tests that could hide defects.
Avoid style-only feedback.

Repository: ${context.repoRoot}
Branch: ${context.branch}
Diff range: ${context.compareRange || "working tree vs HEAD"}
Scope: ${context.includePaths.length > 0 ? context.includePaths.join(", ") : "all changed files"}

Changed files:
${changedFileLines}

Git status (short):
${context.statusShort || "(clean or unavailable)"}

Patch to review:
${context.diff || "(no patch available)"}

Return ONLY valid JSON (no markdown, no prose outside JSON) with this schema:
{
  "summary": "short overall assessment",
  "overallRisk": "high|medium|low",
  "findings": [
    {
      "severity": "critical|high|medium|low",
      "file": "path/to/file",
      "line": 123,
      "title": "short issue title",
      "details": "why this is a problem and impact",
      "suggestion": "concrete fix recommendation"
    }
  ],
  "testRecommendations": ["specific test to add or run"]
}

Rules:
- If there are no meaningful defects, return findings as an empty array.
- File paths must match the changed files when possible.
- Keep each finding actionable and evidence-based.
- Do not wrap JSON in code fences.`;
}

async function persistReviewArtifact(payload: {
  review: CodeReviewResult;
  prompt: string;
  rawOutput: string;
  context: ReviewContext;
}): Promise<string> {
  const dir = path.join(DATA_DIR, ".agents", "reviews");
  await fs.mkdir(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const nonce = randomUUID().slice(0, 8);
  const filePath = path.join(dir, `code-review-${stamp}-${nonce}.json`);
  await fs.writeFile(
    filePath,
    JSON.stringify(
      {
        createdAt: new Date().toISOString(),
        review: payload.review,
        context: {
          repoRoot: payload.context.repoRoot,
          branch: payload.context.branch,
          compareRange: payload.context.compareRange,
          changedFiles: payload.context.changedFiles,
          diffTruncated: payload.context.diffTruncated,
        },
        prompt: payload.prompt,
        providerOutputRaw: payload.rawOutput,
      },
      null,
      2
    ),
    "utf8"
  );
  return filePath;
}

export async function runCodeReviewPipeline(
  input: CodeReviewPipelineInput
): Promise<CodeReviewPipelineResult> {
  const maxDiffChars =
    typeof input.maxDiffChars === "number" && input.maxDiffChars > 1_000
      ? Math.floor(input.maxDiffChars)
      : DEFAULT_MAX_DIFF_CHARS;
  const maxFiles =
    typeof input.maxFiles === "number" && input.maxFiles > 0
      ? Math.floor(input.maxFiles)
      : DEFAULT_MAX_FILES;
  const timeoutMs =
    typeof input.timeoutMs === "number" && input.timeoutMs >= 30_000
      ? Math.floor(input.timeoutMs)
      : DEFAULT_PROVIDER_TIMEOUT_MS;

  const { workdir, repoRoot } = await resolveGitWorkdir(input.workdir);
  const compareRange = buildCompareRange({
    compareRange: input.compareRange,
    baseRef: input.baseRef,
    headRef: input.headRef,
  });
  const includePaths = normalizeIncludePaths(input.includePaths);

  const context = await collectReviewContext({
    repoRoot,
    compareRange,
    includePaths,
    maxDiffChars,
    maxFiles,
  });

  if (!context.diff.trim()) {
    const review: CodeReviewResult = {
      summary: "No code changes detected for review.",
      overallRisk: "low",
      findings: [],
      testRecommendations: [],
    };
    const artifactPath =
      input.saveArtifact === false
        ? undefined
        : await persistReviewArtifact({
            review,
            prompt: "",
            rawOutput: "",
            context,
          });

    return {
      review,
      repoRoot,
      branch: context.branch,
      workdir,
      changedFiles: context.changedFiles,
      compareRange: context.compareRange,
      diffTruncated: context.diffTruncated,
      artifactPath,
    };
  }

  const prompt = buildCodeReviewPrompt(context);
  const rawOutput = await runOneShotProviderPrompt({
    providerId: input.providerId,
    prompt,
    cwd: repoRoot,
    timeoutMs,
  });
  const review = parseReviewProviderResponse(rawOutput);

  const artifactPath =
    input.saveArtifact === false
      ? undefined
      : await persistReviewArtifact({
          review,
          prompt,
          rawOutput,
          context,
        });

  return {
    review,
    repoRoot,
    branch: context.branch,
    workdir,
    changedFiles: context.changedFiles,
    compareRange: context.compareRange,
    diffTruncated: context.diffTruncated,
    artifactPath,
  };
}
