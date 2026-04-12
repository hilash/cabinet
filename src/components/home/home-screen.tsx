"use client";

import { useState, useEffect, useRef } from "react";
import { useAppStore } from "@/stores/app-store";
import { Send, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const QUICK_ACTIONS = [
  "Brainstorm ideas",
  "Map user journey",
  "Plan roadmap",
  "Create research plan",
  "Create requirements doc",
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
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
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

export function HomeScreen() {
  const setSection = useAppStore((s) => s.setSection);
  const [prompt, setPrompt] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);

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

  const submitPrompt = async (text: string) => {
    if (!text.trim() || submitting) return;

    setSubmitting(true);
    try {
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
          mode: "ops",
          slug: "general",
          conversationId: data.conversation?.id,
        });
      }
    } catch {
      // ignore
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitPrompt(prompt);
  };

  const greeting = getGreeting();
  const displayName = userName || "there";

  return (
    <div className="flex-1 flex flex-col items-center px-4 overflow-hidden">
      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-xl space-y-8">
        <h1 className="text-3xl md:text-4xl font-semibold text-center text-foreground tracking-tight">
          {greeting}, {displayName}.<br />
          What are we working on today?
        </h1>

        <form onSubmit={handleSubmit} className="relative w-full">
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
            placeholder="I want to create..."
            disabled={submitting}
            rows={1}
            className={cn(
              "w-full rounded-xl border border-border bg-card px-4 py-3 pr-44 sm:pr-52",
              "text-sm text-foreground placeholder:text-muted-foreground",
              "focus:outline-none focus:ring-2 focus:ring-ring",
              "shadow-sm resize-none"
            )}
            autoFocus
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
            <kbd className="hidden sm:inline-flex items-center gap-0.5 text-[10px] text-muted-foreground/60 font-medium">
              <span className="rounded border border-border/50 px-1 py-0.5">⌘</span>
              <span>+</span>
              <span className="rounded border border-border/50 px-1 py-0.5">↵</span>
              <span className="ml-0.5">new line</span>
            </kbd>
            <button
              type="submit"
              disabled={!prompt.trim() || submitting}
              className={cn(
                "h-8 w-8 rounded-lg flex items-center justify-center",
                "transition-colors",
                prompt.trim() && !submitting
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "bg-muted text-muted-foreground"
              )}
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </form>

        <div className="flex flex-wrap items-center justify-center gap-2">
          {QUICK_ACTIONS.map((action) => (
            <button
              key={action}
              onClick={() => submitPrompt(action)}
              disabled={submitting}
              className={cn(
                "rounded-full border border-border px-4 py-1.5",
                "text-sm text-foreground/80",
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
