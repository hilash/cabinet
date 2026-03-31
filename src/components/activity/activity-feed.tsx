"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Activity,
  RefreshCw,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface ActivityEvent {
  id: string;
  timestamp: string;
  agentSlug?: string;
  eventType: string;
  summary: string;
  details?: string;
  links?: string;
  missionId?: string;
  channelSlug?: string;
}

const EVENT_TYPE_COLORS: Record<string, string> = {
  "agent:run": "bg-green-500",
  "agent:complete": "bg-blue-500",
  "agent:error": "bg-red-500",
  "mission:created": "bg-purple-500",
  "mission:completed": "bg-green-500",
  "task:completed": "bg-blue-500",
  "chat:message": "bg-yellow-500",
  "system:setup": "bg-gray-500",
};

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return "Today";
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

const EVENT_TYPES = [
  { value: "", label: "All" },
  { value: "agent:run", label: "Agent Runs" },
  { value: "agent:complete", label: "Completions" },
  { value: "agent:error", label: "Errors" },
  { value: "mission:created", label: "Missions" },
  { value: "task:completed", label: "Tasks" },
  { value: "chat:message", label: "Messages" },
];

export function ActivityFeed() {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState("");

  const refresh = useCallback(async () => {
    try {
      const params = new URLSearchParams({ limit: "100" });
      if (filterType) params.set("type", filterType);
      const res = await fetch(`/api/activity?${params}`);
      if (res.ok) {
        const data = await res.json();
        setEvents(data.events || []);
        setTotal(data.total || 0);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [filterType]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Group events by date
  const grouped: Record<string, ActivityEvent[]> = {};
  for (const event of events) {
    const date = formatDate(event.timestamp);
    if (!grouped[date]) grouped[date] = [];
    grouped[date].push(event);
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
        Loading...
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4" />
          <h2 className="text-[15px] font-semibold tracking-[-0.02em]">
            Activity
          </h2>
          {total > 0 && (
            <span className="text-[11px] text-muted-foreground">
              ({total})
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-muted rounded-md p-0.5">
            {EVENT_TYPES.slice(0, 4).map((et) => (
              <button
                key={et.value}
                onClick={() => setFilterType(et.value)}
                className={cn(
                  "px-2 py-1 rounded text-[10px] transition-colors",
                  filterType === et.value
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {et.label}
              </button>
            ))}
          </div>
          <Button variant="ghost" size="icon-sm" onClick={refresh}>
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4">
          {events.length === 0 && (
            <div className="text-center py-12">
              <Activity className="h-10 w-10 mx-auto text-muted-foreground/30" />
              <p className="text-[13px] text-muted-foreground mt-3">
                No activity yet
              </p>
              <p className="text-[11px] text-muted-foreground mt-1">
                Events will appear here as agents work
              </p>
            </div>
          )}

          {Object.entries(grouped).map(([date, dateEvents]) => (
            <div key={date} className="mb-6">
              <h3 className="text-[11px] font-semibold uppercase text-muted-foreground tracking-wider mb-3">
                {date}
              </h3>
              <div className="space-y-1">
                {dateEvents.map((event) => (
                  <div
                    key={event.id}
                    className="flex gap-3 py-2 px-2 -mx-2 rounded hover:bg-accent/30"
                  >
                    <span className="text-[11px] text-muted-foreground font-mono w-12 shrink-0 pt-0.5">
                      {formatTime(event.timestamp)}
                    </span>
                    <div
                      className={cn(
                        "w-2 h-2 rounded-full mt-1.5 shrink-0",
                        EVENT_TYPE_COLORS[event.eventType] || "bg-muted-foreground"
                      )}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px]">
                        {event.agentSlug && (
                          <span className="font-medium">
                            {event.agentSlug}{" "}
                          </span>
                        )}
                        {event.summary}
                      </p>
                      {event.details && (
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {event.details}
                        </p>
                      )}
                      {event.links && (
                        <p className="text-[11px] text-primary font-mono mt-0.5">
                          {event.links}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
