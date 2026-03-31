"use client";

import { useState, useEffect, useCallback } from "react";
import {
  X,
  Search,
  Megaphone,
  TrendingUp,
  Code,
  FlaskConical,
  Settings,
  Headphones,
  DollarSign,
  Users,
  PenTool,
  ChevronRight,
  Zap,
  Clock,
  ArrowLeft,
  Loader2,
  BookOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SchedulePicker } from "./schedule-picker";
import type { PlayDefinition } from "@/types/agents";

interface PlaybookCatalogProps {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
}

interface CategoryDef {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  emoji: string;
}

const CATEGORIES: CategoryDef[] = [
  { id: "marketing", label: "Marketing", icon: Megaphone, description: "Social media, content, community engagement", emoji: "📣" },
  { id: "sales", label: "Sales", icon: TrendingUp, description: "Lead gen, outreach, pipeline management", emoji: "💼" },
  { id: "research", label: "Research", icon: FlaskConical, description: "Competitor analysis, market research", emoji: "🔬" },
  { id: "engineering", label: "Engineering", icon: Code, description: "Code review, testing, DevOps", emoji: "🛠" },
  { id: "content", label: "Content", icon: PenTool, description: "Blog posts, docs, copywriting", emoji: "📝" },
  { id: "support", label: "Support", icon: Headphones, description: "Customer success, ticket triage", emoji: "📞" },
  { id: "finance", label: "Finance", icon: DollarSign, description: "Budgeting, reporting, forecasting", emoji: "💰" },
  { id: "hiring", label: "Hiring", icon: Users, description: "Sourcing, screening, pipeline", emoji: "👥" },
  { id: "operations", label: "Operations", icon: Settings, description: "Admin, processes, automation", emoji: "⚙" },
];

const DEFAULT_EMOJIS: Record<string, string> = {
  marketing: "📣",
  sales: "💼",
  research: "🔬",
  engineering: "🛠",
  content: "📝",
  support: "📞",
  finance: "💰",
  hiring: "👥",
  operations: "⚙",
};

type Step = "categories" | "plays" | "configure";

export function PlaybookCatalog({ open, onClose, onCreated }: PlaybookCatalogProps) {
  const [step, setStep] = useState<Step>("categories");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedPlays, setSelectedPlays] = useState<string[]>([]);
  const [allPlays, setAllPlays] = useState<PlayDefinition[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  // Configure step state
  const [agentName, setAgentName] = useState("");
  const [agentEmoji, setAgentEmoji] = useState("🤖");
  const [heartbeat, setHeartbeat] = useState("0 */4 * * *");
  const [creating, setCreating] = useState(false);

  const loadPlays = useCallback(async () => {
    try {
      const res = await fetch("/api/plays");
      if (res.ok) {
        const data = await res.json();
        setAllPlays(data.plays || []);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (open) {
      loadPlays();
      setStep("categories");
      setSelectedCategory(null);
      setSelectedPlays([]);
      setSearchQuery("");
      setAgentName("");
      setAgentEmoji("🤖");
      setHeartbeat("0 */4 * * *");
    }
  }, [open, loadPlays]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  const categoryPlays = allPlays.filter((p) =>
    selectedCategory ? p.category === selectedCategory : true
  );

  const filteredPlays = searchQuery
    ? allPlays.filter(
        (p) =>
          p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.category.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : categoryPlays;

  const handleSelectCategory = (catId: string) => {
    setSelectedCategory(catId);
    setAgentEmoji(DEFAULT_EMOJIS[catId] || "🤖");
    setStep("plays");
  };

  const togglePlay = (slug: string) => {
    setSelectedPlays((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    );
  };

  const handleProceedToConfigure = () => {
    // Auto-generate name from category
    if (!agentName && selectedCategory) {
      const cat = CATEGORIES.find((c) => c.id === selectedCategory);
      setAgentName(cat ? `${cat.label} Agent` : "New Agent");
    }
    setStep("configure");
  };

  const handleLaunch = async () => {
    const name = agentName.trim() || "New Agent";
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/^-|-$/g, "");

    if (!slug) return;
    setCreating(true);

    try {
      const dept = selectedCategory || "general";
      const res = await fetch("/api/agents/personas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          name,
          role: `${selectedCategory ? CATEGORIES.find((c) => c.id === selectedCategory)?.label + " " : ""}Specialist`,
          emoji: agentEmoji,
          department: dept,
          type: "specialist",
          heartbeat,
          budget: 200,
          active: false,
          workdir: "/data",
          plays: selectedPlays,
          channels: [dept === "general" ? "general" : dept, "general"],
          tags: [dept],
          focus: [],
          body: `You are ${name}. You specialize in ${selectedCategory || "general"} tasks.\n\nYour assigned plays: ${selectedPlays.join(", ") || "none yet"}\n\nExecute your plays diligently and report progress to Agent Slack.`,
        }),
      });

      if (res.ok) {
        onClose();
        onCreated?.();
      }
    } catch { /* ignore */ } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-background border border-border rounded-xl shadow-2xl w-[560px] max-w-[90vw] max-h-[80vh] flex flex-col animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-border shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {step !== "categories" && (
                <button
                  onClick={() => setStep(step === "configure" ? "plays" : "categories")}
                  className="p-1 rounded-md hover:bg-muted transition-colors"
                >
                  <ArrowLeft className="h-4 w-4 text-muted-foreground" />
                </button>
              )}
              <BookOpen className="h-4 w-4 text-primary" />
              <h2 className="text-[15px] font-semibold">
                {step === "categories" && "Playbook Catalog"}
                {step === "plays" && (
                  <>
                    {CATEGORIES.find((c) => c.id === selectedCategory)?.emoji}{" "}
                    {CATEGORIES.find((c) => c.id === selectedCategory)?.label || "All"} Plays
                  </>
                )}
                {step === "configure" && "Configure & Launch"}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-md hover:bg-muted transition-colors"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
          {step === "categories" && (
            <p className="text-[12px] text-muted-foreground/60 mt-1">
              Pick a category, select plays, and launch an agent in 3 clicks.
            </p>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* Step 1: Categories */}
          {step === "categories" && (
            <div className="grid grid-cols-3 gap-2.5">
              {CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const playCount = allPlays.filter((p) => p.category === cat.id).length;
                return (
                  <button
                    key={cat.id}
                    onClick={() => handleSelectCategory(cat.id)}
                    className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border/50 hover:border-primary/30 hover:bg-primary/[0.03] transition-all text-center group"
                  >
                    <Icon className="h-6 w-6 text-muted-foreground/50 group-hover:text-primary transition-colors" />
                    <div>
                      <p className="text-[13px] font-medium">{cat.label}</p>
                      <p className="text-[10px] text-muted-foreground/50 mt-0.5">
                        {cat.description}
                      </p>
                    </div>
                    {playCount > 0 && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                        {playCount} {playCount === 1 ? "play" : "plays"}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Step 2: Play selection */}
          {step === "plays" && (
            <div className="space-y-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/40" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search plays..."
                  className="pl-8 text-[12px] h-8"
                />
              </div>

              {/* Play list */}
              {filteredPlays.length === 0 ? (
                <div className="text-center py-8">
                  <Zap className="h-8 w-8 mx-auto text-muted-foreground/20 mb-2" />
                  <p className="text-[13px] text-muted-foreground/60">
                    No plays in this category yet.
                  </p>
                  <p className="text-[11px] text-muted-foreground/40 mt-1">
                    Create plays in the Plays page, then come back here.
                  </p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {filteredPlays.map((play) => {
                    const isSelected = selectedPlays.includes(play.slug);
                    return (
                      <button
                        key={play.slug}
                        onClick={() => togglePlay(play.slug)}
                        className={cn(
                          "w-full flex items-start gap-3 px-3 py-3 rounded-lg text-left transition-all",
                          isSelected
                            ? "bg-primary/10 border border-primary/20"
                            : "hover:bg-muted/50 border border-transparent"
                        )}
                      >
                        <div
                          className={cn(
                            "mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors",
                            isSelected
                              ? "bg-primary border-primary text-primary-foreground"
                              : "border-muted-foreground/30"
                          )}
                        >
                          {isSelected && (
                            <span className="text-[10px]">✓</span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-[13px] font-medium">{play.title}</p>
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground/60 capitalize">
                              {play.category}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mt-1">
                            {play.estimated_duration && (
                              <span className="flex items-center gap-1 text-[10px] text-muted-foreground/50">
                                <Clock className="h-2.5 w-2.5" />
                                {play.estimated_duration}
                              </span>
                            )}
                            {play.schedule?.every && (
                              <span className="flex items-center gap-1 text-[10px] text-muted-foreground/50">
                                <Zap className="h-2.5 w-2.5" />
                                Every {play.schedule.every}
                              </span>
                            )}
                          </div>
                        </div>
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/30 mt-1 shrink-0" />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Step 3: Configure */}
          {step === "configure" && (
            <div className="space-y-4">
              {/* Agent identity */}
              <div className="space-y-3">
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground/60">
                  Agent Identity
                </div>
                <div className="flex gap-3 items-start">
                  <div className="text-3xl p-2 rounded-lg bg-muted/30 border border-border/50">
                    {agentEmoji}
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="space-y-1">
                      <label className="text-[12px] font-medium">Name</label>
                      <Input
                        value={agentName}
                        onChange={(e) => setAgentName(e.target.value)}
                        placeholder="Marketing Agent"
                        className="text-[12px] h-8"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Selected plays summary */}
              <div className="space-y-2">
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground/60">
                  Assigned Plays ({selectedPlays.length})
                </div>
                {selectedPlays.length === 0 ? (
                  <p className="text-[12px] text-muted-foreground/50">
                    No plays selected. Go back to select plays.
                  </p>
                ) : (
                  <div className="space-y-1">
                    {selectedPlays.map((slug) => {
                      const play = allPlays.find((p) => p.slug === slug);
                      return (
                        <div
                          key={slug}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-primary/5 border border-primary/10"
                        >
                          <Zap className="h-3 w-3 text-amber-500" />
                          <span className="text-[12px] font-medium flex-1">
                            {play?.title || slug}
                          </span>
                          <button
                            onClick={() => togglePlay(slug)}
                            className="text-[10px] text-muted-foreground/50 hover:text-red-500 transition-colors"
                          >
                            Remove
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Schedule */}
              <div className="space-y-2">
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground/60">
                  Heartbeat Schedule
                </div>
                <SchedulePicker value={heartbeat} onChange={setHeartbeat} />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {(step === "plays" || step === "configure") && (
          <div className="px-5 py-3 border-t border-border shrink-0 flex items-center justify-between">
            <p className="text-[11px] text-muted-foreground/50">
              {step === "plays" && `${selectedPlays.length} plays selected`}
              {step === "configure" && `Department: ${selectedCategory}`}
            </p>
            <div className="flex gap-2">
              {step === "plays" && (
                <Button
                  size="sm"
                  className="text-[12px] gap-1.5"
                  onClick={handleProceedToConfigure}
                  disabled={selectedPlays.length === 0}
                >
                  Continue
                  <ChevronRight className="h-3 w-3" />
                </Button>
              )}
              {step === "configure" && (
                <Button
                  size="sm"
                  className="text-[12px] gap-1.5"
                  onClick={handleLaunch}
                  disabled={!agentName.trim() || creating}
                >
                  {creating ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Launching...
                    </>
                  ) : (
                    <>
                      <Zap className="h-3 w-3" />
                      Launch Agent
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
