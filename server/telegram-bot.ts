/**
 * TelegramBot — bidirectional Telegram bot for Cabinet.
 *
 * Inbound: user sends message → creates Multica issue → agent executes → response sent back.
 * Commands: /start, /help, /agents, /status, /issues, /projects, /agent <name> <task>, /cancel
 * Inline keyboards: issue list with ▶ Run buttons, project drill-down.
 *
 * Uses long-polling (no webhook needed for local deployment).
 * Activated when integrations.json has telegram.bidirectional = true.
 */

import fs from "fs";
import path from "path";
import { execFile } from "child_process";
import { getLegacyIntegrationsPath } from "../src/lib/config/paths";
import type { CabinetConfig } from "../src/lib/config/schema";
import { getManagedDataDir } from "../src/lib/runtime/runtime-config";
import { readMulticaPAT, readMulticaWorkspaceId } from "./multica-auth";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const MULTICA_API_URL = (process.env.MULTICA_API_URL || "http://localhost:18080").replace(/\/+$/, "");

interface TelegramBotRuntimeOptions {
  dataDir?: string;
  cabinetConfig?: CabinetConfig;
}

function resolveDataDir(dataDir?: string): string {
  return path.resolve(dataDir ?? getManagedDataDir());
}

let currentDataDir = resolveDataDir();
let currentCabinetConfig: CabinetConfig | null = null;

function setTelegramRuntimeOptions(options?: TelegramBotRuntimeOptions): void {
  currentDataDir = resolveDataDir(options?.dataDir);
  currentCabinetConfig = options?.cabinetConfig ?? null;
}

function getTelegramRuntimeOptions(): TelegramBotRuntimeOptions {
  return currentCabinetConfig
    ? { dataDir: currentDataDir, cabinetConfig: currentCabinetConfig }
    : { dataDir: currentDataDir };
}

function getTrackingPaths(dataDir = currentDataDir): {
  trackingDir: string;
  trackingFile: string;
  workspaceIdFile: string;
  offsetFile: string;
} {
  const trackingDir = path.join(dataDir, ".agents", ".telegram");
  return {
    trackingDir,
    trackingFile: path.join(trackingDir, "tracked-issues.json"),
    workspaceIdFile: path.join(trackingDir, "workspace-id.txt"),
    offsetFile: path.join(trackingDir, "last-update-id.txt"),
  };
}

const POLL_TIMEOUT_S = 30;
const RESPONSE_POLL_MS = 10_000;
const ISSUE_TTL_MS = 2 * 60 * 60 * 1000;
const ISSUE_PREFIX_CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_ISSUES_PER_HOUR = 20;
const MAX_CHATS_PER_HOUR = 60;
const CHAT_TIMEOUT_MS = 180_000;
const WORKSPACE_RESOLVE_RETRY_MS = 5_000;
const ISSUES_PAGE_SIZE = 5;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TelegramConfig {
  enabled: boolean;
  bot_token: string;
  chat_id: string;
  bidirectional?: boolean;
  default_agent_id?: string;
  proxy?: string;
}

interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    chat: { id: number };
    text?: string;
    from?: { first_name?: string; username?: string };
  };
  callback_query?: {
    id: string;
    from: { id: number; first_name?: string };
    message?: { message_id: number; chat: { id: number } };
    data?: string;
  };
}

interface TrackedIssue {
  issueId: string;
  identifier: string;
  chatId: string;
  messageId: number;
  progressMessageId?: number;  // message with live progress bar
  lastCommentId: string | null;
  lastStatus: string;
  multicaErrorCount?: number;
  createdAt: number;
}

interface MulticaAgent {
  id: string;
  name: string;
  status?: string;
}

interface MulticaIssue {
  id: string;
  identifier: string;
  title: string;
  status: string;
  priority: string;
  assignee_type?: string | null;
  assignee_id?: string | null;
  project_id?: string | null;
}

interface MulticaProject {
  id: string;
  name: string;
  description?: string;
}

interface TelegramInlineButton {
  text: string;
  callback_data: string;
}

type TelegramInlineKeyboard = TelegramInlineButton[][];

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

let botActive = false;
let pollTimer: ReturnType<typeof setTimeout> | null = null;
let responsePollTimer: ReturnType<typeof setInterval> | null = null;
let lastUpdateId = 0;
let config: TelegramConfig | null = null;
let workspaceId = "";
let workspaceResolvePromise: Promise<string> | null = null;
let lastWorkspaceResolveAt = 0;
let trackedIssues = new Map<string, TrackedIssue>();
let issueCountThisHour = 0;
let chatCountThisHour = 0;
let hourResetTimer: ReturnType<typeof setInterval> | null = null;
let pollingResponses = false;

// Cache agents for inline keyboard callbacks
let cachedAgents: MulticaAgent[] = [];
let agentsCacheTime = 0;
let issuePrefixCache = new Map<string, { issueId: string; expiresAt: number }>();

// ---------------------------------------------------------------------------
// Telegram API helpers
// ---------------------------------------------------------------------------

function telegramUrl(method: string): string {
  return `https://api.telegram.org/bot${config!.bot_token}/${method}`;
}

async function telegramCall<T = unknown>(
  method: string,
  body?: Record<string, unknown>,
  timeoutMs = (POLL_TIMEOUT_S + 5) * 1000,
): Promise<T | null> {
  if (!config?.bot_token) return null;

  const url = telegramUrl(method);
  const payload = body ? JSON.stringify(body) : undefined;

  if (config.proxy) {
    return new Promise((resolve) => {
      const args = ["-sS", "-X", "POST", url, "-H", "Content-Type: application/json"];
      if (payload) args.push("--data-binary", payload);
      if (config!.proxy) args.unshift("--proxy", config!.proxy);
      execFile("curl", args, { timeout: timeoutMs }, (err, stdout, stderr) => {
        if (err) {
          console.error("[telegram-bot] curl " + method + " failed:", err.message);
          resolve(null);
          return;
        }

        try {
          const response = JSON.parse(stdout) as {
            ok?: boolean;
            result?: T;
            description?: string;
            error_code?: number;
          };
          if (!response.ok) {
            console.error(
              "[telegram-bot] Telegram API " + method + " failed:",
              response.error_code || "",
              response.description || stdout,
            );
            resolve(null);
            return;
          }
          resolve(response.result ?? null);
        } catch (parseErr) {
          console.error(
            "[telegram-bot] curl " + method + " returned non-JSON:",
            (parseErr as Error).message,
            stdout?.slice(0, 200) || "",
          );
          resolve(null);
        }
      });
    });
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      signal: AbortSignal.timeout(timeoutMs),
    });
    const raw = await res.text();
    let data: {
      ok?: boolean;
      result?: T;
      description?: string;
      error_code?: number;
    } | null = null;
    if (raw) {
      try {
        data = JSON.parse(raw) as {
          ok?: boolean;
          result?: T;
          description?: string;
          error_code?: number;
        };
      } catch (parseErr) {
        console.error(
          "[telegram-bot] Telegram API " + method + " returned non-JSON:",
          (parseErr as Error).message,
          raw,
        );
        return null;
      }
    }
    if (!res.ok) {
      console.error(
        "[telegram-bot] Telegram API " + method + " failed:",
        data?.error_code || res.status,
        data?.description || res.statusText || raw,
      );
      return null;
    }
    if (!data?.ok) {
      console.error(
        "[telegram-bot] Telegram API " + method + " failed:",
        data?.error_code || "",
        data?.description || "",
      );
      return null;
    }
    return data.result ?? null;
  } catch (err) {
    console.error("[telegram-bot] Telegram API " + method + " error:", (err as Error).message);
    return null;
  }
}

function splitCallbackData(data: string): [string, string] {
  const idx = data.indexOf(":");
  if (idx === -1) return [data, ""];
  return [data.slice(0, idx), data.slice(idx + 1)];
}

async function sendMessage(chatId: string | number, text: string, opts?: {
  replyTo?: number;
  keyboard?: unknown[][];
}): Promise<boolean> {
  // Telegram max message length is 4096 chars
  const safeText = text.length > 4000 ? text.slice(0, 4000) + "\n\n... (已截断)" : text;
  const body: Record<string, unknown> = {
    chat_id: chatId,
    text: safeText,
    disable_web_page_preview: true,
  };
  if (opts?.replyTo) body.reply_to_message_id = opts.replyTo;
  if (opts?.keyboard) {
    body.reply_markup = { inline_keyboard: opts.keyboard };
  }
  // Try without parse_mode first (plain text, always works)
  const result = await telegramCall("sendMessage", body, 10_000);
  return result !== null;
}

async function answerCallback(callbackId: string, text?: string): Promise<void> {
  await telegramCall("answerCallbackQuery", {
    callback_query_id: callbackId,
    text: text || "",
  });
}

async function editMessage(chatId: string | number, messageId: number, text: string, keyboard?: unknown[][]): Promise<boolean> {
  const body: Record<string, unknown> = {
    chat_id: chatId,
    message_id: messageId,
    text,
    disable_web_page_preview: true,
  };
  if (keyboard) body.reply_markup = { inline_keyboard: keyboard };
  const result = await telegramCall("editMessageText", body);
  if (!result) {
    // Fallback: send as new message if edit fails
    return sendMessage(chatId, text, { keyboard });
  }
  return true;
}

async function clearMessageKeyboard(chatId: string | number, messageId: number): Promise<boolean> {
  const result = await telegramCall("editMessageReplyMarkup", {
    chat_id: chatId,
    message_id: messageId,
    reply_markup: { inline_keyboard: [] },
  });
  return result !== null;
}

// ---------------------------------------------------------------------------
// Multica API helpers
// ---------------------------------------------------------------------------

function multicaHeaders(): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  const pat = readMulticaPAT(currentDataDir);
  if (pat) h["Authorization"] = `Bearer ${pat}`;
  const wsId = workspaceId || readMulticaWorkspaceId(currentDataDir) || process.env.MULTICA_WORKSPACE_ID || "";
  if (wsId) h["X-Workspace-ID"] = wsId;
  return h;
}

async function multicaGet<T = unknown>(urlPath: string): Promise<T | null> {
  try {
    const res = await fetch(`${MULTICA_API_URL}${urlPath}`, {
      headers: multicaHeaders(),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;
    return res.json() as Promise<T>;
  } catch {
    return null;
  }
}

async function multicaPost<T = unknown>(urlPath: string, body: Record<string, unknown>): Promise<T | null> {
  try {
    const res = await fetch(`${MULTICA_API_URL}${urlPath}`, {
      method: "POST",
      headers: multicaHeaders(),
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;
    if (res.status === 204) return null;
    return res.json() as Promise<T>;
  } catch {
    return null;
  }
}

async function multicaPut<T = unknown>(urlPath: string, body: Record<string, unknown>): Promise<T | null> {
  try {
    const res = await fetch(`${MULTICA_API_URL}${urlPath}`, {
      method: "PUT",
      headers: multicaHeaders(),
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;
    if (res.status === 204) return null;
    return res.json() as Promise<T>;
  } catch {
    return null;
  }
}

function cabinetAppOrigin(): string {
  return process.env.CABINET_APP_ORIGIN || "http://127.0.0.1:3000";
}

async function cabinetPost<T = unknown>(urlPath: string, body: Record<string, unknown>, timeoutMs = 10_000): Promise<T | null> {
  try {
    const res = await fetch(`${cabinetAppOrigin()}${urlPath}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) return null;
    if (res.status === 204) return null;
    return res.json() as Promise<T>;
  } catch {
    return null;
  }
}

function buildQueryString(params: URLSearchParams): string {
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

function cleanupIssuePrefixCache(now = Date.now()): void {
  for (const [prefix, entry] of issuePrefixCache) {
    if (entry.expiresAt <= now) issuePrefixCache.delete(prefix);
  }
}

function cacheIssueIdPrefix(prefix: string, issueId: string): void {
  cleanupIssuePrefixCache();
  issuePrefixCache.set(prefix, {
    issueId,
    expiresAt: Date.now() + ISSUE_PREFIX_CACHE_TTL_MS,
  });
}

function getCachedIssueIdByPrefix(prefix: string): string | null {
  cleanupIssuePrefixCache();
  const cached = issuePrefixCache.get(prefix);
  if (!cached) return null;
  if (cached.expiresAt <= Date.now()) {
    issuePrefixCache.delete(prefix);
    return null;
  }
  return cached.issueId;
}

async function getAgents(): Promise<MulticaAgent[]> {
  if (Date.now() - agentsCacheTime < 60_000 && cachedAgents.length > 0) return cachedAgents;
  const resolvedWorkspaceId = await ensureWorkspaceId();
  const params = new URLSearchParams();
  if (resolvedWorkspaceId) params.set("workspace_id", resolvedWorkspaceId);
  const agents = await multicaGet<MulticaAgent[]>(`/api/agents${buildQueryString(params)}`);
  if (agents && agents.length > 0) {
    cachedAgents = agents;
    agentsCacheTime = Date.now();
  }
  return cachedAgents;
}

/** Resolve an 8-char UUID prefix to the full issue ID. */
async function resolveIssueIdByPrefix(prefix: string): Promise<string | null> {
  const cachedIssueId = getCachedIssueIdByPrefix(prefix);
  if (cachedIssueId) return cachedIssueId;

  await ensureWorkspaceId();
  const params = new URLSearchParams();
  const wsId = workspaceId || readMulticaWorkspaceId(currentDataDir) || "";
  if (wsId) params.set("workspace_id", wsId);
  const result = await multicaGet<{ issues: MulticaIssue[] } | MulticaIssue[]>(
    `/api/issues${buildQueryString(params)}`,
  );
  const issues: MulticaIssue[] = Array.isArray(result) ? result : result?.issues || [];
  const match = issues.find((i) => i.id.startsWith(prefix));
  if (match) cacheIssueIdPrefix(prefix, match.id);
  return match?.id || null;
}

/** Resolve an 8-char UUID prefix to the full agent ID from cache. */
async function resolveAgentIdByPrefix(prefix: string): Promise<string | null> {
  const agents = await getAgents();
  const match = agents.find((a) => a.id.startsWith(prefix));
  return match?.id || null;
}

// ---------------------------------------------------------------------------
// Tracking persistence
// ---------------------------------------------------------------------------

function saveTracking(): void {
  try {
    const { trackingDir, trackingFile } = getTrackingPaths();
    fs.mkdirSync(trackingDir, { recursive: true });
    const data = Object.fromEntries(trackedIssues);
    fs.writeFileSync(trackingFile, JSON.stringify(data, null, 2), "utf-8");
  } catch { /* ignore */ }
}

function loadTracking(): void {
  try {
    const { trackingFile } = getTrackingPaths();
    const raw = fs.readFileSync(trackingFile, "utf-8");
    const data = JSON.parse(raw) as Record<string, TrackedIssue>;
    trackedIssues = new Map(Object.entries(data));
    const now = Date.now();
    for (const [id, t] of trackedIssues) {
      if (now - t.createdAt > ISSUE_TTL_MS) trackedIssues.delete(id);
    }
  } catch {
    trackedIssues = new Map();
  }
}

function saveLastUpdateId(): void {
  try {
    const { trackingDir, offsetFile } = getTrackingPaths();
    fs.mkdirSync(trackingDir, { recursive: true });
    fs.writeFileSync(offsetFile, String(lastUpdateId), "utf-8");
  } catch { /* ignore */ }
}

function loadLastUpdateId(): void {
  try {
    const { offsetFile } = getTrackingPaths();
    const raw = fs.readFileSync(offsetFile, "utf-8").trim();
    const parsed = parseInt(raw, 10);
    if (Number.isFinite(parsed) && parsed > 0) lastUpdateId = parsed;
  } catch { /* ignore */ }
}

function persistWorkspaceId(nextWorkspaceId: string): void {
  if (!nextWorkspaceId) return;
  try {
    const { trackingDir, workspaceIdFile } = getTrackingPaths();
    fs.mkdirSync(trackingDir, { recursive: true });
    fs.writeFileSync(workspaceIdFile, nextWorkspaceId, "utf-8");
  } catch {
    // ignore
  }
}

// ---------------------------------------------------------------------------
// Config loading
// ---------------------------------------------------------------------------

function loadConfig(): TelegramConfig | null {
  if (currentCabinetConfig) {
    return currentCabinetConfig.integrations.notifications.telegram;
  }

  try {
    const raw = fs.readFileSync(getLegacyIntegrationsPath(currentDataDir), "utf-8");
    const json = JSON.parse(raw) as {
      notifications?: {
        telegram?: TelegramConfig;
      };
    };
    return json.notifications?.telegram || null;
  } catch {
    return null;
  }
}

async function resolveWorkspaceId(): Promise<string> {
  if (process.env.MULTICA_WORKSPACE_ID) return process.env.MULTICA_WORKSPACE_ID;
  const workspaces = await multicaGet<Array<{ id: string }>>("/api/workspaces");
  return workspaces?.[0]?.id || "";
}

async function ensureWorkspaceId(force = false): Promise<string> {
  if (workspaceId) return workspaceId;

  const persistedWorkspaceId = readMulticaWorkspaceId(currentDataDir);
  if (persistedWorkspaceId) {
    workspaceId = persistedWorkspaceId;
    return workspaceId;
  }

  if (process.env.MULTICA_WORKSPACE_ID) {
    workspaceId = process.env.MULTICA_WORKSPACE_ID;
    persistWorkspaceId(workspaceId);
    return workspaceId;
  }

  if (workspaceResolvePromise) return workspaceResolvePromise;

  const now = Date.now();
  if (!force && now - lastWorkspaceResolveAt < WORKSPACE_RESOLVE_RETRY_MS) {
    return "";
  }
  lastWorkspaceResolveAt = now;

  workspaceResolvePromise = (async () => {
    const resolved = await resolveWorkspaceId();
    if (resolved) {
      workspaceId = resolved;
      persistWorkspaceId(resolved);
    }
    return workspaceId;
  })().finally(() => {
    workspaceResolvePromise = null;
  });

  return workspaceResolvePromise;
}

// ---------------------------------------------------------------------------
// Status emoji helpers
// ---------------------------------------------------------------------------

const STATUS_EMOJI: Record<string, string> = {
  backlog: "📥", todo: "📋", in_progress: "🔄", in_review: "👀",
  done: "✅", blocked: "🚫", cancelled: "❌",
};

const STATUS_LABEL: Record<string, string> = {
  backlog: "待规划",
  todo: "待办",
  in_progress: "进行中",
  in_review: "审核中",
  done: "已完成",
  blocked: "阻塞",
  cancelled: "已取消",
};

const PRIORITY_LABEL: Record<string, string> = {
  urgent: "紧急",
  high: "高优先级",
  medium: "中优先级",
  low: "低优先级",
  none: "无优先级",
};

function isCompletedIssue(status: string): boolean {
  return status === "done" || status === "cancelled";
}

/** Build a live progress bar string. */
function buildProgressBar(identifier: string, elapsedMs: number, status: string): string {
  const elapsed = Math.round(elapsedMs / 1000);
  const min = Math.floor(elapsed / 60);
  const sec = elapsed % 60;
  const timeStr = min > 0 ? `${min}分${sec}秒` : `${sec}秒`;

  // Animated progress bar — cycles every 3 seconds
  const cycle = Math.floor(elapsed / 3) % 4;
  const frames = ["⣾", "⣽", "⣻", "⢿"];
  const spinner = frames[cycle];

  const statusLabel = status === "in_progress" ? "执行中" : status === "in_review" ? "审核中" : getStatusLabel(status);

  return `${spinner} ${identifier} ${statusLabel}\n⏱ ${timeStr}`;
}
function getStatusLabel(status: string): string {
  return STATUS_LABEL[status] || status;
}

function getPriorityLabel(priority: string): string {
  return PRIORITY_LABEL[priority] || priority || "无优先级";
}

function getAssigneeLabel(issue: MulticaIssue): string {
  if (!issue.assignee_id) return "未指派";
  if (issue.assignee_type === "agent") {
    return cachedAgents.find((agent) => agent.id === issue.assignee_id)?.name || "Agent";
  }
  return "成员";
}

function chunkButtons(buttons: TelegramInlineButton[], size: number): TelegramInlineKeyboard {
  const rows: TelegramInlineKeyboard = [];
  for (let i = 0; i < buttons.length; i += size) {
    rows.push(buttons.slice(i, i + size));
  }
  return rows;
}

function getIssuesEmptyText(openOnly: boolean): string {
  return openOnly ? "📋 没有待办任务\n\n发送 /issues all 查看全部" : "📋 没有任何任务";
}

function buildIssuesMessage(
  issues: MulticaIssue[],
  requestedOffset: number,
  openOnly: boolean,
): { text: string; keyboard: TelegramInlineKeyboard } {
  const pageTotal = Math.max(1, Math.ceil(issues.length / ISSUES_PAGE_SIZE));
  const maxOffset = Math.max(0, (pageTotal - 1) * ISSUES_PAGE_SIZE);
  const offset = Math.min(Math.max(0, requestedOffset), maxOffset);
  const page = issues.slice(offset, offset + ISSUES_PAGE_SIZE);
  const pageIndex = Math.floor(offset / ISSUES_PAGE_SIZE) + 1;

  const header = openOnly
    ? `📋 待办任务 · 第${pageIndex}页/共${pageTotal}页 (${issues.length}条)`
    : `📋 全部任务 · 第${pageIndex}页/共${pageTotal}页 (${issues.length}条)`;

  const lines = [header, ""];
  const actionButtons: TelegramInlineButton[] = [];

  for (const issue of page) {
    lines.push(
      `${STATUS_EMOJI[issue.status] || "⚪"} ${issue.identifier} ${issue.title}`,
      `   👤 ${getAssigneeLabel(issue)} · ${getStatusLabel(issue.status)}`,
    );

    if (!isCompletedIssue(issue.status)) {
      actionButtons.push({ text: `▶️ ${issue.identifier}`, callback_data: `run:${issue.id}` });
    }
    actionButtons.push({ text: `👀 ${issue.identifier}`, callback_data: `view:${issue.id}` });
  }

  const keyboard = chunkButtons(actionButtons, 2);
  const navRow: TelegramInlineButton[] = [];
  const filterName = openOnly ? "open" : "all";

  if (offset > 0) {
    navRow.push({
      text: "◀️ 上一页",
      callback_data: `issues:${filterName}:more:${Math.max(0, offset - ISSUES_PAGE_SIZE)}`,
    });
  }
  if (offset + ISSUES_PAGE_SIZE < issues.length) {
    navRow.push({
      text: `下一页 ▶️ (${issues.length - offset - ISSUES_PAGE_SIZE})`,
      callback_data: `issues:${filterName}:more:${offset + ISSUES_PAGE_SIZE}`,
    });
  }
  if (navRow.length > 0) keyboard.push(navRow);
  if (openOnly) {
    keyboard.push([{ text: "🔍 全部", callback_data: "issues:all" }]);
  }

  return { text: lines.join("\n"), keyboard };
}


// ---------------------------------------------------------------------------
// Command handlers
// ---------------------------------------------------------------------------

async function handleCommand(chatId: number, text: string, messageId: number): Promise<void> {
  const parts = text.trim().split(/\s+/);
  const cmd = parts[0].toLowerCase().replace(/@\w+$/, ""); // strip @botname suffix

  switch (cmd) {
    case "/start":
      await sendMessage(chatId, [
        "👋 *欢迎使用 Cabinet Bot*",
        "",
        "💬 *聊天模式*（默认）",
        "直接发消息 → 和默认 Agent 聊天",
        "",
        "📋 *任务模式*",
        "`/task <内容>` → 创建可跟踪任务",
        "`/agent <名称> <任务>` → 指派到特定 Agent",
        "",
        "*浏览*",
        "/issues /projects /status /agents",
        "",
        "/help — 完整帮助",
      ].join("\n"));
      break;

    case "/help":
      await sendMessage(chatId, [
        "📖 *命令帮助*",
        "",
        "*聊天（默认）*",
        "直接发文字 → 一次性 Agent 聊天（无记忆）",
        "",
        "*任务*",
        "`/task 调研竞品` → 创建跟踪任务",
        "`/agent 二狗 调研竞品` → 指定 Agent",
        "",
        "*浏览任务*",
        "/issues → 待办任务列表",
        "/issues all → 所有状态",
        "/projects → 按项目浏览",
        "",
        "*管理*",
        "/agents → 智能体列表",
        "/status → 跟踪中的任务",
        "/cancel <编号> → 取消跟踪",
      ].join("\n"));
      break;

    case "/agents":
      await handleAgentsList(chatId);
      break;

    case "/status":
      await handleStatus(chatId);
      break;

    case "/agent":
      await handleAgentTask(chatId, parts.slice(1), messageId);
      break;

    case "/task": {
      const taskText = parts.slice(1).join(" ").trim();
      if (!taskText) {
        await sendMessage(chatId, "用法: `/task <任务描述>`\n例: `/task 调研竞品定价`");
      } else {
        await createAndTrackIssue(chatId, messageId, taskText);
      }
      break;
    }

    case "/cancel":
      await handleCancel(chatId, parts[1]);
      break;

    case "/issues":
      await handleIssuesList(chatId, parts[1]);
      break;

    case "/projects":
      await handleProjectsList(chatId);
      break;

    default:
      await sendMessage(chatId, `未知命令: ${cmd}\n输入 /help 查看帮助`);
  }
}

// ---------------------------------------------------------------------------
// /issues — list issues with inline keyboard buttons
// ---------------------------------------------------------------------------

async function handleIssuesList(chatId: number, filter?: string, offset = 0): Promise<void> {
  const openOnly = filter !== "all";
  const resolvedWorkspaceId = await ensureWorkspaceId();
  const params = new URLSearchParams();
  if (resolvedWorkspaceId) params.set("workspace_id", resolvedWorkspaceId);
  if (openOnly) params.set("open_only", "true");
  const url = `/api/issues?${params}`;
  const result = await multicaGet<{ issues: MulticaIssue[] } | MulticaIssue[]>(url);
  if (result === null) {
    await sendMessage(chatId, "❌ 无法连接 Multica 服务");
    return;
  }

  const issues: MulticaIssue[] = Array.isArray(result) ? result : result?.issues || [];
  if (issues.length === 0) {
    await sendMessage(chatId, getIssuesEmptyText(openOnly));
    return;
  }

  await getAgents();
  const message = buildIssuesMessage(issues, offset, openOnly);
  await sendMessage(chatId, message.text, { keyboard: message.keyboard });
}

/**
 * Edit an existing message to show a different issues page.
 * Uses telegramCall("editMessageText") directly to replace content + keyboard in-place.
 */
async function handleIssuesEdit(chatId: number, messageId: number, filter?: string, offset = 0): Promise<void> {
  const openOnly = filter !== "all";
  const resolvedWorkspaceId = await ensureWorkspaceId();
  const params = new URLSearchParams();
  if (resolvedWorkspaceId) params.set("workspace_id", resolvedWorkspaceId);
  if (openOnly) params.set("open_only", "true");
  const result = await multicaGet<{ issues: MulticaIssue[] } | MulticaIssue[]>(`/api/issues?${params}`);
  if (result === null) {
    const editResult = await telegramCall("editMessageText", { chat_id: chatId, message_id: messageId, text: "❌ 无法连接 Multica 服务" }, 10_000);
    if (editResult === null) {
      console.error("[telegram-bot] editMessageText failed in handleIssuesEdit (service unavailable), fallback to sendMessage");
      await sendMessage(chatId, "❌ 无法连接 Multica 服务");
    }
    return;
  }
  const issues: MulticaIssue[] = Array.isArray(result) ? result : result?.issues || [];
  if (issues.length === 0) {
    const emptyText = getIssuesEmptyText(openOnly);
    const editResult = await telegramCall("editMessageText", { chat_id: chatId, message_id: messageId, text: emptyText }, 10_000);
    if (editResult === null) {
      console.error("[telegram-bot] editMessageText failed in handleIssuesEdit (empty issues), fallback to sendMessage");
      await sendMessage(chatId, emptyText);
    }
    return;
  }

  await getAgents();
  const message = buildIssuesMessage(issues, offset, openOnly);

  console.log("[telegram-bot] editMessageText: text=" + message.text.slice(0, 50));
  const editResult = await telegramCall("editMessageText", {
    chat_id: chatId,
    message_id: messageId,
    text: message.text,
    disable_web_page_preview: true,
    reply_markup: { inline_keyboard: message.keyboard },
  }, 10_000);
  console.log("[telegram-bot] editMessageText result: " + (editResult ? "ok" : "null"));
  if (editResult === null) {
    console.error("[telegram-bot] editMessageText failed in handleIssuesEdit, fallback to sendMessage");
    await sendMessage(chatId, message.text, { keyboard: message.keyboard });
  }
}

// ---------------------------------------------------------------------------
// /projects — list projects with drill-down buttons
// ---------------------------------------------------------------------------

async function handleProjectsList(chatId: number): Promise<void> {
  const resolvedWorkspaceId = await ensureWorkspaceId();
  const params = new URLSearchParams();
  if (resolvedWorkspaceId) params.set("workspace_id", resolvedWorkspaceId);
  const projects = await multicaGet<MulticaProject[]>(`/api/projects${buildQueryString(params)}`);
  if (projects === null) {
    await sendMessage(chatId, "❌ 无法连接 Multica 服务");
    return;
  }

  if (projects.length === 0) {
    // No projects — fall back to showing all issues
    await sendMessage(chatId, "暂无项目。显示所有任务：");
    await handleIssuesList(chatId);
    return;
  }

  const lines: string[] = [];
  const keyboard: unknown[][] = [];

  for (const project of projects) {
    lines.push(`📁 *${project.name}*${project.description ? ` — ${project.description.slice(0, 50)}` : ""}`);
    keyboard.push([
      { text: `📁 ${project.name}`, callback_data: `proj:${project.id}` },
    ]);
  }

  // Add "all issues" button
  keyboard.push([{ text: "📋 全部任务", callback_data: "proj:all" }]);

  await sendMessage(chatId, `📁 *项目列表*\n\n${lines.join("\n")}`, { keyboard });
}

// ---------------------------------------------------------------------------
// Callback query handlers — inline button clicks
// ---------------------------------------------------------------------------

async function handleCallback(query: NonNullable<TelegramUpdate["callback_query"]>): Promise<void> {
  const data = query.data || "";
  const chatId = query.message?.chat.id;
  const messageId = query.message?.message_id;
  if (!chatId || !messageId) {
    await answerCallback(query.id);
    return;
  }

  const [action, entityId] = splitCallbackData(data);

  switch (action) {
    case "run":
      await handleRunIssue(query.id, chatId, messageId, entityId);
      break;

    case "rw": {
      // Format: rw:<issueIdPrefix8>:<agentIdPrefix8>
      const [issuePrefix, agentPrefix] = splitCallbackData(entityId);
      // Resolve short prefixes to full UUIDs
      const fullIssueId = await resolveIssueIdByPrefix(issuePrefix);
      const fullAgentId = await resolveAgentIdByPrefix(agentPrefix);
      if (!fullIssueId || !fullAgentId) {
        await answerCallback(query.id, "无法解析任务或智能体");
        break;
      }
      await handleRunIssueWithAgent(query.id, chatId, messageId, fullIssueId, fullAgentId);
      break;
    }

    case "view":
      await handleViewIssue(query.id, chatId, entityId);
      break;

    case "done":
      await handleMarkDone(query.id, chatId, messageId, entityId);
      break;

    case "proj":
      if (entityId === "back") {
        await answerCallback(query.id);
        await clearMessageKeyboard(chatId, messageId);
        await handleProjectsList(chatId);
      } else {
        await handleProjectIssues(query.id, chatId, messageId, entityId);
      }
      break;

    case "issues": {
      await answerCallback(query.id);
      if (entityId === "all") {
        await clearMessageKeyboard(chatId, messageId);
        await handleIssuesList(chatId, "all", 0);
      } else if (entityId === "back") {
        await clearMessageKeyboard(chatId, messageId);
        await handleIssuesList(chatId);
      } else if (entityId.startsWith("more:")) {
        const off = parseInt(entityId.replace("more:", ""), 10) || 0;
        await handleIssuesEdit(chatId, messageId, undefined, off);
      } else {
        const [filterName, subAction, offsetValue] = entityId.split(":");
        if (subAction === "more") {
          const off = parseInt(offsetValue || "0", 10) || 0;
          const filter = filterName === "all" ? "all" : undefined;
          await handleIssuesEdit(chatId, messageId, filter, off);
        }
      }
      break;
    }

    default:
      await answerCallback(query.id, "未知操作");
  }
}

/** Edit an existing message to show issues page (for pagination/back). */
// handleIssuesPage removed — pagination now uses handleIssuesList with offset

async function handleRunIssue(callbackId: string, chatId: number, messageId: number, issueId: string): Promise<void> {
  // Ensure workspace is resolved, then fetch agents
  await ensureWorkspaceId(true);
  // Clear cache to get fresh agents
  agentsCacheTime = 0;
  const agents = await getAgents();
  if (agents.length === 0) {
    console.error("[telegram-bot] handleRunIssue: no agents found, workspaceId=" + workspaceId);
    await answerCallback(callbackId, "没有可用智能体（请检查 Multica 连接）");
    return;
  }

  const issue = await multicaGet<MulticaIssue>(`/api/issues/${issueId}`);
  if (!issue) {
    await answerCallback(callbackId, "任务不存在");
    return;
  }

  if (agents.length === 1) {
    // Only one agent — run directly
    await handleRunIssueWithAgent(callbackId, chatId, messageId, issueId, agents[0].id);
    return;
  }

  cacheIssueIdPrefix(issueId.slice(0, 8), issueId);

  // Multiple agents — send NEW message with selection
  const keyboard = agents.map((a) => [
    { text: `🤖 ${a.name}`, callback_data: `rw:${issueId.slice(0, 8)}:${a.id.slice(0, 8)}` },
  ]);

  await answerCallback(callbackId);
  await sendMessage(
    chatId,
    `🤖 选择智能体执行 ${issue.identifier}\n${issue.title}`,
    { keyboard },
  );
}

async function handleRunIssueWithAgent(
  callbackId: string, chatId: number, messageId: number,
  issueId: string, agentId: string,
): Promise<void> {
  await answerCallback(callbackId, "⏳ 正在启动...");

  const agents = await getAgents();
  const agent = agents.find((a) => a.id === agentId);
  const agentName = agent?.name || "Agent";
  const originalIssue = await multicaGet<MulticaIssue>(`/api/issues/${issueId}`);

  // First clear assignee, then re-assign — this triggers EnqueueTaskForIssue
  // because the Multica backend only enqueues when assignee CHANGES.
  const cleared = await multicaPut<MulticaIssue>(`/api/issues/${issueId}`, {
    assignee_type: null,
    assignee_id: null,
    status: "todo",
  });
  if (cleared === null) {
    await sendMessage(chatId, "❌ 启动失败 — 无法清空当前指派");
    return;
  }
  const updated = await multicaPut<MulticaIssue>(`/api/issues/${issueId}`, {
    assignee_type: "agent",
    assignee_id: agentId,
    status: "todo",
  });

  if (!updated) {
    let recoveryFailed = !originalIssue;
    if (originalIssue) {
      const restored = await multicaPut<MulticaIssue>(`/api/issues/${issueId}`, {
        assignee_type: originalIssue.assignee_type ?? null,
        assignee_id: originalIssue.assignee_id ?? null,
        status: originalIssue.status,
      });
      recoveryFailed = restored === null;
    }

    await sendMessage(
      chatId,
      recoveryFailed
        ? "❌ 启动失败 — Multica 服务不可用。任务状态可能不一致，请在 Multica 中检查"
        : "❌ 启动失败 — Multica 服务不可用，已尝试恢复原指派",
    );
    return;
  }

  // Track for response polling
  trackedIssues.set(issueId, {
    issueId,
    identifier: updated.identifier,
    chatId: String(chatId),
    messageId,
    lastCommentId: null,
    lastStatus: "todo",
    createdAt: Date.now(),
  });
  saveTracking();

  await sendMessage(
    chatId,
    `▶️ ${updated.identifier} 已启动\n${updated.title}\n🤖 ${agentName}\n\n完成后通知你`,
  );
}

// Debounce: track last viewed issue to prevent duplicate sends
let lastViewedIssueId = "";
let lastViewedAt = 0;

async function handleViewIssue(callbackId: string, chatId: number, issueId: string): Promise<void> {
  await answerCallback(callbackId);

  // Debounce: skip if same issue viewed within 3 seconds
  const now = Date.now();
  if (issueId === lastViewedIssueId && now - lastViewedAt < 3000) return;
  lastViewedIssueId = issueId;
  lastViewedAt = now;

  await ensureWorkspaceId(true);
  const issue = await multicaGet<MulticaIssue>(`/api/issues/${issueId}`);
  if (!issue) {
    await sendMessage(chatId, "❌ 无法获取任务详情（请稍后重试）");
    return;
  }

  const agents = await getAgents();
  const agentName = issue.assignee_type === "agent"
    ? agents.find((a) => a.id === issue.assignee_id)?.name || "Agent"
    : getAssigneeLabel(issue);

  const lines = [
    `${STATUS_EMOJI[issue.status] || "⚪"} ${issue.identifier} | ${getStatusLabel(issue.status)}`,
    issue.title,
    `👤 ${agentName} · ${getPriorityLabel(issue.priority)}`,
  ];

  // Get latest comment preview
  const comments = await multicaGet<Array<{
    content: string; author_type: string; author_name?: string;
  }>>(`/api/issues/${issueId}/comments`);

  if (comments && comments.length > 0) {
    const last = comments[comments.length - 1];
    const content = last.content.trim();
    const preview = content.length > 300 ? content.slice(0, 300) + "..." : content;
    lines.push("", `💬 最新回复 (${last.author_name || "Agent"}):`, preview || "（空）");
  }

  // Action buttons in one row
  const actions: TelegramInlineButton[] = [];
  if (!isCompletedIssue(issue.status)) {
    actions.push({ text: "▶️ 运行", callback_data: `run:${issue.id}` });
    actions.push({ text: "✅ 完成", callback_data: `done:${issue.id}` });
  }
  actions.push({ text: "◀️ 返回", callback_data: "issues:back" });
  actions.push({ text: "📁 项目", callback_data: "proj:back" });

  await sendMessage(chatId, lines.join("\n"), { keyboard: [actions] });
}

async function handleMarkDone(callbackId: string, chatId: number, messageId: number, issueId: string): Promise<void> {
  const updated = await multicaPut<MulticaIssue>(`/api/issues/${issueId}`, { status: "done" });
  if (!updated) {
    await answerCallback(callbackId, "❌ 操作失败");
    return;
  }

  await answerCallback(callbackId, "✅ 已完成");
  await sendMessage(chatId, `✅ ${updated.identifier} 已完成\n${updated.title}`);

  // Remove from tracking
  trackedIssues.delete(issueId);
  saveTracking();
}

async function handleProjectIssues(callbackId: string, chatId: number, messageId: number, projectId: string): Promise<void> {
  await answerCallback(callbackId);

  const resolvedWorkspaceId = await ensureWorkspaceId();
  const params = new URLSearchParams();
  if (resolvedWorkspaceId) params.set("workspace_id", resolvedWorkspaceId);
  params.set("open_only", "true");
  const issueUrl = `/api/issues?${params}`;
  let issues: MulticaIssue[];

  if (projectId === "all") {
    const result = await multicaGet<{ issues: MulticaIssue[] } | MulticaIssue[]>(issueUrl);
    if (result === null) {
      await editMessage(chatId, messageId, "❌ 无法连接 Multica 服务");
      return;
    }
    issues = Array.isArray(result) ? result : result?.issues || [];
  } else {
    const result = await multicaGet<{ issues: MulticaIssue[] } | MulticaIssue[]>(issueUrl);
    if (result === null) {
      await editMessage(chatId, messageId, "❌ 无法连接 Multica 服务");
      return;
    }
    const all = Array.isArray(result) ? result : result?.issues || [];
    issues = all.filter((i) => i.project_id === projectId);
  }

  if (issues.length === 0) {
    await editMessage(chatId, messageId, "📋 该项目暂无待办任务", [
      [{ text: "◀️ 返回", callback_data: "proj:back" }],
    ]);
    return;
  }

  const keyboard = buildIssueKeyboard(issues, 0);
  keyboard.push([{ text: "◀️ 返回项目", callback_data: "proj:back" }]);

  await editMessage(chatId, messageId, `📋 项目任务 (${issues.length})`, keyboard);
}

/** Build compact issue keyboard rows starting from offset. */
function buildIssueKeyboard(issues: MulticaIssue[], offset: number): unknown[][] {
  const page = issues.slice(offset, offset + 8);
  const keyboard: unknown[][] = [];

  for (const issue of page) {
    const s = STATUS_EMOJI[issue.status] || "⚪";
    const title = issue.title.length > 22 ? issue.title.slice(0, 22) + ".." : issue.title;
    const isDone = ["done", "cancelled"].includes(issue.status);

    // Every issue gets: title button + ▶️ run (unless done)
    if (isDone) {
      keyboard.push([
        { text: `${s} ${issue.identifier} ${title}`, callback_data: `view:${issue.id}` },
      ]);
    } else {
      keyboard.push([
        { text: `${s} ${issue.identifier} ${title}`, callback_data: `view:${issue.id}` },
        { text: "▶️", callback_data: `run:${issue.id}` },
      ]);
    }
  }

  return keyboard;
}

// ---------------------------------------------------------------------------
// Agent list / status / task creation (unchanged)
// ---------------------------------------------------------------------------

async function handleAgentsList(chatId: number): Promise<void> {
  const agents = await getAgents();
  if (agents.length === 0) {
    await sendMessage(chatId, "暂无可用智能体。请先在 Multica 中创建 Agent。");
    return;
  }
  const lines = agents.map((a, i) => `${i + 1}. *${a.name}* — ${a.status || "idle"}`);
  await sendMessage(chatId, `🤖 *可用智能体*\n\n${lines.join("\n")}`);
}

async function handleStatus(chatId: number): Promise<void> {
  if (trackedIssues.size === 0) {
    await sendMessage(chatId, "✅ 当前没有跟踪中的任务");
    return;
  }
  const lines: string[] = [];
  for (const t of trackedIssues.values()) {
    const age = Math.round((Date.now() - t.createdAt) / 60000);
    const s = STATUS_EMOJI[t.lastStatus] || "⚪";
    const label = getStatusLabel(t.lastStatus);
    lines.push(`${s} ${t.identifier} · ${label} · ${age}分钟前`);
  }
  await sendMessage(chatId, `📋 跟踪中的任务 (${trackedIssues.size})\n\n${lines.join("\n")}`);
}

async function handleAgentTask(chatId: number, args: string[], messageId: number): Promise<void> {
  if (args.length < 2) {
    await sendMessage(chatId, "用法: /agent <名称> <任务描述>\n例如: /agent 二狗 调研竞品定价");
    return;
  }
  const agentName = args[0];
  const taskText = args.slice(1).join(" ");
  const agents = await getAgents();
  const agent = agents.find((a) => a.name === agentName || a.name.includes(agentName));
  if (!agent) {
    await sendMessage(chatId, `找不到智能体「${agentName}」\n输入 /agents 查看列表`);
    return;
  }
  await createAndTrackIssue(chatId, messageId, taskText, agent.id, agent.name);
}

async function handleCancel(chatId: number, identifier?: string): Promise<void> {
  if (!identifier) {
    await sendMessage(chatId, "用法: /cancel <任务编号>\n例如: /cancel SWO-25");
    return;
  }
  const entry = [...trackedIssues.entries()].find(([, t]) => t.identifier === identifier);
  if (!entry) {
    await sendMessage(chatId, `未找到任务 ${identifier}`);
    return;
  }
  if (entry[1].chatId !== String(chatId)) {
    await sendMessage(chatId, `无权操作 ${identifier}`);
    return;
  }
  trackedIssues.delete(entry[0]);
  saveTracking();
  await sendMessage(chatId, `已停止跟踪 ${identifier}`);
}

// ---------------------------------------------------------------------------
// Issue creation
// ---------------------------------------------------------------------------

async function chatWithAgent(chatId: number, messageId: number, text: string): Promise<void> {
  if (chatCountThisHour >= MAX_CHATS_PER_HOUR) {
    await sendMessage(chatId, `⚠️ 每小时最多 ${MAX_CHATS_PER_HOUR} 条聊天，请稍后再试`, { replyTo: messageId });
    return;
  }
  chatCountThisHour++;

  const thinkingRes = await telegramCall<{ result?: { message_id: number } }>("sendMessage", {
    chat_id: chatId,
    text: "⏳ 思考中…",
    reply_to_message_id: messageId,
  }, 10_000);
  const thinkingMsgId = thinkingRes?.result?.message_id;

  const result = await cabinetPost<{ ok: boolean; output?: string; message?: string }>(
    "/api/agents/headless",
    { prompt: text },
    CHAT_TIMEOUT_MS,
  );

  let replyText: string;
  if (!result) {
    replyText = "❌ Agent 超时或 Cabinet 服务不可用";
  } else if (!result.ok) {
    replyText = `❌ ${result.message || "Agent 执行失败"}`;
  } else {
    const output = (result.output || "").trim();
    replyText = output.length > 0 ? output : "(agent 无输出)";
    if (replyText.length > 4000) {
      replyText = replyText.slice(0, 3990) + "\n… (已截断)";
    }
  }

  if (thinkingMsgId) {
    const edited = await editMessage(chatId, thinkingMsgId, replyText);
    if (!edited) {
      await sendMessage(chatId, replyText, { replyTo: messageId }).catch(() => {});
    }
  } else {
    await sendMessage(chatId, replyText, { replyTo: messageId }).catch(() => {});
  }
}

async function createAndTrackIssue(
  chatId: number, messageId: number, text: string,
  agentId?: string, agentName?: string,
): Promise<void> {
  try {
    if (issueCountThisHour >= MAX_ISSUES_PER_HOUR) {
      await sendMessage(chatId, "⚠️ 每小时最多创建 20 个任务，请稍后再试", { replyTo: messageId });
      return;
    }

    const assigneeId = agentId || config?.default_agent_id;
    if (!assigneeId) {
      await sendMessage(chatId, "请先配置默认智能体或使用 /agent 指定", { replyTo: messageId });
      return;
    }
    const resolvedWorkspaceId = await ensureWorkspaceId();
    const params = new URLSearchParams();
    if (resolvedWorkspaceId) params.set("workspace_id", resolvedWorkspaceId);

    const payload: Record<string, unknown> = {
      title: text.slice(0, 120),
      description: text.length > 120 ? text : undefined,
      status: "todo",
      priority: "medium",
    };
    if (assigneeId) {
      payload.assignee_type = "agent";
      payload.assignee_id = assigneeId;
    }

    const issue = await multicaPost<{ id: string; identifier: string }>(
      `/api/issues${buildQueryString(params)}`,
      payload,
    );
    if (!issue) {
      await sendMessage(chatId, "❌ 创建任务失败 — Multica 服务不可用", { replyTo: messageId });
      return;
    }

    issueCountThisHour++;
    trackedIssues.set(issue.id, {
      issueId: issue.id,
      identifier: issue.identifier,
      chatId: String(chatId),
      messageId,
      lastCommentId: null,
      lastStatus: "todo",
      createdAt: Date.now(),
    });
    saveTracking();

    const assignedTo = agentName || (assigneeId ? "Agent" : "未指派");
    await sendMessage(
      chatId,
      `✅ 已创建 *${issue.identifier}*\n指派给: ${assignedTo}\n\n任务完成后会在这里通知你。`,
      { replyTo: messageId },
    );
  } catch (err) {
    console.error("[telegram-bot] create issue error:", (err as Error).message);
    await sendMessage(chatId, "❌ 创建任务失败，请稍后重试", { replyTo: messageId }).catch(() => {});
  }
}

// ---------------------------------------------------------------------------
// Response polling
// ---------------------------------------------------------------------------

async function pollResponses(): Promise<void> {
  if (!botActive || trackedIssues.size === 0 || pollingResponses) return;
  pollingResponses = true;

  const markMulticaPollFailure = async (issueId: string, tracking: TrackedIssue): Promise<boolean> => {
    const nextErrorCount = (tracking.multicaErrorCount || 0) + 1;
    tracking.multicaErrorCount = nextErrorCount;
    if (nextErrorCount < 3) return false;

    await sendMessage(
      tracking.chatId,
      `❌ ${tracking.identifier} 跟踪已停止：连续 3 次无法连接 Multica 服务`,
      { replyTo: tracking.messageId },
    ).catch(() => {});
    trackedIssues.delete(issueId);
    saveTracking();
    return true;
  };

  try {
    const now = Date.now();
    const toRemove: string[] = [];

    for (const [issueId, tracking] of trackedIssues) {
      if (now - tracking.createdAt > ISSUE_TTL_MS) {
        await sendMessage(
          tracking.chatId,
          `⏰ ${tracking.identifier} 跟踪已超时（2小时），如需继续请重新运行`,
          { replyTo: tracking.messageId },
        ).catch(() => {});
        toRemove.push(issueId);
        continue;
      }

      try {
        const issue = await multicaGet<{ status: string }>(`/api/issues/${issueId}`);
        if (!issue) {
          if (await markMulticaPollFailure(issueId, tracking)) continue;
          continue;
        }

        tracking.multicaErrorCount = 0;
        const isTerminal = ["done", "cancelled", "blocked", "in_review"].includes(issue.status);
        const statusChanged = tracking.lastStatus !== issue.status;

        // --- Live progress bar (for non-terminal states) ---
        if (!isTerminal) {
          const progressText = buildProgressBar(tracking.identifier, now - tracking.createdAt, issue.status);

          if (!tracking.progressMessageId) {
            // First time — send progress message
            const result = await telegramCall<{ message_id: number }>("sendMessage", {
              chat_id: tracking.chatId,
              text: progressText,
              reply_to_message_id: tracking.messageId,
            }, 10_000);
            if (result?.message_id) {
              tracking.progressMessageId = result.message_id;
            }
          } else {
            // Update existing progress message in-place
            await telegramCall("editMessageText", {
              chat_id: tracking.chatId,
              message_id: tracking.progressMessageId,
              text: progressText,
            }, 10_000);
          }
        }

        // Always track status
        if (statusChanged) tracking.lastStatus = issue.status;

        // --- Track latest comment silently ---
        const comments = await multicaGet<Array<{
          id: string; content: string; author_type: string; author_name?: string;
        }>>(`/api/issues/${issueId}/comments`);
        if (comments === null) {
          if (await markMulticaPollFailure(issueId, tracking)) continue;
          continue;
        }

        tracking.multicaErrorCount = 0;
        if (comments.length > 0) {
          tracking.lastCommentId = comments[comments.length - 1].id;
        }

        // --- Terminal: update progress bar to final result ---
        if (isTerminal) {
          const lastComment = comments.length > 0
            ? comments[comments.length - 1] : null;
          const agentReply = lastComment?.author_type === "agent" ? lastComment.content : null;

          let finalText = "";
          if (issue.status === "done" || issue.status === "in_review") {
            const result = agentReply
              ? agentReply.length > 3000 ? agentReply.slice(0, 3000) + "\n\n... (已截断)" : agentReply
              : "（无回复内容）";
            finalText = `✅ ${tracking.identifier} 完成\n\n${result}`;
          } else if (issue.status === "cancelled") {
            finalText = `🚫 ${tracking.identifier} 已取消`;
          } else if (issue.status === "blocked") {
            const errMsg = agentReply ? `\n\n${agentReply.slice(0, 500)}` : "";
            finalText = `❌ ${tracking.identifier} 执行失败${errMsg}`;
          }

          if (tracking.progressMessageId) {
            // Edit the progress bar message to show final result
            await telegramCall("editMessageText", {
              chat_id: tracking.chatId,
              message_id: tracking.progressMessageId,
              text: finalText,
            }, 10_000);
          } else {
            await sendMessage(tracking.chatId, finalText, { replyTo: tracking.messageId });
          }
          toRemove.push(issueId);
        }
      } catch { /* skip */ }
    }

    for (const id of toRemove) trackedIssues.delete(id);
    if (toRemove.length > 0) saveTracking();
  } finally {
    pollingResponses = false;
  }
}

// ---------------------------------------------------------------------------
// Telegram long-polling loop
// ---------------------------------------------------------------------------

async function pollOnce(): Promise<void> {
  if (!botActive || !config) return;

  const updates = await telegramCall<TelegramUpdate[]>("getUpdates", {
    offset: lastUpdateId + 1,
    timeout: POLL_TIMEOUT_S,
    allowed_updates: ["message", "callback_query"],
  });

  if (!updates || updates.length === 0) return;

  const startingOffset = lastUpdateId;
  for (const update of updates) {
    lastUpdateId = Math.max(lastUpdateId, update.update_id);

    // Handle callback queries (inline button clicks)
    if (update.callback_query) {
      const chatId = update.callback_query.message?.chat.id;
      if (config.chat_id && chatId && String(chatId) !== String(config.chat_id)) continue;

      try {
        await handleCallback(update.callback_query);
      } catch (err) {
        console.error("[telegram-bot] callback error:", (err as Error).message, "data:", update.callback_query.data);
        await answerCallback(update.callback_query.id, "操作出错，请重试");
      }
      continue;
    }

    // Handle text messages
    const msg = update.message;
    if (!msg?.text || !msg.chat) continue;

    const chatId = msg.chat.id;
    if (config.chat_id && String(chatId) !== String(config.chat_id)) continue;

    const text = msg.text.trim();
    if (!text) continue;

    try {
      if (text.startsWith("/")) {
        await handleCommand(chatId, text, msg.message_id);
      } else {
        await chatWithAgent(chatId, msg.message_id, text);
      }
    } catch (err) {
      console.error("[telegram-bot] message error:", (err as Error).message);
      await sendMessage(chatId, `❌ 处理出错: ${(err as Error).message}`).catch(() => {});
    }
  }

  if (lastUpdateId > startingOffset) saveLastUpdateId();
}

let consecutivePollErrors = 0;

function scheduleNextPoll(): void {
  if (!botActive) return;
  // Exponential backoff on consecutive errors (429, network, etc.)
  const delay = consecutivePollErrors > 0
    ? Math.min(1000 * Math.pow(2, consecutivePollErrors), 60_000) // max 60s
    : 1000;
  pollTimer = setTimeout(async () => {
    try {
      await pollOnce();
      consecutivePollErrors = 0;
    } catch (err) {
      consecutivePollErrors++;
      console.warn(`[telegram-bot] poll error (${consecutivePollErrors}):`, (err as Error).message);
    }
    scheduleNextPoll();
  }, delay);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function startTelegramBot(options: TelegramBotRuntimeOptions = {}): Promise<void> {
  if (botActive) {
    stopTelegramBot();
  }
  setTelegramRuntimeOptions(options);
  config = loadConfig();
  if (!config?.enabled || !config?.bidirectional || !config?.bot_token) {
    console.log(
      "[telegram-bot] disabled (set integrations.notifications.telegram.bidirectional=true in cabinet config)",
    );
    return;
  }

  workspaceId = "";
  workspaceResolvePromise = null;
  lastWorkspaceResolveAt = 0;
  workspaceId = await ensureWorkspaceId(true);
  loadTracking();
  loadLastUpdateId();

  botActive = true;
  hourResetTimer = setInterval(() => {
    issueCountThisHour = 0;
    chatCountThisHour = 0;
  }, 60 * 60 * 1000);

  scheduleNextPoll();
  responsePollTimer = setInterval(() => { pollResponses().catch(() => {}); }, RESPONSE_POLL_MS);

  console.log(`[telegram-bot] started — polling for messages (chat_id: ${config.chat_id})`);
}

export function stopTelegramBot(): void {
  botActive = false;
  if (pollTimer) { clearTimeout(pollTimer); pollTimer = null; }
  if (responsePollTimer) { clearInterval(responsePollTimer); responsePollTimer = null; }
  if (hourResetTimer) { clearInterval(hourResetTimer); hourResetTimer = null; }
  saveTracking();
}

export async function reloadTelegramBot(options?: TelegramBotRuntimeOptions): Promise<void> {
  const wasActive = botActive;
  if (wasActive) stopTelegramBot();
  const nextOptions = options ?? getTelegramRuntimeOptions();
  setTelegramRuntimeOptions(nextOptions);
  config = loadConfig();
  if (config?.enabled && config?.bidirectional && config?.bot_token) {
    await startTelegramBot(nextOptions);
  } else if (wasActive) {
    console.log("[telegram-bot] stopped (config changed)");
  }
}
