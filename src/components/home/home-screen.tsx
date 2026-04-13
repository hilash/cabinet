"use client";

import { useState, useEffect, useRef } from "react";
import { useAppStore } from "@/stores/app-store";
import { useTreeStore } from "@/stores/tree-store";
import { Users, Download, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { flattenTree } from "@/lib/tree-utils";
import { ComposerInput } from "@/components/composer/composer-input";
import { useComposer, type MentionableItem } from "@/hooks/use-composer";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AgentListItem } from "@/types/agents";
import type { RegistryTemplate } from "@/lib/registry/registry-manifest";

const QUICK_ACTIONS = [
  "Brainstorm ideas",
  "Map user journey",
  "Plan roadmap",
  "Create research plan",
  "Create requirements doc",
];

const DOMAIN_COLORS: Record<string, string> = {
  "Marketing": "bg-blue-500/15 text-blue-400",
  "E-commerce": "bg-emerald-500/15 text-emerald-400",
  "Media": "bg-purple-500/15 text-purple-400",
  "Software": "bg-orange-500/15 text-orange-400",
  "Sales": "bg-rose-500/15 text-rose-400",
  "Finance": "bg-yellow-500/15 text-yellow-400",
  "Professional Services": "bg-cyan-500/15 text-cyan-400",
  "Data & Research": "bg-indigo-500/15 text-indigo-400",
  "Education": "bg-teal-500/15 text-teal-400",
  "Operations": "bg-slate-500/15 text-slate-400",
  "Paid Social": "bg-pink-500/15 text-pink-400",
  "Content Ops": "bg-amber-500/15 text-amber-400",
};

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function CabinetCard({
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
      className="group flex-shrink-0 w-64 h-36 rounded-xl border border-border bg-card p-4 flex flex-col text-left cursor-pointer transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
    >
      <h3 className="text-sm font-medium text-foreground leading-tight">
        {template.name}
      </h3>
      <p className="text-xs text-muted-foreground leading-relaxed mt-2 line-clamp-2">
        {template.description}
      </p>
      <div className="flex items-center justify-between mt-auto pt-3">
        <span
          className={cn(
            "text-[10px] font-medium px-2 py-0.5 rounded-full",
            colorClass
          )}
        >
          {template.domain}
        </span>
        <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <Users className="h-3 w-3" />
          {template.agentCount} agents
          <Download className="h-3 w-3 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
        </span>
      </div>
    </button>
  );
}

function RegistryCarousel({
  templates,
  onSelect,
}: {
  templates: RegistryTemplate[];
  onSelect: (template: RegistryTemplate) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || templates.length === 0) return;

    let animationId: number;
    let position = 0;
    const speed = 1.2;

    const animate = () => {
      if (!isPaused) {
        position += speed;
        const halfWidth = el.scrollWidth / 2;
        if (position >= halfWidth) {
          position = 0;
        }
        el.style.transform = `translateX(-${position}px)`;
      }
      animationId = requestAnimationFrame(animate);
    };

    animationId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationId);
  }, [isPaused, templates]);

  const doubled = [...templates, ...templates];

  return (
    <div
      className="relative w-full overflow-hidden"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div ref={scrollRef} className="flex gap-3 will-change-transform">
        {doubled.map((template, i) => (
          <CabinetCard
            key={`${template.slug}-${i}`}
            template={template}
            onClick={() => onSelect(template)}
          />
        ))}
      </div>
    </div>
  );
}

function ImportDialog({
  template,
  open,
  onOpenChange,
  onImportStart,
  onImportEnd,
}: {
  template: RegistryTemplate | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportStart: () => void;
  onImportEnd: () => void;
}) {
  const [name, setName] = useState("");
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadTree = useTreeStore((s) => s.loadTree);
  const selectPage = useTreeStore((s) => s.selectPage);
  const setSection = useAppStore((s) => s.setSection);

  useEffect(() => {
    if (template) setName(template.name);
  }, [template]);

  const handleImport = async () => {
    if (!template) return;
    setImporting(true);
    setError(null);
    onImportStart();
    onOpenChange(false);

    try {
      const res = await fetch("/api/registry/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: template.slug,
          name: name.trim() !== template.name ? name.trim() : undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Import failed");
        setImporting(false);
        onImportEnd();
        onOpenChange(true);
        return;
      }

      await res.json();
      onImportEnd();
      window.location.reload();
    } catch {
      setError("Import failed. Check your internet connection.");
      setImporting(false);
      onImportEnd();
      onOpenChange(true);
    }
  };

  if (!template) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!importing) onOpenChange(v); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Import {template.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {template.description}
          </p>
          <div className="flex gap-4 text-xs text-muted-foreground">
            <span>{template.agentCount} agents</span>
            <span>{template.jobCount} jobs</span>
            {template.childCount > 0 && (
              <span>{template.childCount} sub-cabinets</span>
            )}
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Cabinet name
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Cabinet name..."
            />
            <p className="text-[11px] text-muted-foreground/70">
              Cabinet names can&apos;t be renamed later (for now). Choose wisely.
            </p>
          </div>
          {error && (
            <p className="text-xs text-destructive">{error}</p>
          )}
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={importing}
            >
              Cancel
            </Button>
            <Button
              onClick={handleImport}
              disabled={importing || !name.trim()}
            >
              <Download className="mr-2 h-4 w-4" />
              Import
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function HomeScreen() {
  const setSection = useAppStore((s) => s.setSection);
  const treeNodes = useTreeStore((s) => s.nodes);
  const [userName, setUserName] = useState<string | null>(null);
  const [agents, setAgents] = useState<AgentListItem[]>([]);
  const [registryTemplates, setRegistryTemplates] = useState<
    RegistryTemplate[]
  >([]);
  const [importTemplate, setImportTemplate] =
    useState<RegistryTemplate | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    fetch("/api/agents/config")
      .then((r) => r.json())
      .then((data) => {
        if (data.company?.name) {
          setUserName(data.company.name);
        }
      })
      .catch(() => {});

    fetch("/api/cabinets/overview?path=.&visibility=all")
      .then((r) => r.json())
      .then((data) => {
        const overview = (data.agents || []).map(
          (a: Record<string, unknown>) => ({
            name: a.name as string,
            slug: a.slug as string,
            emoji: (a.emoji as string) || "",
            role: (a.role as string) || "",
            active: a.active as boolean,
          })
        ) as AgentListItem[];
        setAgents(overview);
      })
      .catch(() => {});

    fetch("/api/registry")
      .then((r) => r.json())
      .then((data) => {
        if (data.templates) setRegistryTemplates(data.templates);
      })
      .catch(() => {});
  }, []);

  const mentionItems: MentionableItem[] = [
    ...agents
      .filter((a) => a.slug !== "general" && a.slug !== "editor")
      .map((a) => ({
        type: "agent" as const,
        id: a.slug,
        label: a.name,
        sublabel: a.role || "",
        icon: a.emoji,
      })),
    ...flattenTree(treeNodes).map((p) => ({
      type: "page" as const,
      id: p.path,
      label: p.title,
      sublabel: p.path,
    })),
  ];

  const composer = useComposer({
    items: mentionItems,
    onSubmit: async ({ message, mentionedPaths, mentionedAgents }) => {
      const targetAgent =
        mentionedAgents.length > 0 ? mentionedAgents[0] : "general";

      const res = await fetch("/api/agents/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentSlug: targetAgent,
          userMessage: message,
          mentionedPaths,
        }),
      });

      if (!res.ok) throw new Error("Failed to start conversation");

      const data = await res.json();
      setSection({
        type: "agent",
        mode: "ops",
        slug: targetAgent,
        conversationId: data.conversation?.id,
      });
    },
  });

  const greeting = getGreeting();
  const displayName = userName || "there";

  return (
    <div className="flex-1 flex flex-col items-center px-4 overflow-hidden">
      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-xl space-y-8">
        <h1 className="text-3xl md:text-4xl font-semibold text-center text-foreground tracking-tight">
          {greeting}, {displayName}.<br />
          What are we working on today?
        </h1>

        <ComposerInput
          composer={composer}
          placeholder="I want to create..."
          variant="card"
          items={mentionItems}
          autoFocus
          className="w-full"
          minHeight="44px"
          maxHeight="160px"
        />

        <div className="flex flex-wrap items-center justify-center gap-2">
          {QUICK_ACTIONS.map((action) => (
            <button
              key={action}
              onClick={() => void composer.submit(action)}
              disabled={composer.submitting}
              className={cn(
                "rounded-full border border-border px-4 py-1.5",
                "text-sm text-foreground/80",
                "hover:bg-accent hover:text-accent-foreground",
                "transition-colors",
                composer.submitting && "opacity-50 cursor-not-allowed"
              )}
            >
              {action}
            </button>
          ))}
        </div>
      </div>

      <div className="w-screen pb-8 pt-4 space-y-3">
        <div className="flex items-center justify-center gap-3">
          <h2 className="text-sm font-medium text-muted-foreground">
            Import a pre-made zero-human team
          </h2>
          <button
            onClick={() => setSection({ type: "registry" })}
            className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
          >
            Browse all &rarr;
          </button>
        </div>
        <RegistryCarousel
          templates={registryTemplates}
          onSelect={(template) => {
            setImportTemplate(template);
            setImportOpen(true);
          }}
        />
      </div>

      <ImportDialog
        template={importTemplate}
        open={importOpen}
        onOpenChange={(open) => {
          setImportOpen(open);
          if (!open && !importing) setImportTemplate(null);
        }}
        onImportStart={() => setImporting(true)}
        onImportEnd={() => setImporting(false)}
      />

      {importing && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="mt-4 text-sm font-medium text-foreground">
            Importing {importTemplate?.name || "cabinet"}...
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Downloading agents, jobs, and content from the registry
          </p>
          <p className="mt-3 text-[11px] text-muted-foreground/60">
            Please do not refresh the page while importing
          </p>
        </div>
      )}
    </div>
  );
}
