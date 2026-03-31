"use client";

import { useEffect, useState, useCallback } from "react";
import {
  ArrowLeft,
  Target,
  Plus,
  CheckCircle,
  Circle,
  RefreshCw,
  Loader2,
  AlertCircle,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAppStore } from "@/stores/app-store";
import { cn } from "@/lib/utils";

interface Mission {
  id: string;
  title: string;
  status: "active" | "completed" | "archived";
  progress: number;
  outputPath?: string;
  createdAt: string;
  updatedAt: string;
  body: string;
}

interface MissionTask {
  id: string;
  missionId: string;
  agentSlug?: string;
  title: string;
  description?: string;
  status: "pending" | "assigned" | "in_progress" | "completed" | "failed" | "blocked";
  orderNum: number;
  outputPath?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
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

const STATUS_ICONS: Record<string, typeof CheckCircle> = {
  pending: Circle,
  assigned: Circle,
  in_progress: Loader2,
  completed: CheckCircle,
  failed: AlertCircle,
  blocked: Lock,
};

const STATUS_COLORS: Record<string, string> = {
  pending: "text-muted-foreground",
  assigned: "text-blue-500",
  in_progress: "text-yellow-500 animate-spin",
  completed: "text-green-500",
  failed: "text-red-500",
  blocked: "text-orange-500",
};

export function MissionDetail({ missionId }: { missionId: string }) {
  const [mission, setMission] = useState<Mission | null>(null);
  const [tasks, setTasks] = useState<MissionTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [addingTask, setAddingTask] = useState(false);
  const setSection = useAppStore((s) => s.setSection);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/missions/${missionId}`);
      if (res.ok) {
        const data = await res.json();
        setMission(data.mission);
        setTasks(data.tasks || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [missionId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addTask = async () => {
    if (!newTaskTitle.trim()) return;
    setAddingTask(true);
    try {
      await fetch(`/api/missions/${missionId}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTaskTitle.trim() }),
      });
      setNewTaskTitle("");
      refresh();
    } finally {
      setAddingTask(false);
    }
  };

  const updateTaskStatus = async (taskId: string, status: string) => {
    await fetch(`/api/missions/${missionId}/tasks/${taskId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    refresh();
  };

  if (loading || !mission) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
        Loading...
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setSection({ type: "missions" })}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-[15px] font-semibold tracking-[-0.02em]">
              {mission.title}
            </h2>
            <p className="text-[11px] text-muted-foreground">
              {mission.progress}% complete
            </p>
          </div>
        </div>
        <Button variant="ghost" size="icon-sm" onClick={refresh}>
          <RefreshCw className="h-3.5 w-3.5" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Goal */}
          {mission.body && (
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">
                Goal
              </p>
              <p className="text-[13px] leading-relaxed">{mission.body}</p>
            </div>
          )}

          {mission.outputPath && (
            <div className="bg-muted/30 rounded-lg p-2 text-[12px]">
              <span className="text-muted-foreground">Output: </span>
              <span className="font-mono">{mission.outputPath}</span>
            </div>
          )}

          {/* Progress bar */}
          <div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  mission.progress >= 100 ? "bg-green-500" : "bg-primary"
                )}
                style={{ width: `${mission.progress}%` }}
              />
            </div>
          </div>

          {/* Tasks */}
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-3">
              Tasks
            </p>
            <div className="space-y-2">
              {tasks.map((task) => {
                const Icon = STATUS_ICONS[task.status] || Circle;
                const colorClass = STATUS_COLORS[task.status] || "";
                return (
                  <div
                    key={task.id}
                    className="flex items-start gap-2 bg-card border border-border rounded-lg p-3"
                  >
                    <button
                      onClick={() =>
                        updateTaskStatus(
                          task.id,
                          task.status === "completed" ? "pending" : "completed"
                        )
                      }
                      className="mt-0.5 shrink-0"
                    >
                      <Icon className={cn("h-4 w-4", colorClass)} />
                    </button>
                    <div className="flex-1 min-w-0">
                      <p
                        className={cn(
                          "text-[13px]",
                          task.status === "completed" &&
                            "line-through text-muted-foreground"
                        )}
                      >
                        {task.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        {task.agentSlug && (
                          <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                            {task.agentSlug}
                          </span>
                        )}
                        <span className="text-[10px] text-muted-foreground capitalize">
                          {task.status.replace("_", " ")}
                        </span>
                        {task.completedAt && (
                          <span className="text-[10px] text-muted-foreground">
                            {timeAgo(task.completedAt)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Add task inline */}
              <div className="flex items-center gap-2">
                <Input
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="Add a task..."
                  className="h-8 text-[13px]"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") addTask();
                  }}
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1 text-xs shrink-0"
                  onClick={addTask}
                  disabled={!newTaskTitle.trim() || addingTask}
                >
                  <Plus className="h-3 w-3" />
                  Add
                </Button>
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
