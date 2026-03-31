"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Clock, ChevronDown } from "lucide-react";
import { cronToHuman } from "@/lib/agents/cron-utils";

interface SchedulePickerProps {
  value: string; // cron expression
  onChange: (cron: string) => void;
  label?: string;
}

interface Preset {
  label: string;
  cron: string;
  description: string;
}

const PRESETS: Preset[] = [
  { label: "5m", cron: "*/5 * * * *", description: "Every 5 minutes" },
  { label: "15m", cron: "*/15 * * * *", description: "Every 15 minutes" },
  { label: "30m", cron: "*/30 * * * *", description: "Every 30 minutes" },
  { label: "1h", cron: "0 * * * *", description: "Every hour" },
  { label: "4h", cron: "0 */4 * * *", description: "Every 4 hours" },
  { label: "Daily 9am", cron: "0 9 * * *", description: "Daily at 9:00 AM" },
  { label: "Weekdays", cron: "0 9 * * 1-5", description: "Weekdays at 9:00 AM" },
  { label: "Weekly", cron: "0 9 * * 1", description: "Weekly on Monday" },
];

function getNextRuns(cron: string, count = 3): string[] {
  // Simple next-run approximation for common patterns
  const now = new Date();
  const runs: string[] = [];
  const parts = cron.split(" ");
  if (parts.length !== 5) return [];

  const [min, hour] = parts;

  let intervalMs = 0;
  if (min.startsWith("*/")) {
    intervalMs = parseInt(min.slice(2)) * 60 * 1000;
  } else if (min === "0" && hour.startsWith("*/")) {
    intervalMs = parseInt(hour.slice(2)) * 60 * 60 * 1000;
  } else if (min === "0" && hour === "*") {
    intervalMs = 60 * 60 * 1000;
  }

  if (intervalMs > 0) {
    let next = new Date(Math.ceil(now.getTime() / intervalMs) * intervalMs);
    for (let i = 0; i < count; i++) {
      runs.push(
        next.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      );
      next = new Date(next.getTime() + intervalMs);
    }
  }

  return runs;
}

export function SchedulePicker({ value, onChange, label }: SchedulePickerProps) {
  const [showCron, setShowCron] = useState(false);
  const [customInput, setCustomInput] = useState("");

  const humanReadable = cronToHuman(value);
  const nextRuns = getNextRuns(value);
  const activePreset = PRESETS.find((p) => p.cron === value);

  return (
    <div className="space-y-2">
      {label && (
        <label className="text-[12px] font-medium text-foreground/80">
          {label}
        </label>
      )}

      {/* Quick picks */}
      <div className="flex flex-wrap gap-1">
        {PRESETS.map((preset) => (
          <button
            key={preset.cron}
            type="button"
            onClick={() => onChange(preset.cron)}
            className={cn(
              "text-[11px] px-2 py-1 rounded-md border transition-colors",
              value === preset.cron
                ? "border-primary bg-primary/10 text-primary font-medium"
                : "border-border/50 text-muted-foreground hover:border-border hover:text-foreground"
            )}
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* Current schedule display */}
      <div className="flex items-center gap-2 px-3 py-2 bg-muted/30 rounded-lg text-[12px]">
        <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <span className="text-foreground font-medium">{humanReadable}</span>
        {nextRuns.length > 0 && (
          <span className="text-muted-foreground/50 ml-auto">
            Next: {nextRuns.join(", ")}
          </span>
        )}
      </div>

      {/* Cron toggle */}
      <button
        type="button"
        onClick={() => setShowCron(!showCron)}
        className="flex items-center gap-1 text-[10px] text-muted-foreground/50 hover:text-muted-foreground"
      >
        <ChevronDown
          className={cn(
            "h-3 w-3 transition-transform",
            showCron && "rotate-180"
          )}
        />
        {showCron ? "Hide" : "Show"} cron expression
      </button>

      {showCron && (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="* * * * *"
          className="w-full text-[12px] font-mono bg-muted/30 border border-border/50 rounded-md px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-ring"
        />
      )}
    </div>
  );
}
