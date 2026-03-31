"use client";

import { useEffect, useState, useCallback } from "react";
import {
  ArrowLeft,
  Play,
  Pause,
  FileText,
  Briefcase,
  Wrench,
  Clock,
  Target,
  Zap,
  CheckCircle,
  XCircle,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAppStore } from "@/stores/app-store";
import { cn } from "@/lib/utils";

type TabId = "definition" | "jobs" | "skills" | "sessions" | "goals";

interface AgentPersona {
  name: string;
  slug: string;
  emoji: string;
  type: string;
  department: string;
  role: string;
  active: boolean;
  heartbeat: string;
  budget: number;
  body: string;
  workspace: string;
  channels: string[];
  goals: GoalMetric[];
  plays: string[];
  tags: string[];
  focus: string[];
  heartbeatsUsed?: number;
  lastHeartbeat?: string;
  nextHeartbeat?: string;
}

interface GoalMetric {
  metric: string;
  target: number;
  current: number;
  unit: string;
  period?: string;
}

interface HeartbeatRecord {
  agentSlug: string;
  timestamp: string;
  duration: number;
  status: "completed" | "failed";
  summary: string;
}

interface JobDef {
  name: string;
  slug: string;
  schedule?: { cron?: string; type?: string; every?: string };
  enabled?: boolean;
}

interface SkillDef {
  name: string;
  slug: string;
  description: string;
  type: string;
}

const TABS: { id: TabId; label: string; icon: typeof FileText }[] = [
  { id: "definition", label: "Definition", icon: FileText },
  { id: "jobs", label: "Jobs", icon: Briefcase },
  { id: "skills", label: "Skills", icon: Wrench },
  { id: "sessions", label: "Sessions", icon: Clock },
  { id: "goals", label: "Goals", icon: Target },
];

function DefinitionTab({ persona }: { persona: AgentPersona }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-muted/30 rounded-lg p-3">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
            Department
          </p>
          <p className="text-[13px] font-medium mt-0.5 capitalize">
            {persona.department}
          </p>
        </div>
        <div className="bg-muted/30 rounded-lg p-3">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
            Type
          </p>
          <p className="text-[13px] font-medium mt-0.5 capitalize">
            {persona.type}
          </p>
        </div>
        <div className="bg-muted/30 rounded-lg p-3">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
            Heartbeat
          </p>
          <p className="text-[13px] font-medium mt-0.5 font-mono">
            {persona.heartbeat}
          </p>
        </div>
        <div className="bg-muted/30 rounded-lg p-3">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
            Budget
          </p>
          <p className="text-[13px] font-medium mt-0.5">
            {persona.heartbeatsUsed || 0}/{persona.budget} runs/month
          </p>
        </div>
        <div className="bg-muted/30 rounded-lg p-3">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
            Workspace
          </p>
          <p className="text-[13px] font-medium mt-0.5 font-mono">
            {persona.workspace || "/"}
          </p>
        </div>
        <div className="bg-muted/30 rounded-lg p-3">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
            Channels
          </p>
          <p className="text-[13px] font-medium mt-0.5">
            {(persona.channels || []).map((c) => `#${c}`).join(", ") || "None"}
          </p>
        </div>
      </div>

      {persona.tags.length > 0 && (
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">
            Tags
          </p>
          <div className="flex gap-1 flex-wrap">
            {persona.tags.map((tag) => (
              <span
                key={tag}
                className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      <div>
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">
          Persona Instructions
        </p>
        <div className="bg-muted/20 border border-border rounded-lg p-4">
          <pre className="text-[12px] whitespace-pre-wrap font-sans leading-relaxed">
            {persona.body}
          </pre>
        </div>
      </div>
    </div>
  );
}

function JobsTab({ slug }: { slug: string }) {
  const [jobs, setJobs] = useState<JobDef[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/plays?agent=${slug}`)
      .then((r) => r.json())
      .then((data) => setJobs(data.plays || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return <p className="text-[13px] text-muted-foreground">Loading jobs...</p>;
  }

  if (jobs.length === 0) {
    return (
      <div className="text-center py-8">
        <Briefcase className="h-8 w-8 mx-auto text-muted-foreground/30" />
        <p className="text-[13px] text-muted-foreground mt-2">
          No jobs configured for this agent
        </p>
        <p className="text-[11px] text-muted-foreground mt-1">
          Jobs are recurring scheduled tasks the agent runs automatically
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {jobs.map((job) => (
        <div
          key={job.slug}
          className="bg-card border border-border rounded-lg p-3"
        >
          <div className="flex items-center justify-between">
            <h4 className="text-[13px] font-medium">{job.name}</h4>
            <span className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
              {job.schedule?.cron || job.schedule?.every || "manual"}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function SkillsTab({ slug }: { slug: string }) {
  const [skills, setSkills] = useState<SkillDef[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Skills are stored as files in the agent's skills/ directory
    // For now, we show a placeholder since the skills API isn't built yet
    setLoading(false);
  }, [slug]);

  if (loading) {
    return (
      <p className="text-[13px] text-muted-foreground">Loading skills...</p>
    );
  }

  return (
    <div className="text-center py-8">
      <Wrench className="h-8 w-8 mx-auto text-muted-foreground/30" />
      <p className="text-[13px] text-muted-foreground mt-2">
        No skills configured
      </p>
      <p className="text-[11px] text-muted-foreground mt-1">
        Skills define the tools and capabilities available to this agent
      </p>
    </div>
  );
}

function SessionsTab({
  history,
}: {
  history: HeartbeatRecord[];
}) {
  if (history.length === 0) {
    return (
      <div className="text-center py-8">
        <Clock className="h-8 w-8 mx-auto text-muted-foreground/30" />
        <p className="text-[13px] text-muted-foreground mt-2">
          No sessions yet
        </p>
        <p className="text-[11px] text-muted-foreground mt-1">
          Sessions appear here when the agent runs
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {history.map((hb, i) => (
        <div
          key={i}
          className="bg-card border border-border rounded-lg p-3"
        >
          <div className="flex items-center gap-2">
            {hb.status === "completed" ? (
              <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
            ) : (
              <XCircle className="h-4 w-4 text-red-500 shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-[12px] text-muted-foreground">
                {new Date(hb.timestamp).toLocaleString([], {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
                <span className="ml-2">
                  {Math.round(hb.duration / 1000)}s
                </span>
              </p>
              <p className="text-[12px] mt-0.5 truncate">{hb.summary}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function GoalsTab({ goals }: { goals: GoalMetric[] }) {
  if (goals.length === 0) {
    return (
      <div className="text-center py-8">
        <Target className="h-8 w-8 mx-auto text-muted-foreground/30" />
        <p className="text-[13px] text-muted-foreground mt-2">
          No goals configured
        </p>
        <p className="text-[11px] text-muted-foreground mt-1">
          Goals track agent performance metrics over time
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {goals.map((goal) => {
        const pct = goal.target > 0
          ? Math.min(100, Math.round((goal.current / goal.target) * 100))
          : 0;
        return (
          <div
            key={goal.metric}
            className="bg-card border border-border rounded-lg p-3"
          >
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-[13px] font-medium capitalize">
                {goal.metric.replace(/_/g, " ")}
              </h4>
              <span className="text-[11px] text-muted-foreground">
                {goal.current}/{goal.target} {goal.unit}
                {goal.period ? ` / ${goal.period}` : ""}
              </span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  pct >= 100
                    ? "bg-green-500"
                    : pct >= 60
                      ? "bg-blue-500"
                      : pct >= 30
                        ? "bg-yellow-500"
                        : "bg-red-500"
                )}
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">{pct}%</p>
          </div>
        );
      })}
    </div>
  );
}

export function AgentDetail({ slug }: { slug: string }) {
  const [persona, setPersona] = useState<AgentPersona | null>(null);
  const [history, setHistory] = useState<HeartbeatRecord[]>([]);
  const [activeTab, setActiveTab] = useState<TabId>("definition");
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [toggling, setToggling] = useState(false);
  const setSection = useAppStore((s) => s.setSection);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/agents/personas/${slug}`);
      if (res.ok) {
        const data = await res.json();
        setPersona(data.persona);
        setHistory(data.history || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleRun = async () => {
    setRunning(true);
    await fetch(`/api/agents/personas/${slug}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "run" }),
    });
    setTimeout(() => {
      setRunning(false);
      refresh();
    }, 2000);
  };

  const handleToggle = async () => {
    setToggling(true);
    await fetch(`/api/agents/personas/${slug}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "toggle" }),
    });
    setToggling(false);
    refresh();
  };

  if (loading || !persona) {
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
            onClick={() => setSection({ type: "agents" })}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <span className="text-xl">{persona.emoji}</span>
          <div>
            <h2 className="text-[15px] font-semibold tracking-[-0.02em]">
              {persona.name}
            </h2>
            <p className="text-[11px] text-muted-foreground">{persona.role}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={handleRun}
            disabled={running}
          >
            <Zap className="h-3 w-3" />
            {running ? "Running..." : "Run"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={handleToggle}
            disabled={toggling}
          >
            {persona.active ? (
              <Pause className="h-3 w-3" />
            ) : (
              <Play className="h-3 w-3" />
            )}
            {persona.active ? "Pause" : "Activate"}
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={refresh}>
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-0 px-4 border-b border-border">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2.5 text-[12px] font-medium border-b-2 transition-colors",
                activeTab === tab.id
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          {activeTab === "definition" && <DefinitionTab persona={persona} />}
          {activeTab === "jobs" && <JobsTab slug={slug} />}
          {activeTab === "skills" && <SkillsTab slug={slug} />}
          {activeTab === "sessions" && <SessionsTab history={history} />}
          {activeTab === "goals" && <GoalsTab goals={persona.goals || []} />}
        </div>
      </ScrollArea>
    </div>
  );
}
