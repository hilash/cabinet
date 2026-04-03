"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Bot,
  Square,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  Users,
  Activity,
  Play,
  Pause,
  Zap,
  MessageSquare,
  Brain,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { AgentLivePanel } from "./agent-live-panel";

interface AgentSession {
  id: string;
  taskId?: string;
  taskTitle: string;
  status: "running" | "completed" | "failed";
  startedAt: string;
  completedAt?: string;
  output: string;
}

interface AgentStats {
  active: number;
  completed: number;
  failed: number;
  totalRuns: number;
}

interface AgentPersona {
  name: string;
  role: string;
  slug: string;
  heartbeat: string;
  budget: number;
  active: boolean;
  tags: string[];
  focus: string[];
  heartbeatsUsed?: number;
  lastHeartbeat?: string;
}

interface HeartbeatRecord {
  agentSlug: string;
  timestamp: string;
  duration: number;
  status: "completed" | "failed";
  summary: string;
}

function PersonaCard({
  persona,
  onRefresh,
  onSelect,
}: {
  persona: AgentPersona;
  onRefresh: () => void;
  onSelect: (persona: AgentPersona) => void;
}) {
  const [toggling, setToggling] = useState(false);

  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setToggling(true);
    await fetch(`/api/agents/personas/${persona.slug}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "toggle" }),
    });
    setToggling(false);
    onRefresh();
  };

  return (
    <div
      className="bg-card border border-border rounded-lg overflow-hidden cursor-pointer hover:bg-accent/30 transition-colors"
      onClick={() => onSelect(persona)}
    >
      <div className="p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-2.5 h-2.5 rounded-full shrink-0",
              persona.active ? "bg-green-500" : "bg-muted-foreground/30"
            )} />
            <div>
              <p className="text-[13px] font-medium">{persona.name}</p>
              <p className="text-[11px] text-muted-foreground">{persona.role}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-[10px] gap-1"
              onClick={handleToggle}
              disabled={toggling}
            >
              {persona.active ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
              {persona.active ? "Pause" : "Activate"}
            </Button>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
          </div>
        </div>
        <div className="flex items-center gap-2 mt-2 ml-5.5">
          <span className="text-[9px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
            {persona.heartbeat}
          </span>
          <span className="text-[9px] text-muted-foreground">
            {persona.heartbeatsUsed || 0}/{persona.budget} heartbeats
          </span>
          {persona.lastHeartbeat && (
            <span className="text-[9px] text-muted-foreground">
              Last: {new Date(persona.lastHeartbeat).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
        </div>
        <div className="flex gap-1 mt-1.5 ml-5.5 flex-wrap">
          {persona.tags.map((tag) => (
            <span key={tag} className="text-[9px] bg-primary/10 text-primary px-1 py-0.5 rounded">{tag}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

export function AgentDashboard() {
  const [active, setActive] = useState<AgentSession[]>([]);
  const [recent, setRecent] = useState<AgentSession[]>([]);
  const [stats, setStats] = useState<AgentStats>({
    active: 0,
    completed: 0,
    failed: 0,
    totalRuns: 0,
  });
  const [personas, setPersonas] = useState<AgentPersona[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"sessions" | "team">("team");
  const [selectedPersona, setSelectedPersona] = useState<AgentPersona | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [sessionsRes, personasRes] = await Promise.all([
        fetch("/api/agents"),
        fetch("/api/agents/personas"),
      ]);
      const sessionsData = await sessionsRes.json();
      setActive(sessionsData.active || []);
      setRecent(sessionsData.recent || []);
      setStats(sessionsData.stats || { active: 0, completed: 0, failed: 0, totalRuns: 0 });

      if (personasRes.ok) {
        const personasData = await personasRes.json();
        setPersonas(personasData.personas || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 10000);
    return () => clearInterval(interval);
  }, [refresh]);

  const handleStop = async (id: string) => {
    await fetch(`/api/agents/${id}`, { method: "DELETE" });
    refresh();
  };

  const formatDuration = (start: string, end?: string) => {
    const s = new Date(start).getTime();
    const e = end ? new Date(end).getTime() : Date.now();
    const secs = Math.floor((e - s) / 1000);
    if (secs < 60) return `${secs}s`;
    const mins = Math.floor(secs / 60);
    return `${mins}m ${secs % 60}s`;
  };

  const formatTime = (iso: string) => {
    return new Date(iso).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
        Loading...
      </div>
    );
  }

  // Show live panel when a persona is selected
  if (selectedPersona) {
    return (
      <AgentLivePanel
        persona={selectedPersona}
        onBack={() => setSelectedPersona(null)}
      />
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4" />
          <h2 className="text-[15px] font-semibold tracking-[-0.02em]">
            Agent Dashboard
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-muted rounded-md p-0.5">
            <button
              onClick={() => setTab("team")}
              className={cn(
                "flex items-center gap-1 px-2 py-1 rounded text-[11px] transition-colors",
                tab === "team" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
              )}
            >
              <Users className="h-3 w-3" />
              Team
            </button>
            <button
              onClick={() => setTab("sessions")}
              className={cn(
                "flex items-center gap-1 px-2 py-1 rounded text-[11px] transition-colors",
                tab === "sessions" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
              )}
            >
              <Activity className="h-3 w-3" />
              Sessions
            </button>
          </div>
          <Button variant="ghost" size="sm" className="h-7 gap-1.5" onClick={refresh}>
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {tab === "team" ? (
            <>
              {/* Stats row */}
              <div className="grid grid-cols-4 gap-3">
                <div className="bg-card border border-border rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">Agents</p>
                  <p className="text-2xl font-semibold mt-1">{personas.length}</p>
                </div>
                <div className="bg-card border border-border rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">Active</p>
                  <p className="text-2xl font-semibold mt-1 text-green-500">
                    {personas.filter((p) => p.active).length}
                  </p>
                </div>
                <div className="bg-card border border-border rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">Heartbeats Today</p>
                  <p className="text-2xl font-semibold mt-1 text-blue-500">
                    {personas.reduce((sum, p) => sum + (p.heartbeatsUsed || 0), 0)}
                  </p>
                </div>
                <div className="bg-card border border-border rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">Sessions</p>
                  <p className="text-2xl font-semibold mt-1">{stats.totalRuns}</p>
                </div>
              </div>

              {/* Agent personas */}
              <div>
                <h3 className="text-[13px] font-semibold mb-3">
                  AI Team ({personas.length})
                </h3>
                {personas.length === 0 ? (
                  <p className="text-[13px] text-muted-foreground">
                    No agents configured. Add .md files to /data/.agents/
                  </p>
                ) : (
                  <div className="space-y-2">
                    {personas.map((persona) => (
                      <PersonaCard
                        key={persona.slug}
                        persona={persona}
                        onRefresh={refresh}
                        onSelect={setSelectedPersona}
                      />
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              {/* Stats */}
              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: "Active", value: stats.active, color: "text-green-500" },
                  { label: "Completed", value: stats.completed, color: "text-blue-500" },
                  { label: "Failed", value: stats.failed, color: "text-red-500" },
                  { label: "Total Runs", value: stats.totalRuns, color: "text-foreground" },
                ].map((stat) => (
                  <div key={stat.label} className="bg-card border border-border rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                    <p className={cn("text-2xl font-semibold mt-1", stat.color)}>{stat.value}</p>
                  </div>
                ))}
              </div>

              {/* Active Sessions */}
              <div>
                <h3 className="text-[13px] font-semibold mb-3">Active Sessions ({active.length})</h3>
                {active.length === 0 ? (
                  <p className="text-[13px] text-muted-foreground">No agents currently running</p>
                ) : (
                  <div className="space-y-2">
                    {active.map((session) => (
                      <div key={session.id} className="bg-card border border-border rounded-lg p-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                          <div>
                            <p className="text-[13px] font-medium">{session.taskTitle}</p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Running {formatDuration(session.startedAt)}
                            </p>
                          </div>
                        </div>
                        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => handleStop(session.id)}>
                          <Square className="h-3 w-3 mr-1" />
                          Stop
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Recent Completions */}
              <div>
                <h3 className="text-[13px] font-semibold mb-3">Recent Completions</h3>
                {recent.length === 0 ? (
                  <p className="text-[13px] text-muted-foreground">No recent agent runs</p>
                ) : (
                  <div className="space-y-2">
                    {recent.map((session) => (
                      <div key={session.id} className="bg-card border border-border rounded-lg p-3">
                        <div className="flex items-center gap-2">
                          {session.status === "completed" ? (
                            <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-500 shrink-0" />
                          )}
                          <p className="text-[13px] font-medium flex-1">{session.taskTitle}</p>
                          <span className="text-xs text-muted-foreground">{formatTime(session.completedAt || session.startedAt)}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 ml-6">
                          Duration: {formatDuration(session.startedAt, session.completedAt)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
