"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  ArrowLeft,
  Bot,
  Clock,
  Download,
  FolderTree,
  Loader2,
  Search,
  ChevronRight,
  FolderOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAppStore } from "@/stores/app-store";
import { useTreeStore } from "@/stores/tree-store";
import type { RegistryTemplate } from "@/lib/registry/registry-manifest";

/* ─── Types for detail view ─── */

interface AgentInfo {
  name: string;
  slug: string;
  emoji: string;
  type: string;
  department: string;
  role: string;
  heartbeat: string;
}

interface JobInfo {
  id: string;
  name: string;
  description: string;
  ownerAgent: string;
  enabled: boolean;
  schedule: string;
}

interface ChildInfo {
  path: string;
  name: string;
  agents: AgentInfo[];
  jobs: JobInfo[];
}

interface RegistryDetail {
  slug: string;
  meta: { name: string; description: string; version: string };
  agents: AgentInfo[];
  jobs: JobInfo[];
  children: ChildInfo[];
  readme: string;
  tags: string[];
  domain: string;
  stats: { totalAgents: number; totalJobs: number; totalCabinets: number };
}

const DOMAIN_COLORS: Record<string, string> = {
  Software: "bg-orange-500/15 text-orange-400",
  "Professional Services": "bg-cyan-500/15 text-cyan-400",
  Operations: "bg-slate-500/15 text-slate-400",
  Media: "bg-purple-500/15 text-purple-400",
  "E-commerce": "bg-emerald-500/15 text-emerald-400",
  Sales: "bg-rose-500/15 text-rose-400",
};

/* ─── List item ─── */

function RegistryListItem({
  template,
  onClick,
}: {
  template: RegistryTemplate;
  onClick: () => void;
}) {
  const colorClass =
    DOMAIN_COLORS[template.domain] || "bg-muted text-muted-foreground";

  return (
    <button
      onClick={onClick}
      className="group flex items-center gap-4 w-full rounded-xl border border-border bg-card px-5 py-4 text-left transition-all hover:border-primary/30 hover:shadow-sm"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="text-[14px] font-semibold text-foreground group-hover:text-primary transition-colors truncate">
            {template.name}
          </h3>
          <span
            className={cn(
              "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium",
              colorClass
            )}
          >
            {template.domain}
          </span>
        </div>
        <p className="text-sm text-muted-foreground line-clamp-1">
          {template.description}
        </p>
      </div>

      <div className="hidden sm:flex items-center gap-4 text-xs text-muted-foreground shrink-0">
        <span className="flex items-center gap-1">
          <Bot className="h-3.5 w-3.5" />
          {template.agentCount}
        </span>
        <span className="flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" />
          {template.jobCount}
        </span>
        {template.childCount > 0 && (
          <span className="flex items-center gap-1">
            <FolderTree className="h-3.5 w-3.5" />
            {template.childCount}
          </span>
        )}
      </div>

      <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary transition-colors shrink-0" />
    </button>
  );
}

/* ─── Detail: Agent card ─── */

function AgentCard({ agent }: { agent: AgentInfo }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{agent.emoji}</span>
        <span className="font-medium text-sm text-foreground">{agent.name}</span>
        <span
          className={cn(
            "ml-auto rounded-full px-2 py-0.5 text-[10px] font-medium",
            agent.type === "lead"
              ? "bg-primary/10 text-primary"
              : "bg-muted text-muted-foreground"
          )}
        >
          {agent.type}
        </span>
      </div>
      <p className="text-xs text-muted-foreground line-clamp-2">{agent.role}</p>
      {agent.heartbeat && (
        <div className="mt-2 flex items-center gap-1">
          <div className="h-1.5 w-1.5 rounded-full bg-green-500/60" />
          <span className="text-[10px] text-muted-foreground font-mono">
            {agent.heartbeat}
          </span>
        </div>
      )}
    </div>
  );
}

/* ─── Detail: Job card ─── */

function JobCard({ job }: { job: JobInfo }) {
  return (
    <div className="flex items-center gap-4 px-5 py-3">
      <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="font-medium text-sm text-foreground">{job.name}</span>
          <span
            className={cn(
              "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium",
              job.enabled
                ? "bg-green-500/10 text-green-600"
                : "bg-muted text-muted-foreground"
            )}
          >
            {job.enabled ? "active" : "paused"}
          </span>
        </div>
        <p className="text-xs text-muted-foreground line-clamp-1">
          {job.description}
        </p>
      </div>
      <div className="hidden sm:flex items-center gap-3 text-[11px] text-muted-foreground shrink-0 font-mono">
        <span>{job.schedule}</span>
        {job.ownerAgent && (
          <>
            <span className="text-border">|</span>
            <span>@{job.ownerAgent}</span>
          </>
        )}
      </div>
    </div>
  );
}

/* ─── Detail: Tree view ─── */

function CabinetTreeNode({
  name,
  agents,
  jobs,
  depth = 0,
  isChild = false,
}: {
  name: string;
  agents: { emoji: string; name: string }[];
  jobs: { name: string }[];
  depth?: number;
  isChild?: boolean;
}) {
  return (
    <div style={{ paddingLeft: depth * 20 }}>
      <div className="flex items-center gap-2 py-1.5">
        <FolderOpen className="h-4 w-4 text-primary shrink-0" />
        <span className="text-sm font-medium text-foreground">{name}</span>
        {isChild && (
          <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[9px] font-medium text-primary">
            child
          </span>
        )}
      </div>
      {agents.map((agent, i) => (
        <div
          key={i}
          className="flex items-center gap-2 py-1"
          style={{ paddingLeft: 20 }}
        >
          <Bot className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <span className="text-xs text-muted-foreground">
            {agent.emoji} {agent.name}
          </span>
        </div>
      ))}
      {jobs.map((job, i) => (
        <div
          key={i}
          className="flex items-center gap-2 py-1"
          style={{ paddingLeft: 20 }}
        >
          <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <span className="text-xs text-muted-foreground">{job.name}</span>
        </div>
      ))}
    </div>
  );
}

/* ─── Detail view ─── */

function DetailView({
  slug,
  onBack,
}: {
  slug: string;
  onBack: () => void;
}) {
  const [detail, setDetail] = useState<RegistryDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importName, setImportName] = useState("");
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const loadTree = useTreeStore((s) => s.loadTree);
  const selectPage = useTreeStore((s) => s.selectPage);
  const setSection = useAppStore((s) => s.setSection);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`/api/registry/${slug}`)
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load");
        return r.json();
      })
      .then((data) => {
        if (!cancelled) {
          setDetail(data);
          setImportName(data.meta.name);
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [slug]);

  const handleImport = async () => {
    if (!detail) return;
    setImporting(true);
    setImportError(null);
    setImportOpen(false);

    try {
      const res = await fetch("/api/registry/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: detail.slug,
          name:
            importName.trim() !== detail.meta.name
              ? importName.trim()
              : undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setImportError(data.error || "Import failed");
        setImporting(false);
        setImportOpen(true);
        return;
      }

      await res.json();
      await loadTree();
      window.location.reload();
    } catch {
      setImportError("Import failed. Check your internet connection.");
      setImporting(false);
      setImportOpen(true);
    }
  };

  const allAgents = detail
    ? [
        ...detail.agents,
        ...detail.children.flatMap((c) => c.agents),
      ]
    : [];
  const allJobs = detail
    ? [...detail.jobs, ...detail.children.flatMap((c) => c.jobs)]
    : [];

  return (
    <>
      {/* Fullscreen import overlay */}
      {importing && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="mt-4 text-sm font-medium text-foreground">
            Importing {detail?.meta.name || "cabinet"}...
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Downloading agents, jobs, and content from the registry
          </p>
          <p className="mt-3 text-[11px] text-muted-foreground/60">
            Please do not refresh the page while importing
          </p>
        </div>
      )}

      <div className="flex flex-col h-full">
        {/* Back + Import bar */}
        <div className="flex items-center justify-between border-b border-border px-6 py-3">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to registry
          </button>
          {detail && (
            <Button
              size="lg"
              className="gap-2 font-semibold"
              onClick={() => {
                setImportName(detail.meta.name);
                setImportOpen(true);
              }}
            >
              <Download className="h-4 w-4" />
              Import Cabinet
            </Button>
          )}
        </div>

        <ScrollArea className="flex-1 min-h-0">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-3 text-sm text-muted-foreground">
                Loading from registry...
              </span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-20">
              <p className="text-sm text-destructive">{error}</p>
              <Button variant="outline" className="mt-4" onClick={onBack}>
                Back to list
              </Button>
            </div>
          ) : detail ? (
            <div className="max-w-4xl mx-auto px-6 py-8 space-y-10">
              {/* Header */}
              <div>
                <div className="flex items-center gap-3 mb-2 flex-wrap">
                  <h1 className="text-2xl font-bold text-foreground">
                    {detail.meta.name}
                  </h1>
                  <span className="rounded-full border border-border px-2.5 py-0.5 text-xs font-mono text-muted-foreground">
                    v{detail.meta.version}
                  </span>
                  {detail.domain && (
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-0.5 text-[10px] font-medium",
                        DOMAIN_COLORS[detail.domain] ||
                          "bg-muted text-muted-foreground"
                      )}
                    >
                      {detail.domain}
                    </span>
                  )}
                </div>
                <p className="text-muted-foreground text-base max-w-2xl">
                  {detail.meta.description}
                </p>
                {detail.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {detail.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Bot className="h-4 w-4" />
                    {detail.stats.totalAgents} agents
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4" />
                    {detail.stats.totalJobs} jobs
                  </span>
                  <span className="flex items-center gap-1.5">
                    <FolderTree className="h-4 w-4" />
                    {detail.stats.totalCabinets} cabinets
                  </span>
                </div>
              </div>

              {/* Big import CTA */}
              <div className="rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 p-6 flex items-center justify-between gap-4">
                <div>
                  <p className="font-semibold text-foreground">
                    Ready to import this cabinet?
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    All {detail.stats.totalAgents} agents and{" "}
                    {detail.stats.totalJobs} jobs will be set up automatically.
                  </p>
                </div>
                <Button
                  size="lg"
                  className="gap-2 font-semibold shrink-0"
                  onClick={() => {
                    setImportName(detail.meta.name);
                    setImportOpen(true);
                  }}
                >
                  <Download className="h-5 w-5" />
                  Import Cabinet
                </Button>
              </div>

              {/* Cabinet structure tree */}
              {(detail.agents.length > 0 ||
                detail.children.length > 0) && (
                <section>
                  <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                    Cabinet Structure
                  </h2>
                  <div className="rounded-xl border border-border bg-card p-5">
                    <CabinetTreeNode
                      name={detail.meta.name}
                      agents={detail.agents.map((a) => ({
                        emoji: a.emoji,
                        name: a.name,
                      }))}
                      jobs={detail.jobs.map((j) => ({ name: j.name }))}
                    />
                    {detail.children
                      .sort((a, b) => a.path.localeCompare(b.path))
                      .map((child) => {
                        const depth = child.path.split("/").length;
                        return (
                          <div key={child.path} className="mt-1">
                            <div
                              className="flex items-center gap-1 py-0.5 text-muted-foreground/40"
                              style={{
                                paddingLeft: (depth - 1) * 20,
                              }}
                            >
                              <ChevronRight className="h-3 w-3" />
                            </div>
                            <CabinetTreeNode
                              name={child.name}
                              agents={child.agents.map((a) => ({
                                emoji: a.emoji,
                                name: a.name,
                              }))}
                              jobs={child.jobs.map((j) => ({
                                name: j.name,
                              }))}
                              depth={depth}
                              isChild
                            />
                          </div>
                        );
                      })}
                  </div>
                </section>
              )}

              {/* Agents grid */}
              {allAgents.length > 0 && (
                <section>
                  <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                    Agents
                  </h2>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {allAgents.map((agent, i) => (
                      <AgentCard key={`${agent.slug}-${i}`} agent={agent} />
                    ))}
                  </div>
                </section>
              )}

              {/* Jobs */}
              {allJobs.length > 0 && (
                <section>
                  <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                    Scheduled Jobs
                  </h2>
                  <div className="rounded-xl border border-border bg-card divide-y divide-border">
                    {allJobs.map((job) => (
                      <JobCard key={job.id} job={job} />
                    ))}
                  </div>
                </section>
              )}

              {/* Readme */}
              {detail.readme && (
                <section>
                  <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                    About
                  </h2>
                  <div className="rounded-xl border border-border bg-card p-6 prose prose-sm prose-invert max-w-none">
                    <pre className="whitespace-pre-wrap text-sm text-foreground/90 font-sans leading-relaxed">
                      {detail.readme}
                    </pre>
                  </div>
                </section>
              )}
            </div>
          ) : null}
        </ScrollArea>
      </div>

      {/* Import dialog */}
      <Dialog
        open={importOpen}
        onOpenChange={(v) => {
          if (!importing) setImportOpen(v);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Import {detail?.meta.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {detail?.meta.description}
            </p>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Cabinet name
              </label>
              <Input
                value={importName}
                onChange={(e) => setImportName(e.target.value)}
                placeholder="Cabinet name..."
              />
              <p className="text-[11px] text-muted-foreground/70">
                Cabinet names can&apos;t be renamed later (for now). Choose
                wisely.
              </p>
            </div>
            {importError && (
              <p className="text-xs text-destructive">{importError}</p>
            )}
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setImportOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleImport}
                disabled={!importName.trim()}
              >
                <Download className="mr-2 h-4 w-4" />
                Import
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ─── Main browser component ─── */

export function RegistryBrowser() {
  const [templates, setTemplates] = useState<RegistryTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/registry")
      .then((r) => r.json())
      .then((data) => {
        if (data.templates) setTemplates(data.templates);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    if (!query.trim()) return templates;
    const q = query.toLowerCase();
    return templates.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.domain.toLowerCase().includes(q)
    );
  }, [templates, query]);

  if (selectedSlug) {
    return (
      <DetailView
        slug={selectedSlug}
        onBack={() => setSelectedSlug(null)}
      />
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-border px-6 py-4">
        <h1 className="text-xl font-bold text-foreground">
          Cabinet Registry
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Browse and import pre-made zero-human teams
        </p>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="max-w-3xl mx-auto px-6 py-6">
          {/* Search */}
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search cabinets..."
              className="w-full rounded-lg border border-border bg-card pl-9 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none transition-colors"
            />
          </div>

          {/* List */}
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((template) => (
                <RegistryListItem
                  key={template.slug}
                  template={template}
                  onClick={() => setSelectedSlug(template.slug)}
                />
              ))}
              {filtered.length === 0 && (
                <div className="py-12 text-center">
                  <p className="text-muted-foreground">
                    No cabinets match your search.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
