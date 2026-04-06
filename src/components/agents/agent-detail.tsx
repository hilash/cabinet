"use client";

import { useEffect, useState, useCallback } from "react";
import {
  ArrowLeft,
  Play,
  Pause,
  FileText,
  Briefcase,
  Clock,
  Zap,
  CheckCircle,
  XCircle,
  RefreshCw,
  Plus,
  Send,
  Loader2,
  MessageSquare,
  Save,
  Trash2,
  Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAppStore } from "@/stores/app-store";
import { WebTerminal } from "@/components/terminal/web-terminal";
import { cn } from "@/lib/utils";
import type { AgentPersona, HeartbeatRecord } from "@/lib/agents/persona-manager";
import { cronToHuman } from "@/lib/agents/cron-utils";
import { SchedulePicker } from "@/components/mission-control/schedule-picker";

type TabId = "definition" | "jobs" | "sessions";

const TABS: { id: TabId; label: string; icon: typeof FileText }[] = [
  { id: "definition", label: "Definition", icon: FileText },
  { id: "jobs", label: "Jobs", icon: Briefcase },
  { id: "sessions", label: "Sessions", icon: Clock },
];


/* ─── Editable Field ─── */
function EditableField({
  label,
  value,
  mono,
  onSave,
}: {
  label: string;
  value: string;
  mono?: boolean;
  onSave: (val: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  const handleSave = () => {
    if (draft.trim() !== value) onSave(draft.trim());
    setEditing(false);
  };

  return (
    <div
      className="bg-muted/30 rounded-lg p-3 group cursor-pointer hover:bg-muted/50 transition-colors"
      onClick={() => { if (!editing) { setDraft(value); setEditing(true); } }}
    >
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center justify-between">
        {label}
        {!editing && <Pencil className="h-2.5 w-2.5 opacity-0 group-hover:opacity-50 transition-opacity" />}
      </p>
      {editing ? (
        <div className="flex gap-1 mt-1">
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") setEditing(false); }}
            onBlur={handleSave}
            className={cn(
              "flex-1 bg-background border border-border rounded px-2 py-0.5 text-[13px] focus:outline-none focus:ring-1 focus:ring-primary/50",
              mono && "font-mono"
            )}
          />
        </div>
      ) : (
        <p className={cn("text-[13px] font-medium mt-0.5", mono && "font-mono")}>
          {value || "—"}
        </p>
      )}
    </div>
  );
}

/* ─── Heartbeat Field (uses SchedulePicker) ─── */
function HeartbeatField({
  value,
  onSave,
}: {
  value: string;
  onSave: (val: string) => void;
}) {
  const [editing, setEditing] = useState(false);

  return (
    <div
      className="bg-muted/30 rounded-lg p-3 group cursor-pointer hover:bg-muted/50 transition-colors"
      onClick={() => { if (!editing) setEditing(true); }}
    >
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center justify-between mb-1">
        Heartbeat
        {!editing && <Pencil className="h-2.5 w-2.5 opacity-0 group-hover:opacity-50 transition-opacity" />}
      </p>
      {editing ? (
        <div onClick={(e) => e.stopPropagation()}>
          <SchedulePicker
            value={value}
            onChange={(v) => { onSave(v); setEditing(false); }}
            onDone={() => setEditing(false)}
          />
        </div>
      ) : (
        <div>
          <p className="text-[13px] font-medium">{cronToHuman(value)}</p>
        </div>
      )}
    </div>
  );
}

/* ─── Definition Tab ─── */
function DefinitionTab({
  persona,
  slug,
  onRefresh,
}: {
  persona: AgentPersona;
  slug: string;
  onRefresh: () => void;
}) {
  const [bodyEdit, setBodyEdit] = useState("");
  const [editingBody, setEditingBody] = useState(false);
  const [saving, setSaving] = useState(false);
  const [bodyHtml, setBodyHtml] = useState("");

  // Render markdown to HTML for display
  useEffect(() => {
    fetch("/api/ai/render-md", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markdown: persona.body }),
    })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data?.html) setBodyHtml(data.html); })
      .catch(() => {});
  }, [persona.body]);

  const saveField = async (field: string, value: string) => {
    await fetch(`/api/agents/personas/${slug}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });
    onRefresh();
  };

  const saveBody = async () => {
    if (!bodyEdit.trim() || bodyEdit === persona.body) { setEditingBody(false); return; }
    setSaving(true);
    await fetch(`/api/agents/personas/${slug}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: bodyEdit }),
    });
    setSaving(false);
    setEditingBody(false);
    onRefresh();
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <EditableField
          label="Department"
          value={persona.department}
          onSave={(v) => saveField("department", v)}
        />
        <EditableField
          label="Type"
          value={persona.type}
          onSave={(v) => saveField("type", v)}
        />
        <HeartbeatField
          value={persona.heartbeat}
          onSave={(v) => saveField("heartbeat", v)}
        />
        <EditableField
          label="Workspace"
          value={persona.workspace || "/"}
          mono
          onSave={(v) => saveField("workspace", v)}
        />
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
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
            Persona Instructions
          </p>
          {editingBody ? (
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-[10px]"
                onClick={() => setEditingBody(false)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="h-6 text-[10px] gap-1"
                onClick={saveBody}
                disabled={saving}
              >
                <Save className="h-3 w-3" />
                {saving ? "Saving..." : "Save"}
              </Button>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-[10px] gap-1 opacity-60 hover:opacity-100"
              onClick={() => { setBodyEdit(persona.body); setEditingBody(true); }}
            >
              <Pencil className="h-3 w-3" />
              Edit
            </Button>
          )}
        </div>
        {editingBody ? (
          <textarea
            value={bodyEdit}
            onChange={(e) => setBodyEdit(e.target.value)}
            className="w-full bg-muted/20 border border-border rounded-lg p-4 text-[12px] font-mono leading-relaxed resize-none focus:outline-none focus:ring-1 focus:ring-primary/50 min-h-[400px]"
            autoFocus
          />
        ) : (
          <div
            className="bg-muted/20 border border-border rounded-lg p-4 cursor-pointer hover:bg-muted/30 transition-colors"
            onClick={() => { setBodyEdit(persona.body); setEditingBody(true); }}
          >
            {bodyHtml ? (
              <div
                className="prose prose-invert prose-sm max-w-none prose-headings:font-semibold prose-h1:text-base prose-h2:text-[13px] prose-h3:text-[12px] prose-p:text-[12px] prose-li:text-[12px] prose-code:text-[11px] prose-code:bg-muted prose-code:px-1 prose-code:rounded prose-pre:bg-[#0a0a0a] prose-pre:border prose-pre:border-border prose-strong:text-foreground"
                dangerouslySetInnerHTML={{ __html: bodyHtml }}
              />
            ) : (
              <pre className="text-[12px] whitespace-pre-wrap font-sans leading-relaxed">
                {persona.body}
              </pre>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Jobs Tab ─── */
interface AgentJob {
  id: string;
  name: string;
  enabled: boolean;
  schedule: string;
  prompt: string;
  timeout?: number;
}

function JobsTab({ slug }: { slug: string }) {
  const [jobs, setJobs] = useState<AgentJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCron, setNewCron] = useState("0 9 * * 1-5");
  const [newPrompt, setNewPrompt] = useState("");
  const [editingJob, setEditingJob] = useState<string | null>(null);
  const [editCron, setEditCron] = useState("");
  const [editPrompt, setEditPrompt] = useState("");
  const [running, setRunning] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/agents/${slug}/jobs`);
      if (res.ok) {
        const data = await res.json();
        setJobs(data.jobs || []);
      }
    } catch {}
    setLoading(false);
  }, [slug]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleAdd = async () => {
    if (!newName.trim() || !newPrompt.trim()) return;
    await fetch(`/api/agents/${slug}/jobs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newName.trim(),
        schedule: newCron,
        prompt: newPrompt.trim(),
      }),
    });
    setAdding(false);
    setNewName("");
    setNewCron("0 9 * * 1-5");
    setNewPrompt("");
    refresh();
  };

  const handleDelete = async (jobId: string) => {
    await fetch(`/api/agents/${slug}/jobs/${jobId}`, { method: "DELETE" });
    refresh();
  };

  const handleUpdateJob = async (jobId: string) => {
    const job = jobs.find((j) => j.id === jobId);
    if (!job) return;
    const updates: Record<string, unknown> = {};
    if (editCron && editCron !== job.schedule) updates.schedule = editCron;
    if (editPrompt !== job.prompt) updates.prompt = editPrompt;
    if (Object.keys(updates).length > 0) {
      await fetch(`/api/agents/${slug}/jobs/${jobId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
    }
    setEditingJob(null);
    refresh();
  };

  const handleToggle = async (jobId: string) => {
    await fetch(`/api/agents/${slug}/jobs/${jobId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "toggle" }),
    });
    refresh();
  };

  const handleRun = async (jobId: string) => {
    setRunning(jobId);
    await fetch(`/api/agents/${slug}/jobs/${jobId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "run" }),
    });
    setRunning(null);
    refresh();
  };

  if (loading) {
    return <p className="text-[13px] text-muted-foreground">Loading jobs...</p>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
          Scheduled Jobs
        </p>
        <Button
          variant="outline"
          size="sm"
          className="h-6 text-[10px] gap-1"
          onClick={() => setAdding(true)}
        >
          <Plus className="h-3 w-3" />
          Add Job
        </Button>
      </div>

      {adding && (
        <div className="bg-card border border-border rounded-lg p-3 space-y-3">
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Job name..."
            className="w-full bg-background border border-border rounded px-2 py-1.5 text-[12px] focus:outline-none focus:ring-1 focus:ring-primary/50"
            onKeyDown={(e) => { if (e.key === "Escape") setAdding(false); }}
          />
          <div>
            <p className="text-[10px] text-muted-foreground mb-1.5">Schedule</p>
            <SchedulePicker value={newCron} onChange={setNewCron} />
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground mb-1.5">Prompt</p>
            <textarea
              value={newPrompt}
              onChange={(e) => setNewPrompt(e.target.value)}
              placeholder="What should this job do? This is the prompt sent to Claude..."
              className="w-full bg-background border border-border rounded px-2 py-1.5 text-[12px] focus:outline-none focus:ring-1 focus:ring-primary/50 resize-none min-h-[80px]"
            />
          </div>
          <div className="flex gap-1 justify-end">
            <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => setAdding(false)}>
              Cancel
            </Button>
            <Button size="sm" className="h-6 text-[10px]" onClick={handleAdd} disabled={!newName.trim() || !newPrompt.trim()}>
              Create
            </Button>
          </div>
        </div>
      )}

      {jobs.length === 0 && !adding && (
        <div className="text-center py-8">
          <Briefcase className="h-8 w-8 mx-auto text-muted-foreground/30" />
          <p className="text-[13px] text-muted-foreground mt-2">
            No jobs configured
          </p>
          <p className="text-[11px] text-muted-foreground mt-1">
            Jobs are recurring scheduled tasks the agent runs automatically.
          </p>
        </div>
      )}

      {jobs.map((job) => (
        <div
          key={job.id}
          className="bg-card border border-border rounded-lg p-3"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleToggle(job.id)}
                className={cn(
                  "w-2 h-2 rounded-full shrink-0 cursor-pointer",
                  job.enabled ? "bg-green-500" : "bg-muted-foreground/30"
                )}
                title={job.enabled ? "Enabled — click to disable" : "Disabled — click to enable"}
              />
              <h4 className="text-[13px] font-medium">{job.name}</h4>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-5 text-[10px] gap-1 px-1.5"
                onClick={() => handleRun(job.id)}
                disabled={running === job.id}
              >
                {running === job.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
                Run
              </Button>
              <button
                onClick={() => { setEditingJob(editingJob === job.id ? null : job.id); setEditCron(job.schedule); setEditPrompt(job.prompt); }}
                className={cn(
                  "text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded hover:bg-muted/80 transition-colors",
                  editingJob === job.id ? "ring-1 ring-primary/50" : ""
                )}
              >
                <span className="font-mono">{job.schedule}</span>
                <span className="ml-1 text-muted-foreground/50">({cronToHuman(job.schedule)})</span>
              </button>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 text-muted-foreground/40 hover:text-destructive"
                onClick={() => handleDelete(job.id)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
          {job.prompt && editingJob !== job.id && (
            <p className="text-[11px] text-muted-foreground/70 mt-1.5 line-clamp-2">{job.prompt}</p>
          )}
          {editingJob === job.id && (
            <div className="mt-2 pt-2 border-t border-border space-y-3">
              <div>
                <p className="text-[10px] text-muted-foreground mb-1.5">Schedule</p>
                <SchedulePicker
                  value={editCron}
                  onChange={(v) => setEditCron(v)}
                />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground mb-1.5">Prompt</p>
                <textarea
                  value={editPrompt}
                  onChange={(e) => setEditPrompt(e.target.value)}
                  placeholder="What should this job do?"
                  className="w-full bg-background border border-border rounded px-2 py-1.5 text-[12px] focus:outline-none focus:ring-1 focus:ring-primary/50 resize-none min-h-[80px]"
                />
              </div>
              <div className="flex gap-1 justify-end">
                <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => setEditingJob(null)}>
                  Cancel
                </Button>
                <Button size="sm" className="h-6 text-[10px] gap-1" onClick={() => handleUpdateJob(job.id)}>
                  <Save className="h-3 w-3" />
                  Save
                </Button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ─── Sessions Tab (Claude Code terminal style) ─── */
function SessionsTab({
  persona,
  history,
  onRefresh,
}: {
  persona: AgentPersona;
  history: HeartbeatRecord[];
  onRefresh: () => void;
}) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [prompt, setPrompt] = useState("");
  // Live terminal session
  const [liveSession, setLiveSession] = useState<{
    id: string;
    prompt: string;
    userMessage: string;
  } | null>(null);

  const selectedSession = selectedIndex !== null ? history[selectedIndex] : null;

  const handleSendPrompt = () => {
    if (!prompt.trim()) return;
    const userMessage = prompt.trim();
    const sessionId = `agent-${persona.slug}-${Date.now()}`;
    const fullPrompt = `${persona.body}\n\n---\n\nUser request: ${userMessage}`;

    setLiveSession({ id: sessionId, prompt: fullPrompt, userMessage });
    setSelectedIndex(null);
    setPrompt("");
  };

  const handleSessionEnd = () => {
    setLiveSession(null);
    onRefresh();
  };

  const handleNewSession = () => {
    setSelectedIndex(null);
    setLiveSession(null);
  };

  const showNewPrompt = !liveSession && selectedIndex === null;

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Session list sidebar */}
      <div className="w-[240px] min-w-[240px] border-r border-border flex flex-col bg-muted/5">
        <div className="px-3 py-2 border-b border-border flex items-center justify-between">
          <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
            History
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={handleNewSession}
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-1.5 space-y-0.5">
            {/* Live session entry */}
            {liveSession && (
              <button
                className="flex items-start gap-2 w-full px-2.5 py-2 rounded-md text-[11px] text-left bg-primary/10 border border-primary/20"
              >
                <div className="mt-0.5 shrink-0">
                  <Loader2 className="h-3.5 w-3.5 text-primary animate-spin" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-[11px] leading-tight text-foreground">
                    {liveSession.userMessage}
                  </p>
                  <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                    running...
                  </p>
                </div>
              </button>
            )}
            {history.length === 0 && !liveSession && (
              <p className="text-[11px] text-muted-foreground/50 px-2 py-6 text-center">
                No sessions yet
              </p>
            )}
            {history.map((hb, i) => {
              const date = new Date(hb.timestamp);
              const summaryLine = hb.summary
                ?.replace(/^---\s*\n/, "")
                ?.replace(/^#+\s*/, "")
                ?.split("\n")[0]
                ?.trim() || "Session";
              return (
                <button
                  key={i}
                  onClick={() => {
                    setSelectedIndex(i);
                    setLiveSession(null);
                  }}
                  className={cn(
                    "flex items-start gap-2 w-full px-2.5 py-2 rounded-md text-[11px] transition-colors text-left group",
                    selectedIndex === i
                      ? "bg-accent text-foreground"
                      : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                  )}
                >
                  <div className="mt-0.5 shrink-0">
                    {hb.status === "completed" ? (
                      <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                    ) : (
                      <XCircle className="h-3.5 w-3.5 text-red-500" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-[11px] leading-tight">
                      {summaryLine.length > 50 ? summaryLine.slice(0, 50) + "..." : summaryLine}
                    </p>
                    <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                      {date.toLocaleDateString([], {
                        month: "short",
                        day: "numeric",
                      })}
                      {" "}
                      {date.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      <span className="ml-1.5">
                        {Math.round(hb.duration / 1000)}s
                      </span>
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </ScrollArea>
      </div>

      {/* Session content panel */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {liveSession ? (
          /* Live Claude Code terminal */
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="px-4 py-2.5 border-b border-border flex items-center gap-2 shrink-0">
              <Loader2 className="h-3.5 w-3.5 text-primary animate-spin" />
              <span className="text-[12px] font-medium">{liveSession.userMessage}</span>
            </div>
            <div className="flex-1 min-h-0">
              <WebTerminal
                sessionId={liveSession.id}
                prompt={liveSession.prompt}
                themeSurface="page"
                onClose={handleSessionEnd}
              />
            </div>
          </div>
        ) : selectedSession ? (
          /* Viewing a past session */
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="px-4 py-2.5 border-b border-border flex items-center gap-2">
              {selectedSession.status === "completed" ? (
                <CheckCircle className="h-3.5 w-3.5 text-green-500" />
              ) : (
                <XCircle className="h-3.5 w-3.5 text-red-500" />
              )}
              <span className="text-[12px] font-medium capitalize">
                {selectedSession.status}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {Math.round(selectedSession.duration / 1000)}s
              </span>
              <span className="text-[10px] text-muted-foreground ml-auto">
                {new Date(selectedSession.timestamp).toLocaleString([], {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
            <ScrollArea
              className="flex-1"
              style={{
                backgroundColor: "var(--background)",
                color: "var(--foreground)",
              }}
            >
              <div className="p-4">
                <pre className="text-[12px] font-mono whitespace-pre-wrap leading-relaxed text-foreground/90">
                  {selectedSession.summary || "No output captured for this session."}
                </pre>
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
                      handleSendPrompt();
                    }
                  }}
                  placeholder={`Ask ${persona.name} something...`}
                  className="flex-1 px-3 py-1.5 text-[13px] rounded-md border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary/50"
                />
                <Button
                  size="sm"
                  className="h-8 gap-1"
                  onClick={handleSendPrompt}
                  disabled={!prompt.trim()}
                >
                  <Send className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        ) : showNewPrompt ? (
          /* New session prompt */
          <div className="flex-1 flex flex-col items-center justify-center px-8">
            <div className="text-center mb-6">
              <MessageSquare className="h-10 w-10 mx-auto text-muted-foreground/20 mb-3" />
              <h3 className="text-[14px] font-medium text-foreground/80">
                New Session
              </h3>
              <p className="text-[12px] text-muted-foreground mt-1 max-w-sm">
                Send a prompt to {persona.name} to start a live Claude Code session.
              </p>
            </div>
            <div className="w-full max-w-lg">
              <div className="flex gap-2">
                <input
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendPrompt();
                    }
                  }}
                  placeholder={`Ask ${persona.name} something...`}
                  className="flex-1 px-3 py-2 text-[13px] rounded-md border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary/50"
                  autoFocus
                />
                <Button
                  size="sm"
                  className="h-9 gap-1.5"
                  onClick={handleSendPrompt}
                  disabled={!prompt.trim()}
                >
                  <Send className="h-3.5 w-3.5" />
                  Send
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

/* ─── Main Component ─── */
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

      {/* Body: vertical sidebar nav + content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Vertical tab sidebar */}
        <div className="w-[160px] min-w-[160px] border-r border-border flex flex-col bg-muted/5 py-2">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 mx-2 px-2.5 py-2 rounded-md text-[12px] font-medium transition-colors text-left",
                  activeTab === tab.id
                    ? "bg-accent text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                )}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        {activeTab === "sessions" ? (
          <SessionsTab
            persona={persona}
            history={history}
            onRefresh={refresh}
          />
        ) : (
          <ScrollArea className="flex-1">
            <div className="p-4">
              {activeTab === "definition" && <DefinitionTab persona={persona} slug={slug} onRefresh={refresh} />}
              {activeTab === "jobs" && <JobsTab slug={slug} />}


            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  );
}
