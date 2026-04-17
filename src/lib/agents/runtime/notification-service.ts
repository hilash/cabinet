import { execFile } from "child_process";
import { DATA_DIR } from "@/lib/storage/path-utils";
import { loadCabinetConfig } from "@/lib/config/cabinet-config";
import type { CabinetIntegrationConfig } from "@/lib/config/schema";

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
  let notifications: CabinetIntegrationConfig["notifications"];
  try {
    const config = await loadCabinetConfig(DATA_DIR);
    notifications = config.integrations.notifications;
  } catch {
    return { sent: [] };
  }

  const sent: string[] = [];
  const { title, message, agentName, agentEmoji, severity } = opts;

  // Telegram
  if (notifications.telegram?.enabled) {
    const { bot_token, chat_id, proxy } = notifications.telegram;
    if (bot_token && chat_id) {
      try {
        const icon = severity === "critical" ? "\u{1F6A8}" : severity === "warning" ? "\u{26A0}\u{FE0F}" : "\u{1F4E2}";
        const text = [
          `${icon} *${title}*`,
          agentEmoji && agentName ? `${agentEmoji} ${agentName}` : "",
          message,
        ].filter(Boolean).join("\n");

        const url = `https://api.telegram.org/bot${bot_token}/sendMessage`;
        const payload = JSON.stringify({
          chat_id,
          text,
          parse_mode: "Markdown",
          disable_web_page_preview: true,
        });

        const args = ["-s", "-X", "POST", url, "-H", "Content-Type: application/json", "-d", payload];
        if (proxy) {
          args.unshift("--proxy", proxy);
        }
        const ok = await new Promise<boolean>((resolve) => {
          execFile("curl", args, { timeout: 10000 }, (err, stdout) => {
            if (err) { resolve(false); return; }
            try {
              const res = JSON.parse(stdout);
              resolve(res.ok === true);
            } catch { resolve(false); }
          });
        });
        if (ok) sent.push("telegram");
      } catch { /* ignore telegram errors */ }
    }
  }

  // Slack webhook
  if (notifications.slack_webhook?.enabled) {
    const { url } = notifications.slack_webhook;
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
