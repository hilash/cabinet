"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SchedulePicker } from "./schedule-picker";
import { cn } from "@/lib/utils";
import { Plus, X } from "lucide-react";
import type { PlayDefinition } from "@/types/agents";

interface GoalInput {
  metric: string;
  target: number;
  unit: string;
  period: string;
}

interface CreateAgentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
}

const EMOJI_OPTIONS = [
  "🤖", "👑", "📝", "🎯", "🔍", "🛡️", "🚀", "💼",
  "📊", "🧠", "⚡", "🔧", "📣", "🎨", "📈", "🌐",
];

const DEPARTMENTS = ["marketing", "sales", "engineering", "research", "operations", "content", "support", "general"];

export function CreateAgentDialog({ open, onOpenChange, onCreated }: CreateAgentDialogProps) {
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [emoji, setEmoji] = useState("🤖");
  const [department, setDepartment] = useState("general");
  const [type, setType] = useState<"specialist" | "lead">("specialist");
  const [heartbeat, setHeartbeat] = useState("0 */4 * * *");
  const [selectedPlays, setSelectedPlays] = useState<string[]>([]);
  const [availablePlays, setAvailablePlays] = useState<PlayDefinition[]>([]);
  const [goals, setGoals] = useState<GoalInput[]>([]);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (open) {
      fetch("/api/plays")
        .then((r) => r.json())
        .then((d) => setAvailablePlays(d.plays || []))
        .catch(() => {});
    }
  }, [open]);

  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/^-|-$/g, "");

  const handleCreate = async () => {
    if (!name.trim() || !slug) return;
    setCreating(true);

    try {
      const goalsFmt = goals
        .filter((g) => g.metric.trim() && g.target > 0)
        .map((g) => ({
          metric: g.metric.trim().replace(/\s+/g, "_").toLowerCase(),
          target: g.target,
          current: 0,
          unit: g.unit.trim() || "count",
          period: g.period,
        }));

      const body = {
        name: name.trim(),
        role: role.trim(),
        emoji,
        department,
        type,
        heartbeat,
        budget: 200,
        active: false,
        workdir: "/data",
        plays: selectedPlays,
        goals: goalsFmt,
        channels: [department === "general" ? "general" : department, "general"],
        tags: [department],
        focus: [],
        body: `You are ${name.trim()}. ${role.trim()}\n\nYour department: ${department}\nYour role type: ${type}`,
      };

      const res = await fetch(`/api/agents/personas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, ...body }),
      });

      if (res.ok) {
        onOpenChange(false);
        resetForm();
        onCreated?.();
      }
    } catch {
      /* ignore */
    } finally {
      setCreating(false);
    }
  };

  const resetForm = () => {
    setName("");
    setRole("");
    setEmoji("🤖");
    setDepartment("general");
    setType("specialist");
    setHeartbeat("0 */4 * * *");
    setSelectedPlays([]);
    setGoals([]);
  };

  const togglePlay = (slug: string) => {
    setSelectedPlays((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Agent</DialogTitle>
          <DialogDescription>
            Define a new agent with its identity, schedule, and assigned plays.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Identity */}
          <div className="space-y-3">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground/60">
              Identity
            </div>

            {/* Emoji picker */}
            <div className="space-y-1">
              <label className="text-[12px] font-medium">Avatar</label>
              <div className="flex flex-wrap gap-1">
                {EMOJI_OPTIONS.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => setEmoji(e)}
                    className={cn(
                      "w-8 h-8 rounded-md text-base flex items-center justify-center transition-colors",
                      emoji === e
                        ? "bg-primary/20 ring-1 ring-primary"
                        : "hover:bg-muted"
                    )}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[12px] font-medium">Name</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Marketing Agent"
                  className="text-[12px] h-8"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[12px] font-medium">Role</label>
                <Input
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  placeholder="Content Specialist"
                  className="text-[12px] h-8"
                />
              </div>
            </div>

            {slug && (
              <p className="text-[10px] text-muted-foreground/50">
                Slug: <code className="font-mono">{slug}</code>
              </p>
            )}
          </div>

          {/* Department & Type */}
          <div className="space-y-3">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground/60">
              Organization
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[12px] font-medium">Department</label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full h-8 text-[12px] bg-background border border-border rounded-md px-2 focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  {DEPARTMENTS.map((d) => (
                    <option key={d} value={d}>
                      {d.charAt(0).toUpperCase() + d.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[12px] font-medium">Type</label>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => setType("specialist")}
                    className={cn(
                      "flex-1 h-8 text-[11px] rounded-md border transition-colors",
                      type === "specialist"
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Specialist
                  </button>
                  <button
                    type="button"
                    onClick={() => setType("lead")}
                    className={cn(
                      "flex-1 h-8 text-[11px] rounded-md border transition-colors",
                      type === "lead"
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Lead
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Schedule */}
          <div className="space-y-3">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground/60">
              Heartbeat Schedule
            </div>
            <SchedulePicker
              value={heartbeat}
              onChange={setHeartbeat}
            />
          </div>

          {/* Goals */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground/60">
                Goals ({goals.length})
              </div>
              <button
                type="button"
                onClick={() => setGoals((prev) => [...prev, { metric: "", target: 10, unit: "", period: "weekly" }])}
                className="text-[10px] text-primary hover:text-primary/80 flex items-center gap-0.5 transition-colors"
              >
                <Plus className="h-3 w-3" />
                Add Goal
              </button>
            </div>
            {goals.length === 0 ? (
              <p className="text-[11px] text-muted-foreground/40">
                Goals define what success looks like. Agents track progress toward these metrics.
              </p>
            ) : (
              <div className="space-y-2">
                {goals.map((g, i) => (
                  <div key={i} className="flex items-start gap-1.5 p-2 rounded-md bg-muted/20 border border-border/30">
                    <div className="flex-1 grid grid-cols-2 gap-1.5">
                      <Input
                        value={g.metric}
                        onChange={(e) => setGoals((prev) => prev.map((goal, idx) => idx === i ? { ...goal, metric: e.target.value } : goal))}
                        placeholder="reddit_replies"
                        className="text-[11px] h-7 col-span-2"
                      />
                      <Input
                        type="number"
                        value={g.target || ""}
                        onChange={(e) => setGoals((prev) => prev.map((goal, idx) => idx === i ? { ...goal, target: parseInt(e.target.value) || 0 } : goal))}
                        placeholder="50"
                        className="text-[11px] h-7"
                      />
                      <Input
                        value={g.unit}
                        onChange={(e) => setGoals((prev) => prev.map((goal, idx) => idx === i ? { ...goal, unit: e.target.value } : goal))}
                        placeholder="replies/week"
                        className="text-[11px] h-7"
                      />
                      <select
                        value={g.period}
                        onChange={(e) => setGoals((prev) => prev.map((goal, idx) => idx === i ? { ...goal, period: e.target.value } : goal))}
                        className="text-[11px] h-7 bg-background border border-border rounded-md px-1.5 focus:outline-none focus:ring-1 focus:ring-ring col-span-2"
                      >
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                      </select>
                    </div>
                    <button
                      type="button"
                      onClick={() => setGoals((prev) => prev.filter((_, idx) => idx !== i))}
                      className="p-1 text-muted-foreground/40 hover:text-red-500 transition-colors mt-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Plays */}
          {availablePlays.length > 0 && (
            <div className="space-y-3">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground/60">
                Assigned Plays ({selectedPlays.length})
              </div>
              <div className="space-y-1 max-h-[150px] overflow-y-auto">
                {availablePlays.map((play) => (
                  <button
                    key={play.slug}
                    type="button"
                    onClick={() => togglePlay(play.slug)}
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-2 rounded-md text-left transition-colors text-[12px]",
                      selectedPlays.includes(play.slug)
                        ? "bg-primary/10 text-primary border border-primary/20"
                        : "hover:bg-muted border border-transparent"
                    )}
                  >
                    <div
                      className={cn(
                        "w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0",
                        selectedPlays.includes(play.slug)
                          ? "bg-primary border-primary text-primary-foreground"
                          : "border-muted-foreground/30"
                      )}
                    >
                      {selectedPlays.includes(play.slug) && (
                        <span className="text-[9px]">✓</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{play.title}</p>
                      <p className="text-[10px] text-muted-foreground/60 truncate">
                        {play.category}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            onClick={handleCreate}
            disabled={!name.trim() || creating}
            className="text-[12px]"
          >
            {creating ? "Creating..." : "Create Agent"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
