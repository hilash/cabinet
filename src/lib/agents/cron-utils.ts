/**
 * Human-readable cron expression formatting.
 * Shared between schedule-picker, agent-detail-panel, and agent-card.
 */

const KNOWN_PRESETS: Record<string, string> = {
  "*/5 * * * *": "Every 5 minutes",
  "*/15 * * * *": "Every 15 minutes",
  "*/30 * * * *": "Every 30 minutes",
  "0 * * * *": "Every hour",
  "0 */4 * * *": "Every 4 hours",
  "0 9 * * *": "Daily at 9:00 AM",
  "0 9 * * 1-5": "Weekdays at 9:00 AM",
  "0 9 * * 1": "Weekly on Monday",
  "0 9 1 * *": "Monthly on the 1st",
};

export function cronToHuman(cron: string): string {
  if (KNOWN_PRESETS[cron]) return KNOWN_PRESETS[cron];

  const parts = cron.split(" ");
  if (parts.length !== 5) return cron;

  const [min, hour, , , dow] = parts;

  // */N minutes
  if (min.startsWith("*/") && hour === "*") {
    const n = min.slice(2);
    const dayStr = dow === "1-5" ? " on weekdays" : dow === "0,6" ? " on weekends" : "";
    return `Every ${n} min${dayStr}`;
  }
  // Every N hours
  if (min === "0" && hour.startsWith("*/")) {
    const n = hour.slice(2);
    const dayStr = dow === "1-5" ? " on weekdays" : "";
    return `Every ${n}h${dayStr}`;
  }
  // Specific hour
  if (min === "0" && !hour.includes("*") && !hour.includes("/")) {
    const hourNum = parseInt(hour);
    const ampm = hourNum >= 12 ? "PM" : "AM";
    const h12 = hourNum > 12 ? hourNum - 12 : hourNum || 12;
    const dayStr =
      dow === "1-5" ? "Weekdays" : dow === "*" ? "Daily" : dow === "1" ? "Mondays" : `(${dow})`;
    return `${dayStr} at ${h12}:00 ${ampm}`;
  }

  return cron;
}

/** Short label for use in agent cards (e.g., "15m", "4h", "Daily 9am") */
export function cronToShortLabel(cron: string): string {
  const parts = cron.split(" ");
  if (parts.length !== 5) return cron;

  const [min, hour] = parts;

  if (min.startsWith("*/") && hour === "*") return `${min.slice(2)}m`;
  if (min === "0" && hour.startsWith("*/")) return `${hour.slice(2)}h`;
  if (min === "0" && hour === "*") return "1h";
  if (min === "0" && !hour.includes("*")) {
    const h = parseInt(hour);
    const ampm = h >= 12 ? "pm" : "am";
    const h12 = h > 12 ? h - 12 : h || 12;
    return `${h12}${ampm}`;
  }

  return cron;
}
