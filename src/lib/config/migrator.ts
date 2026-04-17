import fs from "node:fs/promises";
import path from "node:path";
import type { Dirent } from "node:fs";
import matter from "gray-matter";
import {
  DEFAULT_CABINET_CONFIG,
  parseCabinetConfig,
  type CabinetConfig,
  type CabinetIntegrationConfig,
  type CabinetSchedule,
  type PersonaRuntimeConfig,
} from "./schema";
import {
  getAgentsDir,
  getCabinetConfigDir,
  getCabinetConfigMigratedAtPath,
  getLegacyIntegrationsPath,
  getLegacySchedulePaths,
} from "./paths";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

async function readJsonFile(filePath: string): Promise<unknown> {
  const raw = await fs.readFile(filePath, "utf8");

  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error(
      `Failed to parse legacy JSON at ${filePath}: ${(error as Error).message}`,
      { cause: error },
    );
  }
}

function mergeIntegrationServer(
  fallback: CabinetIntegrationConfig["mcp_servers"][string],
  raw: unknown,
): CabinetIntegrationConfig["mcp_servers"][string] {
  if (!isRecord(raw)) {
    return fallback;
  }

  const env = isRecord(raw.env)
    ? Object.fromEntries(
        Object.entries(raw.env).filter((entry): entry is [string, string] => typeof entry[1] === "string")
      )
    : fallback.env;

  return {
    name: typeof raw.name === "string" ? raw.name : fallback.name,
    command: typeof raw.command === "string" ? raw.command : fallback.command,
    enabled: typeof raw.enabled === "boolean" ? raw.enabled : fallback.enabled,
    env,
    description: typeof raw.description === "string" ? raw.description : fallback.description,
  };
}

function mergeLegacyIntegrations(raw: unknown): CabinetIntegrationConfig {
  const fallback = DEFAULT_CABINET_CONFIG.integrations;
  if (!isRecord(raw)) {
    return fallback;
  }

  const rawNotifications = isRecord(raw.notifications) ? raw.notifications : {};
  const rawTelegram = isRecord(rawNotifications.telegram) ? rawNotifications.telegram : {};
  const rawSlack = isRecord(rawNotifications.slack_webhook) ? rawNotifications.slack_webhook : {};
  const rawEmail = isRecord(rawNotifications.email) ? rawNotifications.email : {};
  const rawScheduling = isRecord(raw.scheduling) ? raw.scheduling : {};
  const rawMcpServers = isRecord(raw.mcp_servers) ? raw.mcp_servers : {};

  const serverNames = new Set([
    ...Object.keys(fallback.mcp_servers),
    ...Object.keys(rawMcpServers),
  ]);

  const mcpServers = Object.fromEntries(
    Array.from(serverNames).map((serverName) => {
      const fallbackServer = fallback.mcp_servers[serverName];
      const rawServer = rawMcpServers[serverName];

      if (!fallbackServer) {
        const baseServer = {
          name: serverName,
          command: "",
          enabled: false,
          env: {},
        };
        return [serverName, mergeIntegrationServer(baseServer, rawServer)];
      }

      return [serverName, mergeIntegrationServer(fallbackServer, rawServer)];
    }),
  );

  return {
    mcp_servers: mcpServers,
    notifications: {
      browser_push:
        typeof rawNotifications.browser_push === "boolean"
          ? rawNotifications.browser_push
          : fallback.notifications.browser_push,
      telegram: {
        enabled:
          typeof rawTelegram.enabled === "boolean"
            ? rawTelegram.enabled
            : fallback.notifications.telegram.enabled,
        bot_token:
          typeof rawTelegram.bot_token === "string"
            ? rawTelegram.bot_token
            : fallback.notifications.telegram.bot_token,
        chat_id:
          typeof rawTelegram.chat_id === "string"
            ? rawTelegram.chat_id
            : fallback.notifications.telegram.chat_id,
        bidirectional:
          typeof rawTelegram.bidirectional === "boolean"
            ? rawTelegram.bidirectional
            : fallback.notifications.telegram.bidirectional,
        default_agent_id:
          typeof rawTelegram.default_agent_id === "string"
            ? rawTelegram.default_agent_id
            : fallback.notifications.telegram.default_agent_id,
        proxy:
          typeof rawTelegram.proxy === "string"
            ? rawTelegram.proxy
            : fallback.notifications.telegram.proxy,
      },
      slack_webhook: {
        enabled:
          typeof rawSlack.enabled === "boolean"
            ? rawSlack.enabled
            : fallback.notifications.slack_webhook.enabled,
        url:
          typeof rawSlack.url === "string"
            ? rawSlack.url
            : fallback.notifications.slack_webhook.url,
      },
      email: {
        enabled:
          typeof rawEmail.enabled === "boolean"
            ? rawEmail.enabled
            : fallback.notifications.email.enabled,
        frequency:
          rawEmail.frequency === "hourly" || rawEmail.frequency === "daily"
            ? rawEmail.frequency
            : fallback.notifications.email.frequency,
        to:
          typeof rawEmail.to === "string"
            ? rawEmail.to
            : fallback.notifications.email.to,
      },
    },
    scheduling: {
      max_concurrent_agents:
        typeof rawScheduling.max_concurrent_agents === "number"
          ? rawScheduling.max_concurrent_agents
          : fallback.scheduling.max_concurrent_agents,
      default_heartbeat_interval:
        typeof rawScheduling.default_heartbeat_interval === "string"
          ? rawScheduling.default_heartbeat_interval
          : fallback.scheduling.default_heartbeat_interval,
      active_hours:
        typeof rawScheduling.active_hours === "string"
          ? rawScheduling.active_hours
          : fallback.scheduling.active_hours,
      pause_on_error:
        typeof rawScheduling.pause_on_error === "boolean"
          ? rawScheduling.pause_on_error
          : fallback.scheduling.pause_on_error,
    },
  };
}

function normalizeLegacySchedules(raw: unknown): CabinetSchedule[] {
  if (!Array.isArray(raw)) {
    throw new Error("Legacy schedules.json must contain an array");
  }

  return raw.map((item, index) => {
    if (!isRecord(item)) {
      throw new Error(`Legacy schedule at index ${index} must be an object`);
    }

    const schedule: CabinetSchedule = {
      id: typeof item.id === "string" ? item.id : `schedule-${index + 1}`,
      schedule: typeof item.schedule === "string" ? item.schedule : "",
      enabled: typeof item.enabled === "boolean" ? item.enabled : true,
    };

    if (typeof item.name === "string") {
      schedule.name = item.name;
    }
    if (item.profile === "quick" || item.profile === "full") {
      schedule.profile = item.profile;
    }
    if (typeof item.createdAt === "string") {
      schedule.createdAt = item.createdAt;
    }
    if (typeof item.updatedAt === "string") {
      schedule.updatedAt = item.updatedAt;
    }
    if (typeof item.lastRunAt === "string") {
      schedule.lastRunAt = item.lastRunAt;
    }
    if (item.lastStatus === "passed" || item.lastStatus === "failed") {
      schedule.lastStatus = item.lastStatus;
    }
    if (typeof item.lastReportId === "string") {
      schedule.lastReportId = item.lastReportId;
    }

    return schedule;
  });
}

function extractPersonaRuntime(frontmatter: Record<string, unknown>): PersonaRuntimeConfig {
  const runtime: PersonaRuntimeConfig = {};

  if (typeof frontmatter.provider === "string") {
    runtime.provider = frontmatter.provider;
  }
  if (typeof frontmatter.heartbeat === "string") {
    runtime.heartbeat = frontmatter.heartbeat;
  }
  if (typeof frontmatter.budget === "number") {
    runtime.budget = frontmatter.budget;
  }
  if (typeof frontmatter.active === "boolean") {
    runtime.active = frontmatter.active;
  }
  if (typeof frontmatter.workdir === "string") {
    runtime.workdir = frontmatter.workdir;
  }
  if (typeof frontmatter.workspace === "string") {
    runtime.workspace = frontmatter.workspace;
  }
  if (typeof frontmatter.setupComplete === "boolean") {
    runtime.setupComplete = frontmatter.setupComplete;
  }
  if (typeof frontmatter.multica_runtime_id === "string" && frontmatter.multica_runtime_id.trim()) {
    runtime.multicaRuntimeId = frontmatter.multica_runtime_id.trim();
  }

  return runtime;
}

async function readLegacySchedules(dataDir: string): Promise<CabinetSchedule[]> {
  for (const filePath of getLegacySchedulePaths(dataDir)) {
    try {
      const raw = await readJsonFile(filePath);
      return normalizeLegacySchedules(raw);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        continue;
      }
      throw new Error(
        `Failed to migrate legacy schedules from ${filePath}: ${(error as Error).message}`,
        { cause: error },
      );
    }
  }

  return [];
}

async function readLegacyIntegrations(dataDir: string): Promise<CabinetIntegrationConfig> {
  const filePath = getLegacyIntegrationsPath(dataDir);

  try {
    const raw = await readJsonFile(filePath);
    return mergeLegacyIntegrations(raw);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return DEFAULT_CABINET_CONFIG.integrations;
    }
    throw new Error(
      `Failed to migrate legacy integrations from ${filePath}: ${(error as Error).message}`,
      { cause: error },
    );
  }
}

async function readPersonaRuntimeConfig(dataDir: string): Promise<Record<string, PersonaRuntimeConfig>> {
  const agentsDir = getAgentsDir(dataDir);
  const personas: Record<string, PersonaRuntimeConfig> = {};

  let entries: Dirent[];
  try {
    entries = await fs.readdir(agentsDir, { withFileTypes: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return personas;
    }
    throw error;
  }

  for (const entry of entries) {
    if (entry.name.startsWith(".")) {
      continue;
    }

    let slug: string | null = null;
    let personaPath: string | null = null;

    if (entry.isDirectory()) {
      slug = entry.name;
      personaPath = path.join(agentsDir, entry.name, "persona.md");
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      slug = entry.name.replace(/\.md$/, "");
      personaPath = path.join(agentsDir, entry.name);
    }

    if (!slug || !personaPath) {
      continue;
    }

    try {
      const rawPersona = await fs.readFile(personaPath, "utf8");
      const parsed = matter(rawPersona);
      const runtime = extractPersonaRuntime(parsed.data);
      if (Object.keys(runtime).length > 0) {
        personas[slug] = runtime;
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        continue;
      }
      throw new Error(
        `Failed to migrate persona runtime from ${personaPath}: ${(error as Error).message}`,
        { cause: error },
      );
    }
  }

  return personas;
}

export async function migrateFromLegacy(dataDir: string): Promise<CabinetConfig> {
  const [integrations, schedules, personas] = await Promise.all([
    readLegacyIntegrations(dataDir),
    readLegacySchedules(dataDir),
    readPersonaRuntimeConfig(dataDir),
  ]);

  const migrated = parseCabinetConfig({
    version: 1,
    integrations,
    schedules,
    runtime: {
      personas,
    },
  });

  await fs.mkdir(getCabinetConfigDir(dataDir), { recursive: true });
  await fs.writeFile(
    getCabinetConfigMigratedAtPath(dataDir),
    `${new Date().toISOString()}\n`,
    "utf8",
  );

  return migrated;
}
