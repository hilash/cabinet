"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Clock,
  Plus,
  Play,
  Trash2,
  RefreshCw,
  Zap,
  CheckCircle,
  XCircle,
  Webhook,
  Pencil,
  Copy,
} from "lucide-react";
import type { PlayDefinition } from "@/types/agents";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { SchedulePicker } from "@/components/mission-control/schedule-picker";
import { cronToHuman } from "@/lib/agents/cron-utils";

interface PlayHistoryEntry {
  playSlug: string;
  agentSlug?: string;
  timestamp: string;
  duration: number;
  status: "completed" | "failed";
  summary: string;
  trigger?: string;
}

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

interface AgentBrief {
  slug: string;
  name: string;
  emoji: string;
  plays: string[];
}

export function JobsManager() {
  const [plays, setPlays] = useState<PlayDefinition[]>([]);
  const [history, setHistory] = useState<PlayHistoryEntry[]>([]);
  const [agents, setAgents] = useState<AgentBrief[]>([]);
  const [triggerLog, setTriggerLog] = useState<{ playSlug: string; agentSlug?: string; fired: boolean; reason: string; timestamp: string; event: { type: string } }[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editPlay, setEditPlay] = useState<PlayDefinition | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ title: "", category: "general", schedule: "0 */4 * * *", body: "" });
  const [expandedPlay, setExpandedPlay] = useState<string | null>(null);
  const [newPlay, setNewPlay] = useState({
    name: "",
    title: "",
    category: "general",
    schedule: "0 */4 * * *",
    body: "",
  });

  const refresh = useCallback(async () => {
    try {
      const [playsRes, trigRes, agentsRes] = await Promise.all([
        fetch("/api/plays?history=true"),
        fetch("/api/agents/triggers?limit=30"),
        fetch("/api/agents/personas"),
      ]);
      if (playsRes.ok) {
        const data = await playsRes.json();
        setPlays(data.plays || []);
        setHistory(data.history || []);
      }
      if (trigRes.ok) {
        const data = await trigRes.json();
        setTriggerLog(data.log || []);
      }
      if (agentsRes.ok) {
        const data = await agentsRes.json();
        setAgents((data.personas || []).map((p: Record<string, unknown>) => ({
          slug: p.slug,
          name: p.name,
          emoji: p.emoji || "🤖",
          plays: (p.plays as string[]) || [],
        })));
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

  const handleCreate = async () => {
    if (!newPlay.title || !newPlay.body) return;
    const slug = newPlay.title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-");

    await fetch("/api/plays", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: slug,
        title: newPlay.title,
        category: newPlay.category,
        schedule: { type: "cron", cron: newPlay.schedule },
        triggers: [{ type: "schedule" }, { type: "manual" }],
        body: newPlay.body,
      }),
    });
    setNewPlay({ name: "", title: "", category: "general", schedule: "0 */4 * * *", body: "" });
    setCreateOpen(false);
    refresh();
  };

  const handleRunNow = async (slug: string) => {
    await fetch(`/api/plays/${slug}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "trigger" }),
    });
  };

  const handleEdit = (play: PlayDefinition) => {
    setEditPlay(play);
    setEditForm({
      title: play.title,
      category: play.category,
      schedule: play.schedule?.cron || "0 */4 * * *",
      body: play.body,
    });
    setEditOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editPlay) return;
    await fetch(`/api/plays/${editPlay.slug}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: editForm.title,
        category: editForm.category,
        schedule: { type: "cron", cron: editForm.schedule },
        body: editForm.body,
      }),
    });
    setEditOpen(false);
    setEditPlay(null);
    refresh();
  };

  const handleDuplicate = async (play: PlayDefinition) => {
    const newSlug = play.slug + "-copy";
    await fetch("/api/plays", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newSlug,
        title: play.title + " (Copy)",
        category: play.category,
        schedule: play.schedule,
        triggers: play.triggers,
        body: play.body,
      }),
    });
    refresh();
  };

  const handleDelete = async (slug: string) => {
    if (!confirm("Delete this play?")) return;
    await fetch(`/api/plays/${slug}`, { method: "DELETE" });
    refresh();
  };

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
          <Zap className="h-4 w-4 text-primary" />
          <h2 className="text-[15px] font-semibold tracking-[-0.02em]">
            Plays
          </h2>
          <span className="text-[11px] text-muted-foreground/50">
            {plays.length} defined
          </span>
        </div>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1.5"
            onClick={refresh}
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="default"
            size="sm"
            className="h-7 gap-1.5"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="h-3.5 w-3.5" />
            New Play
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-2">
          {plays.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <Zap className="h-10 w-10 mx-auto text-muted-foreground/20" />
              <div>
                <p className="text-[13px] font-medium text-muted-foreground">
                  No plays yet
                </p>
                <p className="text-[12px] text-muted-foreground/60">
                  Plays are reusable agent actions. Create one and assign it to an agent.
                </p>
              </div>
              <Button
                variant="default"
                size="sm"
                className="text-[12px] gap-1.5"
                onClick={() => setCreateOpen(true)}
              >
                <Plus className="h-3 w-3" />
                Create Play
              </Button>
            </div>
          ) : (
            (() => {
              // Group plays by category
              const groups = new Map<string, PlayDefinition[]>();
              for (const play of plays) {
                const cat = play.category || "general";
                if (!groups.has(cat)) groups.set(cat, []);
                groups.get(cat)!.push(play);
              }
              const categoryIcons: Record<string, string> = {
                marketing: "📣",
                engineering: "🛠",
                research: "🔬",
                operations: "⚙️",
                sales: "💼",
                content: "📝",
                general: "⚡",
              };
              return Array.from(groups.entries()).map(([category, categoryPlays]) => (
                <div key={category} className="space-y-2">
                  <div className="flex items-center gap-2 pt-2 pb-1">
                    <span className="text-sm">{categoryIcons[category] || "⚡"}</span>
                    <h3 className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground/70 capitalize">
                      {category}
                    </h3>
                    <span className="text-[10px] text-muted-foreground/40">
                      {categoryPlays.length} play{categoryPlays.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  {categoryPlays.map((play) => {
              const playHistory = history.filter((h) => h.playSlug === play.slug);
              const lastRun = playHistory[0];
              return (
                <div
                  key={play.slug}
                  className={cn(
                    "bg-card border rounded-lg p-4 transition-colors cursor-pointer",
                    expandedPlay === play.slug ? "border-primary/30 bg-primary/[0.02]" : "border-border hover:border-border/80"
                  )}
                  onClick={() => setExpandedPlay(expandedPlay === play.slug ? null : play.slug)}
                >
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Zap className="h-4 w-4 text-primary shrink-0" />
                        <h3 className="text-[13px] font-semibold">
                          {play.title}
                        </h3>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                          {play.category}
                        </span>
                        {lastRun && (
                          <span
                            className={cn(
                              "text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1",
                              lastRun.status === "completed"
                                ? "bg-emerald-500/10 text-emerald-500"
                                : "bg-red-500/10 text-red-500"
                            )}
                          >
                            {lastRun.status === "completed" ? (
                              <CheckCircle className="h-2.5 w-2.5" />
                            ) : (
                              <XCircle className="h-2.5 w-2.5" />
                            )}
                            {formatTimeAgo(lastRun.timestamp)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 ml-6">
                        {play.schedule && (
                          <span>
                            <Clock className="h-3 w-3 inline mr-1" />
                            {play.schedule.every
                              ? `Every ${play.schedule.every}`
                              : play.schedule.cron
                                ? cronToHuman(play.schedule.cron)
                                : play.schedule.type}
                          </span>
                        )}
                        {play.triggers && play.triggers.length > 0 && (
                          <span className="flex items-center gap-1">
                            {play.triggers.map((t, ti) => {
                              const colors: Record<string, string> = {
                                manual: "bg-muted text-muted-foreground/70",
                                schedule: "bg-blue-500/10 text-blue-500",
                                on_complete: "bg-purple-500/10 text-purple-500",
                                webhook: "bg-amber-500/10 text-amber-500",
                                file_changed: "bg-emerald-500/10 text-emerald-500",
                                goal_behind: "bg-red-500/10 text-red-500",
                                agent_message: "bg-cyan-500/10 text-cyan-500",
                              };
                              return (
                                <span key={ti} className={cn("text-[9px] px-1 py-0 rounded font-medium", colors[t.type] || "bg-muted text-muted-foreground/70")}>
                                  {t.type.replace(/_/g, " ")}
                                </span>
                              );
                            })}
                          </span>
                        )}
                        {playHistory.length > 0 && (
                          <span className="text-muted-foreground/50">
                            {playHistory.length} run{playHistory.length !== 1 ? "s" : ""}
                          </span>
                        )}
                      </div>
                      {play.body && (
                        <p className="text-[11px] text-muted-foreground/50 mt-2 ml-6 line-clamp-2">
                          {play.body.split("\n").filter((l) => l.trim() && !l.startsWith("#"))[0]?.slice(0, 200)}
                        </p>
                      )}
                      {/* Assigned agents */}
                      {(() => {
                        const assigned = agents.filter((a) => a.plays.includes(play.slug));
                        if (assigned.length === 0) return null;
                        return (
                          <div className="flex items-center gap-1.5 mt-2 ml-6">
                            <span className="text-[10px] text-muted-foreground/40">Used by:</span>
                            {assigned.map((a) => (
                              <span key={a.slug} className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/5 text-primary/70 flex items-center gap-1" title={a.name}>
                                <span>{a.emoji}</span>
                                <span>{a.name}</span>
                              </span>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                    <div className="flex items-center gap-1 shrink-0 ml-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={(e) => { e.stopPropagation(); handleRunNow(play.slug); }}
                      >
                        <Play className="h-3 w-3 mr-1" />
                        Run
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        title="Edit play"
                        onClick={(e) => { e.stopPropagation(); handleEdit(play); }}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        title="Duplicate play"
                        onClick={(e) => { e.stopPropagation(); handleDuplicate(play); }}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={(e) => { e.stopPropagation(); handleDelete(play.slug); }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  {/* Expanded detail */}
                  {expandedPlay === play.slug && (
                    <div className="mt-3 pt-3 border-t border-border/30 space-y-3" onClick={(e) => e.stopPropagation()}>
                      {/* Full instructions */}
                      {play.body && (
                        <div>
                          <h4 className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-wider mb-1.5">Instructions</h4>
                          <div className="text-[12px] text-foreground/80 leading-relaxed whitespace-pre-wrap bg-muted/20 rounded-md p-3 max-h-[200px] overflow-y-auto">
                            {play.body}
                          </div>
                        </div>
                      )}

                      {/* Play-specific execution history */}
                      {(() => {
                        const playHist = history.filter((h) => h.playSlug === play.slug);
                        if (playHist.length === 0) return (
                          <p className="text-[11px] text-muted-foreground/40">No execution history yet.</p>
                        );
                        return (
                          <div>
                            <h4 className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-wider mb-1.5">
                              History ({playHist.length} runs)
                            </h4>
                            <div className="space-y-1">
                              {playHist.slice(0, 5).map((h, i) => (
                                <div key={i} className="flex items-start gap-2 py-1.5 px-2 rounded-md bg-muted/10">
                                  <span className={cn("mt-1 h-1.5 w-1.5 rounded-full shrink-0", h.status === "completed" ? "bg-emerald-500" : "bg-red-500")} />
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 text-[10px]">
                                      <span className="text-muted-foreground">{formatTimeAgo(h.timestamp)}</span>
                                      <span className="text-muted-foreground/50">{h.duration}s</span>
                                      {h.agentSlug && (
                                        <span className="text-primary/70">{agents.find((a) => a.slug === h.agentSlug)?.emoji} {h.agentSlug}</span>
                                      )}
                                    </div>
                                    <p className="text-[11px] text-muted-foreground/60 line-clamp-1">{h.summary}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })()}

                      {/* Play-specific triggers */}
                      {play.triggers && play.triggers.length > 0 && (
                        <div>
                          <h4 className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-wider mb-1.5">Triggers</h4>
                          <div className="flex flex-wrap gap-1.5">
                            {play.triggers.map((t, ti) => {
                              const colors: Record<string, string> = {
                                manual: "bg-muted text-muted-foreground/70",
                                schedule: "bg-blue-500/10 text-blue-500",
                                on_complete: "bg-purple-500/10 text-purple-500",
                                webhook: "bg-amber-500/10 text-amber-500",
                                file_changed: "bg-emerald-500/10 text-emerald-500",
                                goal_behind: "bg-red-500/10 text-red-500",
                              };
                              return (
                                <span key={ti} className={cn("text-[10px] px-2 py-1 rounded-md font-medium", colors[t.type] || "bg-muted text-muted-foreground/70")}>
                                  {t.type.replace(/_/g, " ")}
                                  {t.play && <span className="text-muted-foreground/50 ml-1">({t.play})</span>}
                                  {t.path && <span className="text-muted-foreground/50 ml-1">{t.path}</span>}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
                </div>
              ));
            })()
          )}

          {/* Execution History */}
          {history.length > 0 && (
            <div className="mt-6 pt-4 border-t border-border/50">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="h-4 w-4 text-muted-foreground/60" />
                <h3 className="text-[13px] font-semibold tracking-[-0.01em]">
                  Execution History
                </h3>
                <span className="text-[10px] text-muted-foreground/50">
                  {history.length} total
                </span>
              </div>
              <div className="space-y-1">
                {history.slice(0, 20).map((h, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 py-2 px-3 rounded-md hover:bg-muted/30 transition-colors"
                  >
                    <span
                      className={cn(
                        "mt-1.5 h-2 w-2 rounded-full shrink-0",
                        h.status === "completed" ? "bg-emerald-500" : "bg-red-500"
                      )}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[12px] font-medium">
                          {plays.find((p) => p.slug === h.playSlug)?.title || h.playSlug}
                        </span>
                        {h.agentSlug && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                            {h.agentSlug}
                          </span>
                        )}
                        <span className="text-[10px] text-muted-foreground/50">
                          {h.duration}s
                        </span>
                        <span className="text-[10px] text-muted-foreground/40">
                          {formatTimeAgo(h.timestamp)}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground/60 mt-0.5 line-clamp-2">
                        {h.summary.slice(0, 200)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Trigger Log */}
          {triggerLog.length > 0 && (
            <div className="mt-6 pt-4 border-t border-border/50">
              <div className="flex items-center gap-2 mb-3">
                <Webhook className="h-4 w-4 text-muted-foreground/60" />
                <h3 className="text-[13px] font-semibold tracking-[-0.01em]">
                  Trigger Log
                </h3>
                <span className="text-[10px] text-muted-foreground/50">
                  {triggerLog.length} events
                </span>
              </div>
              <div className="space-y-1">
                {triggerLog.slice(0, 15).map((t, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 py-2 px-3 rounded-md hover:bg-muted/30 transition-colors"
                  >
                    <span
                      className={cn(
                        "mt-1.5 h-2 w-2 rounded-full shrink-0",
                        t.fired ? "bg-emerald-500" : "bg-muted-foreground/30"
                      )}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[12px] font-medium">
                          {plays.find((p) => p.slug === t.playSlug)?.title || t.playSlug}
                        </span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground/70 font-medium uppercase">
                          {t.event.type}
                        </span>
                        {t.agentSlug && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                            {t.agentSlug}
                          </span>
                        )}
                        <span className="text-[10px] text-muted-foreground/40">
                          {formatTimeAgo(t.timestamp)}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground/60 mt-0.5">
                        {t.fired ? "Triggered successfully" : t.reason}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Edit Play Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Play</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-[12px] font-medium">Play Name</label>
              <Input
                value={editForm.title}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                className="text-[12px] h-8 mt-1"
              />
            </div>
            <div>
              <label className="text-[12px] font-medium">Category</label>
              <select
                value={editForm.category}
                onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                className="w-full h-8 mt-1 text-[12px] bg-background border border-border rounded-md px-2 focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="general">General</option>
                <option value="marketing">Marketing</option>
                <option value="sales">Sales</option>
                <option value="engineering">Engineering</option>
                <option value="research">Research</option>
                <option value="operations">Operations</option>
                <option value="content">Content</option>
                <option value="support">Support</option>
              </select>
            </div>
            <SchedulePicker
              label="Schedule"
              value={editForm.schedule}
              onChange={(cron) => setEditForm({ ...editForm, schedule: cron })}
            />
            <div>
              <label className="text-[12px] font-medium">Instructions</label>
              <textarea
                value={editForm.body}
                onChange={(e) => setEditForm({ ...editForm, body: e.target.value })}
                rows={8}
                className="w-full mt-1 rounded-md border border-border bg-background px-3 py-2 text-[12px] focus:outline-none focus:ring-1 focus:ring-ring resize-y font-mono leading-relaxed"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={!editForm.title || !editForm.body} className="text-[12px]">
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Play Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Play</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-[12px] font-medium">Play Name</label>
              <Input
                value={newPlay.title}
                onChange={(e) =>
                  setNewPlay({ ...newPlay, title: e.target.value })
                }
                placeholder="Reddit Thread Monitor"
                className="text-[12px] h-8 mt-1"
              />
            </div>
            <div>
              <label className="text-[12px] font-medium">Category</label>
              <select
                value={newPlay.category}
                onChange={(e) =>
                  setNewPlay({ ...newPlay, category: e.target.value })
                }
                className="w-full h-8 mt-1 text-[12px] bg-background border border-border rounded-md px-2 focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="general">General</option>
                <option value="marketing">Marketing</option>
                <option value="sales">Sales</option>
                <option value="engineering">Engineering</option>
                <option value="research">Research</option>
                <option value="operations">Operations</option>
                <option value="content">Content</option>
              </select>
            </div>
            <SchedulePicker
              label="Schedule"
              value={newPlay.schedule}
              onChange={(cron) => setNewPlay({ ...newPlay, schedule: cron })}
            />
            <div>
              <label className="text-[12px] font-medium">
                Instructions
              </label>
              <textarea
                value={newPlay.body}
                onChange={(e) =>
                  setNewPlay({ ...newPlay, body: e.target.value })
                }
                placeholder="Describe what the agent should do when running this play..."
                rows={5}
                className="w-full mt-1 rounded-md border border-border bg-background px-3 py-2 text-[12px] focus:outline-none focus:ring-1 focus:ring-ring resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={handleCreate}
              disabled={!newPlay.title || !newPlay.body}
              className="text-[12px]"
            >
              Create Play
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
