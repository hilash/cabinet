"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Target,
  Plus,
  RefreshCw,
  CheckCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAppStore } from "@/stores/app-store";
import { CreateMissionDialog } from "./create-mission-dialog";
import { cn } from "@/lib/utils";

interface Mission {
  id: string;
  title: string;
  status: "active" | "completed" | "archived";
  progress: number;
  createdAt: string;
  updatedAt: string;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function MissionList() {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const setSection = useAppStore((s) => s.setSection);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/missions");
      if (res.ok) {
        const data = await res.json();
        setMissions(data.missions || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const activeMissions = missions.filter((m) => m.status === "active");
  const completedMissions = missions.filter((m) => m.status === "completed");

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
          <Target className="h-4 w-4" />
          <h2 className="text-[15px] font-semibold tracking-[-0.02em]">
            Missions
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-7 gap-1.5 text-xs"
            onClick={() => setShowCreate(true)}
          >
            <Plus className="h-3.5 w-3.5" />
            New Mission
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={refresh}>
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {missions.length === 0 && (
            <div className="text-center py-12">
              <Target className="h-10 w-10 mx-auto text-muted-foreground/30" />
              <p className="text-[13px] text-muted-foreground mt-3">
                No missions yet
              </p>
              <p className="text-[11px] text-muted-foreground mt-1">
                Create a mission to organize work for your agents
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4 gap-1.5"
                onClick={() => setShowCreate(true)}
              >
                <Plus className="h-3.5 w-3.5" />
                Create first mission
              </Button>
            </div>
          )}

          {activeMissions.length > 0 && (
            <div>
              <h3 className="text-[11px] font-semibold uppercase text-muted-foreground tracking-wider mb-3">
                Active
              </h3>
              <div className="space-y-2">
                {activeMissions.map((m) => (
                  <MissionCard
                    key={m.id}
                    mission={m}
                    onClick={() =>
                      setSection({ type: "mission", slug: m.id })
                    }
                  />
                ))}
              </div>
            </div>
          )}

          {completedMissions.length > 0 && (
            <div>
              <h3 className="text-[11px] font-semibold uppercase text-muted-foreground tracking-wider mb-3">
                Completed
              </h3>
              <div className="space-y-2">
                {completedMissions.map((m) => (
                  <MissionCard
                    key={m.id}
                    mission={m}
                    onClick={() =>
                      setSection({ type: "mission", slug: m.id })
                    }
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {showCreate && (
        <CreateMissionDialog
          onClose={() => setShowCreate(false)}
          onCreate={() => {
            setShowCreate(false);
            refresh();
          }}
        />
      )}
    </div>
  );
}

function MissionCard({
  mission,
  onClick,
}: {
  mission: Mission;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full bg-card border border-border rounded-lg p-3 text-left hover:border-primary/30 hover:bg-accent/30 transition-colors"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {mission.status === "completed" ? (
            <CheckCircle className="h-4 w-4 text-green-500" />
          ) : (
            <Target className="h-4 w-4 text-primary" />
          )}
          <h4 className="text-[13px] font-medium">{mission.title}</h4>
        </div>
        <span className="text-[10px] text-muted-foreground">
          {timeAgo(mission.updatedAt)}
        </span>
      </div>
      <div className="mt-2 flex items-center gap-3">
        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              mission.progress >= 100
                ? "bg-green-500"
                : "bg-primary"
            )}
            style={{ width: `${mission.progress}%` }}
          />
        </div>
        <span className="text-[10px] text-muted-foreground font-medium">
          {mission.progress}%
        </span>
      </div>
    </button>
  );
}
