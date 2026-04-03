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
  Download,
  Search,
  Library,
  ChevronRight,
} from "lucide-react";
import type { PlayDefinition, CatalogPlayDefinition } from "@/types/agents";
import { IntegrationBadges } from "@/components/integrations/integration-icon";
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

const categoryIcons: Record<string, string> = {
  marketing: "📣",
  engineering: "🛠",
  research: "🔬",
  operations: "⚙️",
  sales: "💼",
  content: "📝",
  product: "📊",
  "customer-success": "🤝",
  general: "⚡",
};

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

  // Catalog state
  const [activeTab, setActiveTab] = useState<"plays" | "catalog">("plays");
  const [catalogPlays, setCatalogPlays] = useState<CatalogPlayDefinition[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState("");
  const [catalogCategory, setCatalogCategory] = useState<string>("all");
  const [expandedCatalog, setExpandedCatalog] = useState<string | null>(null);
  const [installing, setInstalling] = useState<string | null>(null);

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

  const loadCatalog = useCallback(async () => {
    setCatalogLoading(true);
    try {
      const res = await fetch("/api/plays/catalog");
      if (res.ok) {
        const data = await res.json();
        setCatalogPlays(data.plays || []);
      }
    } catch {
      // ignore
    } finally {
      setCatalogLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (activeTab === "catalog" && catalogPlays.length === 0) {
      loadCatalog();
    }
  }, [activeTab, catalogPlays.length, loadCatalog]);

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

  const handleInstall = async (slug: string) => {
    setInstalling(slug);
    try {
      const res = await fetch("/api/plays/catalog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug }),
      });
      if (res.ok) {
        refresh();
      }
    } catch {
      // ignore
    } finally {
      setInstalling(null);
    }
  };

  const installedSlugs = new Set(plays.map((p) => p.slug));

  // Filter catalog
  const filteredCatalog = catalogPlays.filter((p) => {
    if (catalogCategory !== "all" && p.category !== catalogCategory) return false;
    if (catalogSearch) {
      const q = catalogSearch.toLowerCase();
      return (
        p.title.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.body.toLowerCase().includes(q) ||
        p.integrations?.some((i) => i.name.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const catalogCategories = Array.from(new Set(catalogPlays.map((p) => p.category))).sort();

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
        Loading...
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header with tabs */}
      <div className="border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            <h2 className="text-[15px] font-semibold tracking-[-0.02em]">
              Plays
            </h2>
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1.5"
              onClick={() => { refresh(); if (activeTab === "catalog") loadCatalog(); }}
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
            {activeTab === "plays" && (
              <Button
                variant="default"
                size="sm"
                className="h-7 gap-1.5"
                onClick={() => setCreateOpen(true)}
              >
                <Plus className="h-3.5 w-3.5" />
                New Play
              </Button>
            )}
          </div>
        </div>
        {/* Tabs */}
        <div className="flex px-4 gap-0">
          <button
            className={cn(
              "px-3 pb-2 text-[12px] font-medium border-b-2 transition-colors",
              activeTab === "plays"
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
            onClick={() => setActiveTab("plays")}
          >
            <Zap className="h-3 w-3 inline mr-1.5" />
            My Plays
            {plays.length > 0 && (
              <span className="ml-1.5 text-[10px] text-muted-foreground/50">{plays.length}</span>
            )}
          </button>
          <button
            className={cn(
              "px-3 pb-2 text-[12px] font-medium border-b-2 transition-colors",
              activeTab === "catalog"
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
            onClick={() => setActiveTab("catalog")}
          >
            <Library className="h-3 w-3 inline mr-1.5" />
            Catalog
            {catalogPlays.length > 0 && (
              <span className="ml-1.5 text-[10px] text-muted-foreground/50">{catalogPlays.length}</span>
            )}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {activeTab === "plays" ? (
          /* ==================== MY PLAYS TAB ==================== */
          <div className="p-4 space-y-2">
            {plays.length === 0 ? (
              <div className="text-center py-12 space-y-3">
                <Zap className="h-10 w-10 mx-auto text-muted-foreground/20" />
                <div>
                  <p className="text-[13px] font-medium text-muted-foreground">
                    No active plays
                  </p>
                  <p className="text-[12px] text-muted-foreground/60">
                    Install plays from the Catalog or create your own.
                  </p>
                </div>
                <div className="flex gap-2 justify-center">
                  <Button
                    variant="default"
                    size="sm"
                    className="text-[12px] gap-1.5"
                    onClick={() => setActiveTab("catalog")}
                  >
                    <Library className="h-3 w-3" />
                    Browse Catalog
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-[12px] gap-1.5"
                    onClick={() => setCreateOpen(true)}
                  >
                    <Plus className="h-3 w-3" />
                    Create Play
                  </Button>
                </div>
              </div>
            ) : (
              (() => {
                const groups = new Map<string, PlayDefinition[]>();
                for (const play of plays) {
                  const cat = play.category || "general";
                  if (!groups.has(cat)) groups.set(cat, []);
                  groups.get(cat)!.push(play);
                }
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
                        <Button variant="ghost" size="icon" className="h-7 w-7" title="Edit play" onClick={(e) => { e.stopPropagation(); handleEdit(play); }}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" title="Duplicate play" onClick={(e) => { e.stopPropagation(); handleDuplicate(play); }}>
                          <Copy className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); handleDelete(play.slug); }}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>

                    {expandedPlay === play.slug && (
                      <div className="mt-3 pt-3 border-t border-border/30 space-y-3" onClick={(e) => e.stopPropagation()}>
                        {play.body && (
                          <div>
                            <h4 className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-wider mb-1.5">Instructions</h4>
                            <div className="text-[12px] text-foreground/80 leading-relaxed whitespace-pre-wrap bg-muted/20 rounded-md p-3 max-h-[200px] overflow-y-auto">
                              {play.body}
                            </div>
                          </div>
                        )}
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
        ) : (
          /* ==================== CATALOG TAB ==================== */
          <div className="p-4 space-y-4">
            {/* Search + filter */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
                <Input
                  value={catalogSearch}
                  onChange={(e) => setCatalogSearch(e.target.value)}
                  placeholder="Search plays, integrations..."
                  className="pl-8 h-8 text-[12px]"
                />
              </div>
              <select
                value={catalogCategory}
                onChange={(e) => setCatalogCategory(e.target.value)}
                className="h-8 text-[12px] bg-background border border-border rounded-md px-2 focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="all">All categories</option>
                {catalogCategories.map((cat) => (
                  <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
                ))}
              </select>
            </div>

            {catalogLoading ? (
              <div className="text-center py-12 text-muted-foreground text-sm">Loading catalog...</div>
            ) : filteredCatalog.length === 0 ? (
              <div className="text-center py-12 space-y-2">
                <Library className="h-10 w-10 mx-auto text-muted-foreground/20" />
                <p className="text-[13px] text-muted-foreground">No plays match your search.</p>
              </div>
            ) : (
              (() => {
                const groups = new Map<string, CatalogPlayDefinition[]>();
                for (const play of filteredCatalog) {
                  const cat = play.category || "general";
                  if (!groups.has(cat)) groups.set(cat, []);
                  groups.get(cat)!.push(play);
                }
                return Array.from(groups.entries()).map(([category, catPlays]) => (
                  <div key={category} className="space-y-2">
                    <div className="flex items-center gap-2 pt-2 pb-1">
                      <span className="text-sm">{categoryIcons[category] || "⚡"}</span>
                      <h3 className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground/70 capitalize">
                        {category.replace(/-/g, " ")}
                      </h3>
                      <span className="text-[10px] text-muted-foreground/40">
                        {catPlays.length} play{catPlays.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                    {catPlays.map((play) => {
                      const isInstalled = installedSlugs.has(play.slug);
                      const isExpanded = expandedCatalog === play.slug;
                      return (
                        <div
                          key={play.slug}
                          className={cn(
                            "bg-card border rounded-lg p-4 transition-colors cursor-pointer",
                            isExpanded ? "border-primary/30 bg-primary/[0.02]" : "border-border hover:border-border/80"
                          )}
                          onClick={() => setExpandedCatalog(isExpanded ? null : play.slug)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Zap className="h-4 w-4 text-primary/60 shrink-0" />
                                <h3 className="text-[13px] font-semibold">{play.title}</h3>
                                {isInstalled && (
                                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 font-medium">
                                    Installed
                                  </span>
                                )}
                                {play.estimated_duration && (
                                  <span className="text-[10px] text-muted-foreground/40">
                                    ~{play.estimated_duration}
                                  </span>
                                )}
                              </div>
                              {/* Integration badges */}
                              {play.integrations && play.integrations.length > 0 && (
                                <IntegrationBadges
                                  integrations={play.integrations}
                                  size="sm"
                                  showLabel={true}
                                  maxVisible={6}
                                  className="mt-1.5 ml-6"
                                />
                              )}
                              {/* First line of body as description */}
                              {play.body && (
                                <p className="text-[11px] text-muted-foreground/50 mt-1.5 ml-6 line-clamp-2">
                                  {play.body.split("\n").filter((l) => l.trim() && !l.startsWith("#") && !l.startsWith("##"))[0]?.slice(0, 250)}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-1 shrink-0 ml-2">
                              {isInstalled ? (
                                <span className="text-[11px] text-emerald-500 font-medium px-2">
                                  <CheckCircle className="h-3.5 w-3.5 inline mr-1" />
                                  Active
                                </span>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 text-xs gap-1"
                                  disabled={installing === play.slug}
                                  onClick={(e) => { e.stopPropagation(); handleInstall(play.slug); }}
                                >
                                  <Download className="h-3 w-3" />
                                  {installing === play.slug ? "Installing..." : "Install"}
                                </Button>
                              )}
                              <ChevronRight className={cn("h-3.5 w-3.5 text-muted-foreground/30 transition-transform", isExpanded && "rotate-90")} />
                            </div>
                          </div>

                          {/* Expanded detail */}
                          {isExpanded && (
                            <div className="mt-3 pt-3 border-t border-border/30 space-y-3" onClick={(e) => e.stopPropagation()}>
                              {/* Integrations (expanded — larger icons with labels) */}
                              {play.integrations && play.integrations.length > 0 && (
                                <div>
                                  <h4 className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-wider mb-1.5">Integrations</h4>
                                  <IntegrationBadges
                                    integrations={play.integrations}
                                    size="md"
                                    showLabel={true}
                                  />
                                </div>
                              )}
                              {/* Inputs / Outputs */}
                              {play.inputs && play.inputs.length > 0 && (
                                <div>
                                  <h4 className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-wider mb-1.5">Inputs</h4>
                                  <div className="flex flex-wrap gap-1.5">
                                    {play.inputs.map((inp) => (
                                      <span key={inp.name} className="text-[10px] px-2 py-1 rounded-md bg-muted text-muted-foreground" title={inp.description}>
                                        {inp.name} <span className="text-muted-foreground/40">({inp.type})</span>
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {play.outputs && play.outputs.length > 0 && (
                                <div>
                                  <h4 className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-wider mb-1.5">Outputs</h4>
                                  <div className="flex flex-wrap gap-1.5">
                                    {play.outputs.map((out) => (
                                      <span key={out.name} className="text-[10px] px-2 py-1 rounded-md bg-emerald-500/5 text-emerald-600" title={out.description}>
                                        {out.name} <span className="opacity-50">({out.type})</span>
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {/* Triggers */}
                              {play.triggers && play.triggers.length > 0 && (
                                <div>
                                  <h4 className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-wider mb-1.5">Triggers</h4>
                                  <div className="flex flex-wrap gap-1.5">
                                    {play.triggers.map((t, ti) => (
                                      <span key={ti} className="text-[10px] px-2 py-1 rounded-md bg-blue-500/10 text-blue-500 font-medium">
                                        {typeof t === "object" && "type" in t ? (t.type as string).replace(/_/g, " ") : String(t)}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {/* Full instructions */}
                              {play.body && (
                                <div>
                                  <h4 className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-wider mb-1.5">Instructions</h4>
                                  <div className="text-[12px] text-foreground/80 leading-relaxed whitespace-pre-wrap bg-muted/20 rounded-md p-3 max-h-[300px] overflow-y-auto">
                                    {play.body}
                                  </div>
                                </div>
                              )}
                              {/* Install button at bottom */}
                              {!isInstalled && (
                                <Button
                                  variant="default"
                                  size="sm"
                                  className="text-[12px] gap-1.5"
                                  disabled={installing === play.slug}
                                  onClick={() => handleInstall(play.slug)}
                                >
                                  <Download className="h-3 w-3" />
                                  {installing === play.slug ? "Installing..." : "Install Play"}
                                </Button>
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
          </div>
        )}
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
                <option value="product">Product</option>
                <option value="customer-success">Customer Success</option>
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
                <option value="product">Product</option>
                <option value="customer-success">Customer Success</option>
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
