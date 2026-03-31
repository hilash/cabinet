"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowRight,
  ArrowLeft,
  Rocket,
  Megaphone,
  Target,
  Wrench,
  FileText,
  Search,
  Settings,
  HeadphonesIcon,
  Users,
  DollarSign,
  Check,
  Loader2,
} from "lucide-react";

interface CompanyProfile {
  name: string;
  product: string;
  teamSize: string;
}

interface Department {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  agents: { name: string; emoji: string; role: string; type: string; plays: string[] }[];
  plays: string[];
}

const DEPARTMENTS: Department[] = [
  {
    id: "marketing",
    name: "Marketing",
    description: "Reddit, LinkedIn, content, SEO",
    icon: <Megaphone className="h-5 w-5" />,
    agents: [
      { name: "Head of Marketing", emoji: "👑", role: "Marketing Department Lead", type: "lead", plays: [] },
      { name: "Content Agent", emoji: "📝", role: "Content & Community Specialist", type: "specialist", plays: ["reddit-monitor", "linkedin-poster"] },
      { name: "Outreach Agent", emoji: "🎯", role: "Lead Generation & Competitive Intelligence", type: "specialist", plays: ["lead-scorer", "competitor-tracker"] },
    ],
    plays: ["reddit-monitor", "linkedin-poster", "lead-scorer", "competitor-tracker"],
  },
  {
    id: "sales",
    name: "Sales",
    description: "Lead scoring, outreach, follow-ups",
    icon: <Target className="h-5 w-5" />,
    agents: [
      { name: "Sales Agent", emoji: "💼", role: "Sales Development Representative", type: "specialist", plays: [] },
    ],
    plays: [],
  },
  {
    id: "engineering",
    name: "Engineering",
    description: "QA, code review, deploys",
    icon: <Wrench className="h-5 w-5" />,
    agents: [
      { name: "Engineering Agent", emoji: "🛠", role: "QA & Code Review", type: "specialist", plays: [] },
    ],
    plays: [],
  },
  {
    id: "content",
    name: "Content",
    description: "Blog posts, social media, repurposing",
    icon: <FileText className="h-5 w-5" />,
    agents: [
      { name: "Content Writer", emoji: "✍️", role: "Blog & Social Content Creator", type: "specialist", plays: [] },
    ],
    plays: [],
  },
  {
    id: "research",
    name: "Research",
    description: "Competitor monitoring, market intel",
    icon: <Search className="h-5 w-5" />,
    agents: [
      { name: "Research Agent", emoji: "🔬", role: "Market & Competitive Intelligence", type: "specialist", plays: ["competitor-tracker"] },
    ],
    plays: ["competitor-tracker"],
  },
  {
    id: "operations",
    name: "Operations",
    description: "Invoicing, HR, admin",
    icon: <Settings className="h-5 w-5" />,
    agents: [
      { name: "Operations Agent", emoji: "⚙️", role: "Chief of Staff & Admin", type: "specialist", plays: [] },
    ],
    plays: [],
  },
  {
    id: "support",
    name: "Customer Support",
    description: "Ticket triage, responses",
    icon: <HeadphonesIcon className="h-5 w-5" />,
    agents: [
      { name: "Support Agent", emoji: "🎧", role: "Customer Support & Ticket Triage", type: "specialist", plays: [] },
    ],
    plays: [],
  },
  {
    id: "hiring",
    name: "Hiring",
    description: "Resume screening, outreach",
    icon: <Users className="h-5 w-5" />,
    agents: [
      { name: "Hiring Agent", emoji: "👥", role: "Recruiting & Talent Sourcing", type: "specialist", plays: [] },
    ],
    plays: [],
  },
  {
    id: "finance",
    name: "Finance",
    description: "Bookkeeping, reporting, metrics",
    icon: <DollarSign className="h-5 w-5" />,
    agents: [
      { name: "Finance Agent", emoji: "💰", role: "Financial Reporting & Metrics", type: "specialist", plays: [] },
    ],
    plays: [],
  },
];

const TEAM_SIZES = ["Just me", "2-5", "6-20", "20+"];

export function OnboardingWizard({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState<CompanyProfile>({ name: "", product: "", teamSize: "" });
  const [selectedDepts, setSelectedDepts] = useState<Set<string>>(new Set());
  const [launching, setLaunching] = useState(false);

  const toggleDept = (id: string) => {
    setSelectedDepts((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const totalAgents = DEPARTMENTS.filter((d) => selectedDepts.has(d.id)).reduce(
    (sum, d) => sum + d.agents.length,
    0
  );

  const launch = useCallback(async () => {
    setLaunching(true);
    try {
      // Save company config
      await fetch("/api/agents/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exists: true,
          company: profile,
          departments: Array.from(selectedDepts),
          setupDate: new Date().toISOString(),
        }),
      });

      // Create agents for selected departments
      for (const dept of DEPARTMENTS) {
        if (!selectedDepts.has(dept.id)) continue;
        for (const agent of dept.agents) {
          const slug = agent.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
          await fetch("/api/agents/personas", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              slug,
              name: agent.name,
              emoji: agent.emoji,
              role: agent.role,
              department: dept.id,
              type: agent.type,
              active: true,
              provider: "claude",
              heartbeat: agent.type === "lead" ? "0 */6 * * *" : "0 */4 * * *",
              channels: [dept.id, "general"],
              plays: agent.plays,
              tags: [dept.id],
              body: `You are ${agent.name}, the ${agent.role} for ${profile.name || "the company"}.\n\nCompany: ${profile.name}\nProduct: ${profile.product}\nDepartment: ${dept.name}\nRole type: ${agent.type}`,
            }),
          });
        }
      }

      onComplete();
    } catch (e) {
      console.error("Setup failed:", e);
      setLaunching(false);
    }
  }, [profile, selectedDepts, onComplete]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="w-full max-w-2xl mx-auto px-6">
        {/* Progress indicator */}
        <div className="flex items-center justify-center gap-2 mb-10">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-2">
              <div
                className={`h-2.5 rounded-full transition-all duration-300 ${
                  i <= step
                    ? "bg-primary w-10"
                    : "bg-muted w-6"
                }`}
              />
            </div>
          ))}
        </div>

        {/* Step 1: Company Profile */}
        {step === 0 && (
          <div className="space-y-8 animate-in fade-in duration-300">
            <div className="text-center space-y-2">
              <h1 className="text-3xl font-bold tracking-tight">Welcome to Cabinet</h1>
              <p className="text-muted-foreground text-lg">
                Your Company OS. Let&apos;s set up your agent team.
              </p>
            </div>

            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  What&apos;s your company called?
                </label>
                <Input
                  value={profile.name}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  placeholder="Acme Corp"
                  className="h-11 text-base"
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  What&apos;s your product or service?
                </label>
                <Input
                  value={profile.product}
                  onChange={(e) => setProfile({ ...profile, product: e.target.value })}
                  placeholder="GPU optimization platform for AI workloads"
                  className="h-11 text-base"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  How many people on your team?
                </label>
                <div className="flex gap-2">
                  {TEAM_SIZES.map((size) => (
                    <button
                      key={size}
                      onClick={() => setProfile({ ...profile, teamSize: size })}
                      className={`flex-1 py-2.5 px-3 rounded-lg border text-sm font-medium transition-all ${
                        profile.teamSize === size
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border hover:border-primary/30 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                onClick={() => setStep(1)}
                disabled={!profile.name.trim()}
                className="gap-2 h-10 px-5"
              >
                Next
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Department Selection */}
        {step === 1 && (
          <div className="space-y-8 animate-in fade-in duration-300">
            <div className="text-center space-y-2">
              <h1 className="text-3xl font-bold tracking-tight">What should your agents handle?</h1>
              <p className="text-muted-foreground text-lg">
                Select the areas where you need help. You can add more later.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {DEPARTMENTS.map((dept) => {
                const selected = selectedDepts.has(dept.id);
                return (
                  <button
                    key={dept.id}
                    onClick={() => toggleDept(dept.id)}
                    className={`relative p-4 rounded-xl border text-left transition-all ${
                      selected
                        ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                        : "border-border hover:border-primary/30 hover:bg-muted/30"
                    }`}
                  >
                    {selected && (
                      <div className="absolute top-2.5 right-2.5 h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                        <Check className="h-3 w-3 text-primary-foreground" />
                      </div>
                    )}
                    <div className="flex items-center gap-2.5 mb-1.5">
                      <span className={`${selected ? "text-primary" : "text-muted-foreground"}`}>
                        {dept.icon}
                      </span>
                      <span className="font-medium text-sm">{dept.name}</span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {dept.description}
                    </p>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-2">
              <Button variant="ghost" onClick={() => setStep(0)} className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <Button
                onClick={() => setStep(2)}
                disabled={selectedDepts.size === 0}
                className="gap-2 h-10 px-5"
              >
                Next
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Review & Launch */}
        {step === 2 && (
          <div className="space-y-8 animate-in fade-in duration-300">
            <div className="text-center space-y-2">
              <h1 className="text-3xl font-bold tracking-tight">Your agent team</h1>
              <p className="text-muted-foreground text-lg">
                {totalAgents} agents across {selectedDepts.size} department{selectedDepts.size !== 1 ? "s" : ""}. Ready to launch.
              </p>
            </div>

            <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
              {DEPARTMENTS.filter((d) => selectedDepts.has(d.id)).map((dept) => (
                <div
                  key={dept.id}
                  className="border border-border rounded-xl p-4 space-y-3"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">{dept.icon}</span>
                    <span className="font-semibold text-sm">{dept.name}</span>
                    <span className="text-xs text-muted-foreground ml-auto">
                      {dept.agents.length} agent{dept.agents.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="space-y-1.5 pl-1">
                    {dept.agents.map((agent, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2.5 text-sm"
                      >
                        <span className="text-base">{agent.emoji}</span>
                        <span className="font-medium">{agent.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {agent.type === "lead" ? "Lead" : agent.role}
                        </span>
                      </div>
                    ))}
                  </div>
                  {dept.plays.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {dept.plays.map((play) => (
                        <span
                          key={play}
                          className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground"
                        >
                          {play}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="border border-border/50 rounded-xl p-4 bg-muted/20">
              <div className="text-sm space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Slack channels</span>
                  <span className="font-medium">
                    #general, #alerts
                    {Array.from(selectedDepts).map((d) => `, #${d}`).join("")}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Runtime</span>
                  <span className="font-medium">Heartbeat (auto-schedule)</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <Button variant="ghost" onClick={() => setStep(1)} className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <Button
                onClick={launch}
                disabled={launching}
                className="gap-2 h-10 px-6"
              >
                {launching ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Launching...
                  </>
                ) : (
                  <>
                    <Rocket className="h-4 w-4" />
                    Launch Team
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
