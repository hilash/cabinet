"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useAppStore } from "@/stores/app-store";
import { Send, Users, MessageSquare, ListTodo, ChevronDown, Bot } from "lucide-react";
import { cn } from "@/lib/utils";

const QUICK_ACTIONS_TASK = [
  "调研竞品分析",
  "整理会议纪要",
  "写周报总结",
  "梳理需求文档",
  "规划产品路线图",
];

const QUICK_ACTIONS_CHAT = [
  "头脑风暴",
  "梳理用户旅程",
  "规划路线图",
  "制定研究计划",
  "撰写需求文档",
];

interface Cabinet {
  name: string;
  description: string;
  agents: number;
  domain: string;
}

const CABINETS: Cabinet[] = [
  { name: "Content Marketing Agency", description: "SEO, blogs & social media on autopilot", agents: 8, domain: "Marketing" },
  { name: "E-commerce Operator", description: "Listings, support, inventory & ads management", agents: 10, domain: "E-commerce" },
  { name: "YouTube Factory", description: "Scripts, edits, thumbnails, scheduling & publishing", agents: 6, domain: "Media" },
  { name: "Dev Agency", description: "PM, engineers, QA & DevOps pipeline", agents: 9, domain: "Software" },
  { name: "Real Estate Leads", description: "Prospecting, outreach, follow-up & closing deals", agents: 7, domain: "Sales" },
  { name: "Bookkeeping Firm", description: "Invoice reconciliation, tax prep & reporting", agents: 6, domain: "Finance" },
  { name: "Grant Writing Agency", description: "Research grants, draft applications & track deadlines", agents: 5, domain: "Finance" },
  { name: "Recruiting Agency", description: "Sourcing, screening, outreach & scheduling", agents: 8, domain: "Professional Services" },
  { name: "Legal Doc Shop", description: "Contract drafting, NDA, compliance & client intake", agents: 6, domain: "Professional Services" },
  { name: "Translation Bureau", description: "Intake, translate, QA, localization & delivery", agents: 5, domain: "Professional Services" },
  { name: "Podcast Production House", description: "Research, scripting, editing & distribution", agents: 7, domain: "Media" },
  { name: "Newsletter Empire", description: "Niche research, writing, curation & growth", agents: 5, domain: "Media" },
  { name: "Stock Photo & Video Studio", description: "AI generation, keywording, listing & licensing", agents: 4, domain: "Media" },
  { name: "Market Research Firm", description: "Data collection, analysis & report generation", agents: 6, domain: "Data & Research" },
  { name: "Competitive Intelligence Agency", description: "Monitoring, alerts, trend reports & executive briefs", agents: 5, domain: "Data & Research" },
  { name: "Lead Enrichment Service", description: "Scrape, verify, enrich, score & deliver lists", agents: 5, domain: "Data & Research" },
  { name: "Online Course Factory", description: "Curriculum, content creation & platform setup", agents: 8, domain: "Education" },
  { name: "Resume & Career Coaching", description: "Resume writing, cover letters & interview prep", agents: 6, domain: "Education" },
  { name: "Customer Support BPO", description: "Ticket triage, response, escalation & reporting", agents: 7, domain: "Operations" },
  { name: "Dropshipping Brand", description: "Product research, supplier, storefront & ads", agents: 8, domain: "E-commerce" },
  { name: "SaaS Onboarding Agency", description: "Documentation, tutorials, email sequences & analytics", agents: 6, domain: "Operations" },
  { name: "Review Management Agency", description: "Monitor reviews, draft responses & report sentiment", agents: 4, domain: "Marketing" },
  { name: "Event Promotion Agency", description: "Find events, create assets, distribute & sell tickets", agents: 7, domain: "Marketing" },
  { name: "UGC Ad Factory", description: "Script hooks, brief creators, edit & A/B test", agents: 7, domain: "Paid Social" },
  { name: "Meta Ads War Room", description: "Creative variants, audience, launch & optimize ROAS", agents: 6, domain: "Paid Social" },
  { name: "TikTok Shop Operator", description: "Product listings, affiliate outreach & live stream", agents: 8, domain: "E-commerce" },
  { name: "Influencer Matchmaker", description: "Find creators, negotiate, brief & measure ROI", agents: 6, domain: "Paid Social" },
  { name: "Cold Email Agency", description: "ICP research, list building, copy & sending", agents: 7, domain: "Sales" },
  { name: "LinkedIn Lead Gen Shop", description: "Profile optimization, connections & DM sequences", agents: 5, domain: "Sales" },
  { name: "Appointment Setting Firm", description: "Multi-channel outreach, qualification & booking", agents: 6, domain: "Sales" },
  { name: "Amazon FBA Launcher", description: "Product research, listing, PPC & restock alerts", agents: 8, domain: "E-commerce" },
  { name: "Etsy Shop Manager", description: "SEO titles, photos, customer messages & refreshes", agents: 5, domain: "E-commerce" },
  { name: "Amazon PPC Agency", description: "Keyword harvesting, bid management & reporting", agents: 4, domain: "E-commerce" },
  { name: "Ghostwriting Studio", description: "LinkedIn posts, Twitter threads & newsletters", agents: 5, domain: "Content Ops" },
  { name: "Clip Farm", description: "Chop long-form into reels, shorts & captions", agents: 5, domain: "Media" },
  { name: "Blog-to-Revenue Pipeline", description: "Keyword research, write, optimize & monetize", agents: 7, domain: "Marketing" },
  { name: "Carousel Factory", description: "Design Instagram, LinkedIn & TikTok carousels", agents: 4, domain: "Marketing" },
  { name: "Webflow & Framer Build Shop", description: "Design, build, copy, launch & maintain sites", agents: 6, domain: "Software" },
  { name: "Shopify Store Setup Agency", description: "Theme, products, payments & launch checklist", agents: 5, domain: "E-commerce" },
  { name: "Notion & Airtable Systems Builder", description: "Intake requirements, build, automate & document", agents: 5, domain: "Software" },
  { name: "Podcast Booking Agency", description: "Research shows, pitch, schedule & prep talking points", agents: 6, domain: "Media" },
  { name: "PR Pitching Machine", description: "Media list, write pitches, send & track", agents: 5, domain: "Marketing" },
  { name: "Proposal & RFP Factory", description: "Parse RFPs, draft responses, format & submit", agents: 6, domain: "Professional Services" },
  { name: "Warranty Returns Processor", description: "Intake claims, verify, process & report trends", agents: 5, domain: "Operations" },
  { name: "Price Monitoring Service", description: "Track competitor prices, alert changes & report", agents: 4, domain: "Data & Research" },
  { name: "Job Board Aggregator", description: "Scrape postings, deduplicate & categorize", agents: 5, domain: "Data & Research" },
  { name: "Patent & Trademark Watch", description: "Monitor filings, flag conflicts & summarize", agents: 4, domain: "Data & Research" },
  { name: "App Store Optimization Shop", description: "Keyword research, screenshots & A/B test", agents: 5, domain: "Marketing" },
  { name: "Churned User Win-Back Agency", description: "Segment churned users, write sequences & track", agents: 4, domain: "Marketing" },
  { name: "Onboarding Email Studio", description: "Map user journey, write drip, test & optimize", agents: 4, domain: "Marketing" },
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
  if (hour < 12) return "早上好";
  if (hour < 17) return "下午好";
  return "晚上好";
}

function CabinetCard({ cabinet }: { cabinet: Cabinet }) {
  const colorClass = DOMAIN_COLORS[cabinet.domain] || "bg-muted text-muted-foreground";

  return (
    <div className="flex-shrink-0 w-64 h-36 rounded-xl border border-border bg-card p-4 flex flex-col cursor-default select-none">
      <h3 className="text-sm font-medium text-foreground leading-tight">
        {cabinet.name}
      </h3>
      <p className="text-xs text-muted-foreground leading-relaxed mt-2">
        {cabinet.description}
      </p>
      <div className="flex items-center justify-between mt-auto pt-3">
        <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full", colorClass)}>
          {cabinet.domain}
        </span>
        <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <Users className="h-3 w-3" />
          {cabinet.agents} agents
        </span>
      </div>
    </div>
  );
}

function InfiniteCarousel() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    let animationId: number;
    let position = 0;
    const speed = 1.2; // px per frame

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
  }, [isPaused]);

  const doubled = [...CABINETS, ...CABINETS];

  return (
    <div
      className="relative w-full overflow-hidden"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div
        ref={scrollRef}
        className="flex gap-3 will-change-transform"
      >
        {doubled.map((cabinet, i) => (
          <CabinetCard key={`${cabinet.name}-${i}`} cabinet={cabinet} />
        ))}
      </div>
      <div className="absolute inset-0 backdrop-blur-[1.5px] hover:backdrop-blur-[0.5px] transition-all duration-500 z-10" />
      <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
        <span className="text-sm font-semibold uppercase tracking-wider text-muted-foreground bg-background/80 px-4 py-1.5 rounded-full border border-border">
          Coming soon
        </span>
      </div>
    </div>
  );
}

type SubmitMode = "chat" | "task";

interface MulticaAgent {
  id: string;
  name: string;
  description?: string;
  status?: string;
  archived_at?: string | null;
}

function getMulticaToken(): string | null {
  if (typeof window === "undefined") return null;
  // Try localStorage first (set by MulticaAuthGuard after login)
  const stored = localStorage.getItem("multica_token");
  if (stored) return stored;
  // Fallback: Electron preload exposes the PAT directly
  const desktop = (window as Record<string, any>).CabinetDesktop;
  if (desktop?.multicaPAT) return desktop.multicaPAT;
  // Fallback: env var (dev mode)
  return process.env.NEXT_PUBLIC_MULTICA_PAT || null;
}

function getMulticaAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const token = getMulticaToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const wsId = typeof window !== "undefined" ? localStorage.getItem("multica_workspace_id") : null;
  if (wsId) headers["X-Workspace-ID"] = wsId;
  return headers;
}

export function HomeScreen() {
  const setSection = useAppStore((s) => s.setSection);
  const [prompt, setPrompt] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);
  const [mode, setMode] = useState<SubmitMode>("task");
  const [agents, setAgents] = useState<MulticaAgent[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [agentMenuOpen, setAgentMenuOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const agentMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/agents/config")
      .then((r) => r.json())
      .then((data) => {
        if (data.company?.name) {
          setUserName(data.company.name);
        }
      })
      .catch(() => {});
  }, []);

  // Load Multica agents for task assignment
  useEffect(() => {
    const headers = getMulticaAuthHeaders();
    const wsId = typeof window !== "undefined" ? localStorage.getItem("multica_workspace_id") : null;
    const params = new URLSearchParams();
    if (wsId) params.set("workspace_id", wsId);
    const qs = params.toString() ? `?${params}` : "";
    fetch(`/multica-api/agents${qs}`, { headers })
      .then((r) => (r.ok ? r.json() : []))
      .then((data: MulticaAgent[]) => {
        const active = Array.isArray(data)
          ? data.filter((a) => !a.archived_at)
          : [];
        setAgents(active);
        if (active.length > 0) {
          setSelectedAgentId((prev) => prev ?? active[0].id);
        }
      })
      .catch(() => {});
  }, []);

  // Close agent menu on outside click
  useEffect(() => {
    if (!agentMenuOpen) return;
    const handler = (e: MouseEvent) => {
      if (agentMenuRef.current && !agentMenuRef.current.contains(e.target as Node)) {
        setAgentMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [agentMenuOpen]);

  const submitChat = useCallback(async (text: string) => {
    const res = await fetch("/api/agents/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        agentSlug: "general",
        userMessage: text.trim(),
        mentionedPaths: [],
      }),
    });
    if (res.ok) {
      const data = await res.json();
      setPrompt("");
      setSection({
        type: "agent",
        slug: "general",
        conversationId: data.conversation?.id,
      });
    }
  }, [setSection]);

  const submitTask = useCallback(async (text: string) => {
    const headers = getMulticaAuthHeaders();
    const wsId = typeof window !== "undefined" ? localStorage.getItem("multica_workspace_id") : null;
    const params = new URLSearchParams();
    if (wsId) params.set("workspace_id", wsId);
    const qs = params.toString() ? `?${params}` : "";

    const payload: Record<string, unknown> = {
      title: text.trim(),
      status: "todo",
      priority: "medium",
    };
    if (selectedAgentId) {
      payload.assignee_type = "agent";
      payload.assignee_id = selectedAgentId;
    }

    const res = await fetch(`/multica-api/issues${qs}`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const issue = await res.json();
      setError(null);
      setPrompt("");
      if (issue?.id) {
        setSection({ type: "issue-detail", id: issue.id });
      } else {
        setSection({ type: "issues" });
      }
    } else {
      const body = await res.text().catch(() => "");
      setError(`创建任务失败 (${res.status})${body ? `: ${body.slice(0, 100)}` : ""}`);
    }
  }, [selectedAgentId, setSection]);

  const submitPrompt = async (text: string) => {
    if (!text.trim() || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      if (mode === "task") {
        await submitTask(text);
      } else {
        await submitChat(text);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "操作失败，请重试");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitPrompt(prompt);
  };

  const greeting = getGreeting();
  const displayName = userName || "";
  const selectedAgent = agents.find((a) => a.id === selectedAgentId);
  const quickActions = mode === "task" ? QUICK_ACTIONS_TASK : QUICK_ACTIONS_CHAT;

  return (
    <div className="flex-1 flex flex-col items-center px-4 overflow-hidden">
      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-2xl space-y-6">
        {/* Greeting */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl md:text-4xl font-semibold text-foreground tracking-tight">
            {greeting}{displayName ? `, ${displayName}` : ""}
          </h1>
          <p className="text-base text-muted-foreground">
            {mode === "task" ? "有什么需要处理？" : "聊点什么？"}
          </p>
        </div>

        {/* Input area */}
        <div className="w-full max-w-lg space-y-3">
          {/* Mode toggle + Agent selector row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-0.5">
              <button
                type="button"
                onClick={() => setMode("task")}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all",
                  mode === "task"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <ListTodo className="h-3.5 w-3.5" />
                创建任务
              </button>
              <button
                type="button"
                onClick={() => setMode("chat")}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all",
                  mode === "chat"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <MessageSquare className="h-3.5 w-3.5" />
                对话
              </button>
            </div>

            {/* Agent selector (task mode) */}
            {mode === "task" && agents.length > 0 && (
              <div className="relative" ref={agentMenuRef}>
                <button
                  type="button"
                  onClick={() => setAgentMenuOpen(!agentMenuOpen)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5",
                    "text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                  )}
                >
                  <Bot className="h-3.5 w-3.5 text-purple-400" />
                  <span className="font-medium text-foreground">{selectedAgent?.name || "选择智能体"}</span>
                  <ChevronDown className={cn("h-3 w-3 transition-transform", agentMenuOpen && "rotate-180")} />
                </button>
                {agentMenuOpen && (
                  <div className="absolute right-0 top-full mt-1 z-50 min-w-[200px] rounded-lg border border-border bg-popover p-1 shadow-lg animate-in fade-in-0 zoom-in-95 duration-100">
                    {agents.map((agent) => (
                      <button
                        key={agent.id}
                        type="button"
                        onClick={() => {
                          setSelectedAgentId(agent.id);
                          setAgentMenuOpen(false);
                        }}
                        className={cn(
                          "flex w-full items-center gap-2 rounded-md px-3 py-2 text-xs transition-colors",
                          agent.id === selectedAgentId
                            ? "bg-accent text-accent-foreground"
                            : "text-foreground hover:bg-accent"
                        )}
                      >
                        <Bot className="h-3.5 w-3.5 text-purple-400 flex-shrink-0" />
                        <span className="truncate">{agent.name}</span>
                        {agent.id === selectedAgentId && (
                          <span className="ml-auto text-[10px] text-muted-foreground">&#10003;</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Input field */}
          <form onSubmit={handleSubmit} className="relative">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
                  e.preventDefault();
                  submitPrompt(prompt);
                } else if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault();
                  setPrompt((prev) => prev + "\n");
                }
              }}
              placeholder={mode === "task" ? "描述任务内容..." : "想聊什么..."}
              disabled={submitting}
              rows={2}
              className={cn(
                "w-full rounded-xl border border-border bg-card px-4 py-3 pr-12",
                "text-sm text-foreground placeholder:text-muted-foreground",
                "focus:outline-none focus:ring-2 focus:ring-ring",
                "shadow-sm resize-none leading-relaxed"
              )}
              autoFocus
            />
            <button
              type="submit"
              disabled={!prompt.trim() || submitting}
              className={cn(
                "absolute right-2.5 bottom-2.5 h-8 w-8 rounded-lg flex items-center justify-center",
                "transition-colors",
                prompt.trim() && !submitting
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "bg-muted text-muted-foreground"
              )}
            >
              <Send className="h-4 w-4" />
            </button>
          </form>

          {/* Error message */}
          {error && (
            <p className="text-xs text-destructive text-center">{error}</p>
          )}
        </div>

        {/* Quick actions */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          {quickActions.map((action) => (
            <button
              key={action}
              onClick={() => submitPrompt(action)}
              disabled={submitting}
              className={cn(
                "rounded-full border border-border px-3.5 py-1.5",
                "text-xs text-muted-foreground",
                "hover:bg-accent hover:text-accent-foreground",
                "transition-colors",
                submitting && "opacity-50 cursor-not-allowed"
              )}
            >
              {action}
            </button>
          ))}
        </div>
      </div>

      <div className="w-screen pb-8 pt-4 space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground text-center">
          Import a pre-made zero-human team
        </h2>
        <InfiniteCarousel />
      </div>
    </div>
  );
}
