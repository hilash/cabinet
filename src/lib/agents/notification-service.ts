import path from "path";
import fs from "fs/promises";
import { DATA_DIR } from "@/lib/storage/path-utils";

const CONFIG_FILE = path.join(DATA_DIR, ".agents", ".config", "integrations.json");

interface NotificationConfig {
  notifications: {
    browser_push: boolean;
    telegram: { enabled: boolean; bot_token: string; chat_id: string };
    slack_webhook: { enabled: boolean; url: string };
    email: { enabled: boolean; frequency: string; to: string };
  };
}

async function loadConfig(): Promise<NotificationConfig | null> {
  try {
    const raw = await fs.readFile(CONFIG_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Send a notification to all configured channels.
 * Called when agents post to #alerts or @human is mentioned.
 */
export async function sendNotification(opts: {
  title: string;
  message: string;
  agentName?: string;
  agentEmoji?: string;
  channel?: string;
  severity?: "info" | "warning" | "critical";
}): Promise<{ sent: string[] }> {
  const config = await loadConfig();
  if (!config) return { sent: [] };

  const sent: string[] = [];
  const { title, message, agentName, agentEmoji, severity } = opts;

  // Telegram
  if (config.notifications.telegram?.enabled) {
    const { bot_token, chat_id } = config.notifications.telegram;
    if (bot_token && chat_id) {
      try {
        const icon = severity === "critical" ? "\u{1F6A8}" : severity === "warning" ? "\u{26A0}\u{FE0F}" : "\u{1F4E2}";
        const text = [
          `${icon} *${title}*`,
          agentEmoji && agentName ? `${agentEmoji} ${agentName}` : "",
          message,
        ].filter(Boolean).join("\n");

        const res = await fetch(`https://api.telegram.org/bot${bot_token}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id,
            text,
            parse_mode: "Markdown",
            disable_web_page_preview: true,
          }),
        });
        if (res.ok) sent.push("telegram");
      } catch { /* ignore telegram errors */ }
    }
  }

  // Slack webhook
  if (config.notifications.slack_webhook?.enabled) {
    const { url } = config.notifications.slack_webhook;
    if (url) {
      try {
        const icon = severity === "critical" ? ":rotating_light:" : severity === "warning" ? ":warning:" : ":loudspeaker:";
        const text = [
          `${icon} *${title}*`,
          agentEmoji && agentName ? `${agentEmoji} ${agentName}` : "",
          message,
        ].filter(Boolean).join("\n");

        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
        });
        if (res.ok) sent.push("slack_webhook");
      } catch { /* ignore slack errors */ }
    }
  }

  return { sent };
}

/**
 * Check if a Slack message should trigger external notifications.
 * Returns true for #alerts messages and @human mentions.
 */
export function shouldNotify(channel: string, content: string, mentions?: string[]): boolean {
  if (channel === "alerts") return true;
  if (mentions?.includes("human")) return true;
  if (content.includes("@human")) return true;
  return false;
}
