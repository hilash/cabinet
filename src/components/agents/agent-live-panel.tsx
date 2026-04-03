"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  CheckCircle,
  XCircle,
  Clock,
  Zap,
  Loader2,
  X,
  Bot,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { WebTerminal } from "@/components/terminal/web-terminal";
import {
  useAIPanelStore,
  type AgentLiveSession,
} from "@/stores/ai-panel-store";

interface AgentPersona {
  name: string;
  role: string;
  slug: string;
  heartbeat: string;
  budget: number;
  active: boolean;
  heartbeatsUsed?: number;
  lastHeartbeat?: string;
  emoji?: string;
}

interface HeartbeatRecord {
  agentSlug: string;
  timestamp: string;
  duration: number;
  status: "completed" | "failed";
  summary: string;
}

interface AgentLivePanelProps {
  persona: AgentPersona;
  onBack: () => void;
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function formatDuration(ms: number): string {
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

export function AgentLivePanel({ persona, onBack }: AgentLivePanelProps) {
  const [history, setHistory] = useState<HeartbeatRecord[]>([]);
  const [expandedPast, setExpandedPast] = useState<Set<string>>(new Set());
  const [running, setRunning] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const {
    agentSessions,
    addAgentSession,
    markAgentSessionCompleted,
    removeAgentSession,
    restoreAgentSessionsFromStorage,
  } = useAIPanelStore();

  // Restore sessions from sessionStorage on mount
  useEffect(() => {
    restoreAgentSessionsFromStorage();
  }, [restoreAgentSessionsFromStorage]);

  const currentSessions = agentSessions.filter(
    (s) => s.slug === persona.slug && s.status === "running"
  );
  const otherRunningSessions = agentSessions.filter(
    (s) => s.slug !== persona.slug && s.status === "running"
  );

  const fetchHistory = useCallback(async () => {
    const res = await fetch(`/api/agents/personas/${persona.slug}`);
    if (res.ok) {
      const data = await res.json();
      setHistory((data.history || []).slice(0, 20));
    }
  }, [persona.slug]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // Scroll to bottom when new sessions appear
  useEffect(() => {
    if (currentSessions.length > 0 && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [currentSessions.length]);

  const handleRun = async () => {
    setRunning(true);
    try {
      const res = await fetch(`/api/agents/personas/${persona.slug}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "run" }),
      });
      const data = await res.json();
      if (data.ok && data.sessionId) {
        addAgentSession({
          sessionId: data.sessionId,
          slug: persona.slug,
          personaName: persona.name,
          personaEmoji: persona.emoji,
          timestamp: Date.now(),
          status: "running",
        });
      }
    } finally {
      setRunning(false);
    }
  };

  const handleSessionEnd = useCallback(
    async (sessionId: string) => {
      markAgentSessionCompleted(sessionId);
      // Refresh history after a brief delay to let post-processing catch up
      setTimeout(fetchHistory, 2000);
    },
    [markAgentSessionCompleted, fetchHistory]
  );

  const toggleExpanded = (id: string) => {
    setExpandedPast((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const hasAnySessions = currentSessions.length > 0 || history.length > 0;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 -ml-1"
            onClick={onBack}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Bot className="h-4 w-4 text-primary" />
          <span className="text-[13px] font-semibold tracking-[-0.02em]">
            {persona.emoji ? `${persona.emoji} ` : ""}{persona.name}
          </span>
          <span className="text-[11px] text-muted-foreground">{persona.heartbeat}</span>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <span>{persona.heartbeatsUsed || 0}/{persona.budget}</span>
        </div>
      </div>

      {/* Sessions area */}
      <div
        className={cn(
          "flex-1 min-h-0 flex flex-col",
          currentSessions.length === 0 && "overflow-y-auto"
        )}
        ref={scrollRef}
      >
        <div
          className={cn(
            "p-3 space-y-3",
            currentSessions.length > 0 ? "flex-1 flex flex-col" : ""
          )}
        >
          {/* Empty state */}
          {!hasAnySessions && !running && (
            <div className="text-center py-12 space-y-2">
              <Bot className="h-8 w-8 mx-auto text-muted-foreground/40" />
              <p className="text-[13px] text-muted-foreground">
                No sessions yet. Click Run Now to start.
              </p>
            </div>
          )}

          {/* Running on other agents */}
          {otherRunningSessions.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground/60 px-1">
                Running on other agents
              </div>
              {otherRunningSessions.map((session) => (
                <div
                  key={session.sessionId}
                  className="flex items-center gap-2 px-3 py-2 border border-[#ffffff08] rounded-lg text-[12px]"
                >
                  <Loader2 className="h-3 w-3 text-primary animate-spin shrink-0" />
                  <span className="truncate flex-1 text-muted-foreground">
                    {session.personaEmoji} {session.personaName}
                  </span>
                  <button
                    onClick={() => removeAgentSession(session.sessionId)}
                    className="text-muted-foreground/40 hover:text-destructive shrink-0"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Past sessions */}
          {history.length > 0 && (
            <div className="space-y-1.5">
              {currentSessions.length > 0 && (
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground/60 px-1">
                  Previous Sessions
                </div>
              )}
              {history.map((hb) => (
                <div
                  key={hb.timestamp}
                  className="border border-[#ffffff08] rounded-lg overflow-hidden"
                >
                  <button
                    onClick={() => toggleExpanded(hb.timestamp)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-accent/30 transition-colors"
                  >
                    {expandedPast.has(hb.timestamp) ? (
                      <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />
                    ) : (
                      <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
                    )}
                    {hb.status === "completed" ? (
                      <CheckCircle className="h-3 w-3 text-green-500 shrink-0" />
                    ) : (
                      <XCircle className="h-3 w-3 text-red-500 shrink-0" />
                    )}
                    <span className="text-[12px] text-muted-foreground flex-1">
                      {formatRelative(hb.timestamp)}
                    </span>
                    <span className="text-[10px] text-muted-foreground/60 shrink-0">
                      {formatDuration(hb.duration)}
                    </span>
                  </button>
                  {expandedPast.has(hb.timestamp) && (
                    <div className="border-t border-[#ffffff08] bg-[#0a0a0a]">
                      <pre className="text-[11px] text-muted-foreground p-3 whitespace-pre-wrap break-words max-h-[300px] overflow-y-auto font-mono leading-relaxed">
                        {hb.summary || "(No output captured)"}
                      </pre>
                      <div className="px-3 py-1.5 border-t border-[#ffffff08] flex items-center gap-3 text-[10px] text-muted-foreground/50">
                        <Clock className="h-2.5 w-2.5 inline mr-0.5" />
                        {formatDuration(hb.duration)}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Divider */}
          {history.length > 0 && currentSessions.length > 0 && (
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground/60 px-1 pt-2">
              Current Session
            </div>
          )}

          {/* Live running sessions */}
          {currentSessions.map((session, i) => (
            <div
              key={session.sessionId}
              className={cn(
                "space-y-2 flex flex-col",
                i === currentSessions.length - 1 ? "flex-1 min-h-0" : ""
              )}
            >
              <div className="flex items-center gap-2 shrink-0">
                <div className="bg-accent/50 rounded-lg px-3 py-2 text-[13px] leading-relaxed flex-1 flex items-center gap-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-primary shrink-0" />
                  Heartbeat running…
                </div>
                <button
                  onClick={() => removeAgentSession(session.sessionId)}
                  className="text-muted-foreground/40 hover:text-destructive shrink-0 p-1"
                  title="Dismiss"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="rounded-lg overflow-hidden border border-[#ffffff10] flex-1 min-h-[200px]">
                <WebTerminal
                  sessionId={session.sessionId}
                  reconnect={session.reconnect ?? true}
                  onClose={() => handleSessionEnd(session.sessionId)}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Hidden terminals for other running agent sessions — keep WS alive */}
      {otherRunningSessions.map((session) => (
        <div
          key={`hidden-${session.sessionId}`}
          style={{ width: 0, height: 0, overflow: "hidden", position: "absolute" }}
        >
          <WebTerminal
            sessionId={session.sessionId}
            reconnect={true}
            onClose={() => markAgentSessionCompleted(session.sessionId)}
          />
        </div>
      ))}

      {/* Bottom bar */}
      <div className="border-t border-border p-3 shrink-0 flex items-center gap-2">
        <Button
          variant="default"
          size="sm"
          className="gap-1.5"
          onClick={handleRun}
          disabled={running || !persona.active}
        >
          {running ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Zap className="h-3.5 w-3.5" />
          )}
          {running ? "Starting…" : "Run Now"}
        </Button>
        {!persona.active && (
          <span className="text-[11px] text-muted-foreground">Agent is paused</span>
        )}
      </div>
    </div>
  );
}
