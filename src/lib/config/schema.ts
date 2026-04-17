import { z } from "zod";

/**
 * cabinet.config.json holds *global operator config* only:
 *   - integrations (MCP servers, notifications)
 *   - health-check schedules
 *
 * Per-agent runtime settings live in `.agents/<slug>/persona.md` frontmatter.
 * Provider selection lives in `.agents/.config/providers.json`.
 * Company profile lives in `.agents/.config/company.json`.
 * Do not re-introduce a `runtime.personas` mirror here — it was removed
 * because it duplicated persona.md without any consumer.
 * Do not re-introduce an `integrations.scheduling` block — it had no
 * runtime consumer (the scheduler reads per-job/per-persona settings).
 */

const mcpServerSchema = z.object({
  name: z.string(),
  command: z.string(),
  enabled: z.boolean(),
  env: z.record(z.string(), z.string()),
  description: z.string().optional(),
}).strict();

const integrationConfigSchema = z.object({
  mcp_servers: z.record(z.string(), mcpServerSchema),
  notifications: z.object({
    browser_push: z.boolean(),
    telegram: z.object({
      enabled: z.boolean(),
      bot_token: z.string(),
      chat_id: z.string(),
      bidirectional: z.boolean().optional(),
      default_agent_id: z.string().optional(),
      proxy: z.string().optional(),
    }).strict(),
    slack_webhook: z.object({
      enabled: z.boolean(),
      url: z.string(),
    }).strict(),
    email: z.object({
      enabled: z.boolean(),
      frequency: z.enum(["hourly", "daily"]),
      to: z.string(),
    }).strict(),
  }).strict(),
}).strict();

const cabinetScheduleSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  schedule: z.string(),
  enabled: z.boolean(),
  profile: z.enum(["quick", "full"]).optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  lastRunAt: z.string().optional(),
  lastStatus: z.enum(["passed", "failed"]).optional(),
  lastReportId: z.string().optional(),
}).strict();

const cabinetConfigSchema = z.object({
  version: z.literal(1),
  integrations: integrationConfigSchema,
  schedules: z.array(cabinetScheduleSchema),
}).strict();

export type CabinetConfig = z.infer<typeof cabinetConfigSchema>;
export type CabinetIntegrationConfig = z.infer<typeof integrationConfigSchema>;
export type CabinetSchedule = z.infer<typeof cabinetScheduleSchema>;

export const DEFAULT_CABINET_CONFIG: CabinetConfig = {
  version: 1,
  integrations: {
    mcp_servers: {
      reddit: {
        name: "Reddit",
        command: "npx @mcp/reddit-server",
        enabled: false,
        env: { REDDIT_CLIENT_ID: "", REDDIT_CLIENT_SECRET: "" },
        description: "Search, post, reply, monitor subreddits",
      },
      linkedin: {
        name: "LinkedIn",
        command: "npx @mcp/linkedin-server",
        enabled: false,
        env: { LINKEDIN_ACCESS_TOKEN: "" },
        description: "Post, connect, message, scrape profiles",
      },
      github: {
        name: "GitHub",
        command: "npx @mcp/github-server",
        enabled: false,
        env: { GITHUB_TOKEN: "" },
        description: "Create PRs, review code, manage issues",
      },
      slack: {
        name: "Slack",
        command: "npx @mcp/slack-server",
        enabled: false,
        env: { SLACK_BOT_TOKEN: "" },
        description: "Post to real Slack, read channels",
      },
      email: {
        name: "Email (SMTP)",
        command: "npx @mcp/email-server",
        enabled: false,
        env: { SMTP_HOST: "", SMTP_USER: "", SMTP_PASS: "" },
        description: "Send, read, categorize emails",
      },
      gsheets: {
        name: "Google Sheets",
        command: "npx @mcp/gsheets-server",
        enabled: false,
        env: { GOOGLE_CREDENTIALS: "" },
        description: "Read/write spreadsheets",
      },
    },
    notifications: {
      browser_push: true,
      telegram: {
        enabled: false,
        bot_token: "",
        chat_id: "",
      },
      slack_webhook: {
        enabled: false,
        url: "",
      },
      email: {
        enabled: false,
        frequency: "daily",
        to: "",
      },
    },
  },
  schedules: [],
};

export function parseCabinetConfig(raw: unknown): CabinetConfig {
  return cabinetConfigSchema.parse(raw);
}

export function parseIntegrationConfig(raw: unknown): CabinetIntegrationConfig {
  return integrationConfigSchema.parse(raw);
}
