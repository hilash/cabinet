"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Bot,
  Settings,
  Zap,
  Pause,
  Play,
  CheckCircle,
  XCircle,
  Brain,
  Send,
  Clock,
  Terminal,
  FileText,
  FolderOpen,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useAIPanelStore } from "@/stores/ai-panel-store";
import { WebTerminal } from "@/components/terminal/web-terminal";
import { Loader2 } from "lucide-react";
import { MentionInput, fetchMentionedPagesContext } from "@/components/shared/mention-input";

interface HeartbeatRecord {
  agentSlug: string;
  timestamp: string;
  duration: number;
  status: "completed" | "failed";
  summary: string;
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
  body: string;
  heartbeatsUsed?: number;
  lastHeartbeat?: string;
}

interface AgentDetail {
  persona: AgentPersona;
  memory: Record<string, string>;
  inbox: Array<{ from: string; timestamp: string; message: string }>;
  history: HeartbeatRecord[];
}

type SidePanel = "sessions" | "outputs" | "goals" | "memory" | "config";

export function AgentSessionView({ slug }: { slug: string }) {
  const [detail, setDetail] = useState<AgentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidePanel, setSidePanel] = useState<SidePanel>("sessions");
  const [selectedSession, setSelectedSession] = useState<HeartbeatRecord | null>(null);
  const [sending, setSending] = useState(false);
  const [manualOutput, setManualOutput] = useState<string | null>(null);
  const [toggling, setToggling] = useState(false);
  const [personaEdit, setPersonaEdit] = useState("");
  const [savingPersona, setSavingPersona] = useState(false);
  // Editor agent: selected editor session (live or completed)
  const [selectedEditorSession, setSelectedEditorSession] = useState<string | null>(null);
  const [editorSessionOutput, setEditorSessionOutput] = useState<string | null>(null);
  const [loadingEditorOutput, setLoadingEditorOutput] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/agents/personas/${slug}`);
      if (res.ok) {
        const data = await res.json();
        setDetail(data);
        // Auto-select latest session
        if (data.history?.length > 0 && !selectedSession) {
          setSelectedSession(data.history[0]);
        }
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [slug, selectedSession]);

  useEffect(() => {
    setLoading(true);
    setDetail(null);
    setSelectedSession(null);
    setManualOutput(null);
    setSidePanel("sessions");
    refresh();
  }, [slug]);

  useEffect(() => {
    const interval = setInterval(refresh, 15000);
    return () => clearInterval(interval);
  }, [refresh]);

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

  const handleRunNow = async () => {
    await fetch(`/api/agents/personas/${slug}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "run" }),
    });
    setTimeout(refresh, 3000);
  };

  const handleSendPrompt = async (text: string, mentionedPages: string[]) => {
    if (!text.trim() || !detail) return;
    setSending(true);
    setManualOutput(null);
    setSelectedSession(null);

    try {
      const contextBlock = await fetchMentionedPagesContext(mentionedPages);
      const fullPrompt = `${detail.persona.body}\n\n---\n\nUser request: ${text}${contextBlock}`;
      const res = await fetch("/api/agents/headless", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: fullPrompt }),
      });
      if (res.ok) {
        const data = await res.json();
        setManualOutput(data.output || "No output");
      } else {
        setManualOutput("Error: " + (await res.json()).error);
      }
    } catch (err) {
      setManualOutput("Error: " + (err instanceof Error ? err.message : "Unknown"));
    }
    setSending(false);
    refresh();
  };

  const isEditorAgent = slug === "editor";

  // Fetch full editor session output when selecting one (must be before early return)
  const handleSelectEditorSession = useCallback(async (sessionId: string) => {
    setSelectedEditorSession(sessionId);
    setSelectedSession(null);
    setManualOutput(null);
    setLoadingEditorOutput(true);

    const liveSession = useAIPanelStore.getState().editorSessions.find(
      (s) => s.sessionId === sessionId
    );

    if (liveSession && liveSession.status === "running") {
      try {
        const res = await fetch(`http://localhost:3001/session/${sessionId}/output`);
        if (res.ok) {
          const data = await res.json();
          setEditorSessionOutput(data.output || "(Session is running...)");
        } else {
          setEditorSessionOutput("(Session is running — output will appear when complete)");
        }
      } catch {
        setEditorSessionOutput("(Session is running...)");
      }
    } else {
      try {
        const res = await fetch(`/api/agents/editor-sessions?id=${sessionId}`);
        if (res.ok) {
          const data = await res.json();
          setEditorSessionOutput(data?.output || data?.summary || "(No output captured)");
        } else {
          setEditorSessionOutput("(Session not found)");
        }
      } catch {
        setEditorSessionOutput("(Failed to load session)");
      }
    }
    setLoadingEditorOutput(false);
  }, []);

  if (loading || !detail) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
        Loading agent...
      </div>
    );
  }

  const { persona, memory, inbox, history } = detail;

  const mainContent = manualOutput
    ? manualOutput
    : editorSessionOutput
    ? editorSessionOutput
    : selectedSession
    ? selectedSession.summary
    : history.length > 0
    ? history[0].summary
    : isEditorAgent
    ? "Select a session to view its Claude Code output, or use the AI Editor panel on any page."
    : "No sessions yet. Click 'Run Now' or send a prompt below.";

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-3">
          <span className="text-xl">{(persona as AgentPersona & { emoji?: string }).emoji || "🤖"}</span>
          <div>
            <h2 className="text-[15px] font-semibold tracking-[-0.02em]">
              {persona.name}
            </h2>
            <p className="text-[11px] text-muted-foreground">
              {persona.role}
              {(persona as AgentPersona & { department?: string }).department && (persona as AgentPersona & { department?: string }).department !== "general" && (
                <> · <span className="capitalize">{(persona as AgentPersona & { department?: string }).department}</span></>
              )}
              {' · '}{persona.heartbeat} · {persona.heartbeatsUsed || 0}/{persona.budget} heartbeats
            </p>
          </div>
          <div className={cn(
            "w-2 h-2 rounded-full",
            persona.active ? "bg-green-500" : "bg-muted-foreground/30"
          )} />
        </div>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={handleRunNow}>
            <Zap className="h-3 w-3" />
            Run Now
          </Button>
          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={handleToggle} disabled={toggling}>
            {persona.active ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
            {persona.active ? "Pause" : "Activate"}
          </Button>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left panel — sessions/memory/inbox */}
        <div className="w-[220px] min-w-[220px] border-r border-border flex flex-col overflow-hidden">
          {/* Panel tabs */}
          <div className="flex border-b border-border">
            {(["sessions", "outputs", "goals", "memory", "config"] as SidePanel[]).map((panel) => (
              <button
                key={panel}
                onClick={() => setSidePanel(panel)}
                className={cn(
                  "flex-1 py-1.5 text-[10px] font-medium transition-colors text-center capitalize",
                  sidePanel === panel
                    ? "text-foreground border-b-2 border-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {panel}
              </button>
            ))}
          </div>

          <ScrollArea className="flex-1">
            {sidePanel === "sessions" && (
              <div className="p-2 space-y-1">
                {/* Live running editor sessions (from Zustand store) */}
                {slug === "editor" && (
                  <EditorLiveSessions
                    selectedId={selectedEditorSession}
                    onSelect={handleSelectEditorSession}
                  />
                )}
                {manualOutput && (
                  <button
                    onClick={() => { setSelectedSession(null); }}
                    className={cn(
                      "flex items-center gap-2 w-full px-2 py-1.5 rounded text-[11px] transition-colors text-left",
                      !selectedSession ? "bg-accent" : "hover:bg-accent/50"
                    )}
                  >
                    <Terminal className="h-3 w-3 text-blue-400 shrink-0" />
                    <span className="truncate">Manual prompt</span>
                  </button>
                )}
                {history.length === 0 && !manualOutput && slug !== "editor" && (
                  <p className="text-[11px] text-muted-foreground px-2 py-4">No sessions yet</p>
                )}
                {history.map((hb, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setSelectedSession(hb);
                      setManualOutput(null);
                      setSelectedEditorSession(null);
                      setEditorSessionOutput(null);
                      // For editor agent, also try to fetch full output
                      if (isEditorAgent) {
                        // The summary has format [pagePath] instruction
                        // Try to find the session in editor-sessions.jsonl by timestamp
                        (async () => {
                          try {
                            const res = await fetch(`/api/agents/editor-sessions?limit=100`);
                            if (res.ok) {
                              const sessions = await res.json();
                              const match = sessions.find((s: { timestamp: string }) =>
                                Math.abs(new Date(s.timestamp).getTime() - new Date(hb.timestamp).getTime()) < 2000
                              );
                              if (match?.id) {
                                const detailRes = await fetch(`/api/agents/editor-sessions?id=${match.id}`);
                                if (detailRes.ok) {
                                  const detail = await detailRes.json();
                                  if (detail?.output) {
                                    setEditorSessionOutput(detail.output);
                                    setSelectedSession(null);
                                  }
                                }
                              }
                            }
                          } catch {}
                        })();
                      }
                    }}
                    className={cn(
                      "flex items-center gap-2 w-full px-2 py-1.5 rounded text-[11px] transition-colors text-left",
                      selectedSession === hb ? "bg-accent" : "hover:bg-accent/50"
                    )}
                  >
                    {hb.status === "completed" ? (
                      <CheckCircle className="h-3 w-3 text-green-500 shrink-0" />
                    ) : (
                      <XCircle className="h-3 w-3 text-red-500 shrink-0" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-muted-foreground">
                        {isEditorAgent ? hb.summary?.replace(/^\[.*?\]\s*/, '') : new Date(hb.timestamp).toLocaleString([], {
                          month: "short", day: "numeric",
                          hour: "2-digit", minute: "2-digit",
                        })}
                      </p>
                      <p className="truncate text-muted-foreground/60">
                        {isEditorAgent ? (
                          <>
                            {hb.summary?.match(/^\[(.*?)\]/)?.[1]} · {new Date(hb.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </>
                        ) : (
                          `${Math.round(hb.duration / 1000)}s`
                        )}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {sidePanel === "memory" && (
              <div className="p-2 space-y-2">
                {Object.entries(memory)
                  .filter(([k]) => k.endsWith(".md"))
                  .map(([file, content]) => (
                    <details key={file} className="text-[11px]">
                      <summary className="cursor-pointer flex items-center gap-1 text-muted-foreground hover:text-foreground py-1">
                        <Brain className="h-3 w-3 shrink-0" />
                        {file}
                      </summary>
                      <pre className="mt-1 p-2 bg-muted rounded text-[10px] whitespace-pre-wrap max-h-48 overflow-y-auto">
                        {content || "(empty)"}
                      </pre>
                    </details>
                  ))}
                {Object.keys(memory).filter((k) => k.endsWith(".md")).length === 0 && (
                  <p className="text-[11px] text-muted-foreground px-2 py-4">No memory yet</p>
                )}
              </div>
            )}

            {sidePanel === "outputs" && (
              <AgentOutputs slug={slug} />
            )}

            {sidePanel === "goals" && (
              <div className="p-2 space-y-2">
                {(persona as AgentPersona & { goals?: Array<{ metric: string; target: number; current: number; unit: string }> }).goals &&
                (persona as AgentPersona & { goals?: Array<{ metric: string; target: number; current: number; unit: string }> }).goals!.length > 0 ? (
                  (persona as AgentPersona & { goals: Array<{ metric: string; target: number; current: number; unit: string }> }).goals.map((g) => {
                    const pct = g.target > 0 ? Math.round((g.current / g.target) * 100) : 0;
                    const barColor = pct >= 70 ? "bg-emerald-500" : pct >= 40 ? "bg-amber-500" : "bg-red-500";
                    return (
                      <div key={g.metric} className="space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-muted-foreground">{g.metric.replace(/_/g, " ")}</span>
                          <span className="font-medium tabular-nums">{g.current}/{g.target}</span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className={cn("h-full rounded-full", barColor)} style={{ width: `${Math.min(pct, 100)}%` }} />
                        </div>
                        <p className="text-[9px] text-muted-foreground/50">{g.unit}</p>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-[11px] text-muted-foreground/50 py-4 text-center">No goals configured</p>
                )}
              </div>
            )}

            {sidePanel === "config" && (
              <div className="p-2 space-y-2">
                <div className="text-[11px] space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Configuration</span>
                    {savingPersona ? (
                      <span className="text-[9px] text-muted-foreground">Saving...</span>
                    ) : null}
                  </div>
                  <div className="space-y-1 text-[10px] text-muted-foreground">
                    <p><span className="font-medium text-foreground">Heartbeat:</span> {persona.heartbeat}</p>
                    <p><span className="font-medium text-foreground">Budget:</span> {persona.heartbeatsUsed || 0}/{persona.budget}</p>
                    <p><span className="font-medium text-foreground">Provider:</span> {(persona as AgentPersona & { provider?: string }).provider || "claude-code"}</p>
                    <p><span className="font-medium text-foreground">Workdir:</span> {(persona as AgentPersona & { workdir?: string }).workdir || "/data"}</p>
                    <p><span className="font-medium text-foreground">Focus:</span></p>
                    <ul className="pl-3 space-y-0.5">
                      {persona.focus.map((f) => (
                        <li key={f} className="list-disc">{f}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="pt-2">
                    <p className="font-medium text-foreground mb-1">Persona Instructions</p>
                    <textarea
                      className="w-full h-48 p-2 bg-muted rounded text-[10px] font-mono resize-none focus:outline-none focus:ring-1 focus:ring-primary/50"
                      value={personaEdit || persona.body}
                      onChange={(e) => setPersonaEdit(e.target.value)}
                    />
                    <Button
                      size="sm"
                      className="h-6 text-[10px] mt-1 w-full"
                      disabled={savingPersona || (!personaEdit || personaEdit === persona.body)}
                      onClick={async () => {
                        setSavingPersona(true);
                        await fetch(`/api/agents/personas/${slug}`, {
                          method: "PUT",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ body: personaEdit }),
                        });
                        setSavingPersona(false);
                        refresh();
                      }}
                    >
                      Save Changes
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Right panel — session output or live terminal */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Show live terminal for running editor sessions */}
          {isEditorAgent && selectedEditorSession && (() => {
            const liveSession = useAIPanelStore.getState().editorSessions.find(
              (s) => s.sessionId === selectedEditorSession && s.status === "running"
            );
            if (liveSession) {
              return (
                <div className="flex-1 flex flex-col overflow-hidden">
                  <div className="px-4 py-2 border-b border-border text-[11px] text-muted-foreground flex items-center gap-2">
                    <Loader2 className="h-3 w-3 animate-spin text-primary" />
                    <span className="font-medium text-foreground">{liveSession.userMessage}</span>
                    <span>· {liveSession.pagePath}</span>
                  </div>
                  <div className="flex-1">
                    <WebTerminal
                      sessionId={liveSession.sessionId}
                      prompt={liveSession.prompt}
                      onClose={() => {}}
                    />
                  </div>
                </div>
              );
            }
            return null;
          })() || (
          <ScrollArea className="flex-1">
            <div className="p-4">
              {loadingEditorOutput ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-[13px]">Loading session output...</span>
                </div>
              ) : (
                <pre className="text-[13px] font-mono whitespace-pre-wrap leading-relaxed text-foreground/90">
                  {mainContent}
                </pre>
              )}
            </div>
          </ScrollArea>
          )}

          <MentionInput
            placeholder={`Ask ${persona.name} something...`}
            disabled={sending}
            sending={sending}
            onSubmit={handleSendPrompt}
          />
        </div>
      </div>
    </div>
  );
}

/** General agent — shows terminal sessions */
export function GeneralAgentView() {
  const { openAgentTab } = useAppStore();
  const [prompt, setPrompt] = useState("");
  const [sending, setSending] = useState(false);
  const [output, setOutput] = useState<string | null>(null);

  const handleSend = async () => {
    if (!prompt.trim()) return;
    setSending(true);
    try {
      const res = await fetch("/api/agents/headless", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      if (res.ok) {
        const data = await res.json();
        setOutput(data.output || "No output");
      }
    } catch { /* ignore */ }
    setSending(false);
    setPrompt("");
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
        <Terminal className="h-5 w-5 text-blue-400" />
        <div>
          <h2 className="text-[15px] font-semibold tracking-[-0.02em]">General</h2>
          <p className="text-[11px] text-muted-foreground">Manual Claude sessions — no persona, no heartbeat</p>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4">
          {output ? (
            <pre className="text-[13px] font-mono whitespace-pre-wrap leading-relaxed text-foreground/90">
              {output}
            </pre>
          ) : (
            <p className="text-muted-foreground text-[13px]">
              Send a prompt below to run Claude in headless mode, or use the terminal (Cmd+`) for interactive sessions.
            </p>
          )}
        </div>
      </ScrollArea>

      <div className="border-t border-border p-3">
        <div className="flex gap-2">
          <input
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Ask Claude something..."
            className="flex-1 px-3 py-1.5 text-[13px] rounded-md border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary/50"
            disabled={sending}
          />
          <Button size="sm" className="h-8 gap-1" onClick={handleSend} disabled={sending || !prompt.trim()}>
            <Send className="h-3.5 w-3.5" />
            {sending ? "..." : "Send"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// Need this import for GeneralAgentView
import { useAppStore } from "@/stores/app-store";

// Live editor sessions component for the Editor Agent view
function EditorLiveSessions({ selectedId, onSelect }: { selectedId: string | null; onSelect: (id: string) => void }) {
  const allSessions = useAIPanelStore((s) => s.editorSessions);
  const runningSessions = allSessions.filter((es) => es.status === "running");
  const completedSessions = allSessions.filter((es) => es.status === "completed");

  if (runningSessions.length === 0 && completedSessions.length === 0) return null;

  return (
    <>
      {runningSessions.map((session) => (
        <button
          key={session.id}
          onClick={() => onSelect(session.sessionId)}
          className={cn(
            "flex items-center gap-2 w-full px-2 py-1.5 rounded text-[11px] transition-colors text-left",
            selectedId === session.sessionId
              ? "bg-primary/10 border border-primary/20"
              : "bg-primary/5 border border-primary/10 hover:bg-primary/10"
          )}
        >
          <Loader2 className="h-3 w-3 text-primary animate-spin shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-foreground">
              {session.userMessage}
            </p>
            <p className="truncate text-muted-foreground/60">
              {session.pagePath.split("/").pop()} · running
            </p>
          </div>
        </button>
      ))}
      {completedSessions.map((session) => (
        <button
          key={session.id}
          onClick={() => onSelect(session.sessionId)}
          className={cn(
            "flex items-center gap-2 w-full px-2 py-1.5 rounded text-[11px] transition-colors text-left",
            selectedId === session.sessionId
              ? "bg-accent"
              : "hover:bg-accent/50"
          )}
        >
          <CheckCircle className="h-3 w-3 text-green-500 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-muted-foreground">
              {session.userMessage}
            </p>
            <p className="truncate text-muted-foreground/60">
              {session.pagePath.split("/").pop()} · just now
            </p>
          </div>
        </button>
      ))}
      {(runningSessions.length > 0 || completedSessions.length > 0) && (
        <div className="border-b border-[#ffffff08] my-1" />
      )}
    </>
  );
}

// KB Outputs panel — shows files the agent has created/modified in the KB
function AgentOutputs({ slug }: { slug: string }) {
  const [files, setFiles] = useState<Array<{ path: string; name: string; modified: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [outputDir, setOutputDir] = useState<string | null>(null);
  const selectPage = useTreeStore((s) => s.selectPage);
  const setSection = useAppStore((s) => s.setSection);

  useEffect(() => {
    async function loadOutputs() {
      setLoading(true);
      try {
        // Fetch agent persona to get output_dir / workspace config
        const personaRes = await fetch(`/api/agents/personas/${slug}`);
        if (personaRes.ok) {
          const data = await personaRes.json();
          const dir = data.persona?.output_dir || data.persona?.workspace || data.persona?.workdir;
          if (dir) setOutputDir(dir);
        }

        // Fetch workspace files
        const res = await fetch(`/api/agents/personas/${slug}/workspace`);
        if (res.ok) {
          const data = await res.json();
          setFiles(data.files || []);
        }
      } catch { /* ignore */ }
      setLoading(false);
    }
    loadOutputs();
  }, [slug]);

  const handleOpenFile = (path: string) => {
    selectPage(path);
    setSection({ type: "page" });
  };

  if (loading) {
    return <p className="text-[11px] text-muted-foreground px-2 py-4">Loading outputs...</p>;
  }

  return (
    <div className="p-2 space-y-2">
      {outputDir && (
        <div className="flex items-center gap-1.5 px-2 py-1.5 rounded bg-muted/30 text-[10px] text-muted-foreground">
          <FolderOpen className="h-3 w-3 shrink-0" />
          <span className="truncate">{outputDir}</span>
        </div>
      )}
      {files.length === 0 ? (
        <p className="text-[11px] text-muted-foreground/50 py-4 text-center">
          No output files yet
        </p>
      ) : (
        files.map((file) => (
          <button
            key={file.path}
            onClick={() => handleOpenFile(file.path)}
            className="flex items-center gap-2 w-full px-2 py-1.5 rounded text-[11px] hover:bg-accent/50 transition-colors text-left group"
          >
            <FileText className="h-3 w-3 text-blue-400 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-foreground">{file.name}</p>
              <p className="truncate text-muted-foreground/60 text-[9px]">
                {file.path} · {file.modified ? new Date(file.modified).toLocaleDateString() : ""}
              </p>
            </div>
            <ExternalLink className="h-3 w-3 text-muted-foreground/30 group-hover:text-muted-foreground shrink-0" />
          </button>
        ))
      )}
    </div>
  );
}

// Import tree store for navigating to output files
import { useTreeStore } from "@/stores/tree-store";
