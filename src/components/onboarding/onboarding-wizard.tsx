"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowRight,
  ArrowLeft,
  Rocket,
  Check,
  Loader2,
} from "lucide-react";

interface OnboardingAnswers {
  companyName: string;
  description: string;
  goals: string;
  teamSize: string;
  priority: string;
}

interface SuggestedAgent {
  slug: string;
  name: string;
  emoji: string;
  role: string;
  checked: boolean;
}

const TEAM_SIZES = ["Just me", "2-5", "5-20", "20+"];

const STEP_COUNT = 4; // welcome, 5 questions (in 2 screens), team suggestion, launching

function suggestTeam(answers: OnboardingAnswers): SuggestedAgent[] {
  const agents: SuggestedAgent[] = [
    { slug: "ceo", name: "CEO Agent", emoji: "\u{1F3AF}", role: "Strategic planning, goal tracking, task delegation", checked: true },
    { slug: "editor", name: "Editor", emoji: "\u{1F4DD}", role: "KB content, documentation, formatting", checked: true },
  ];

  const desc = (answers.description + " " + answers.goals + " " + answers.priority).toLowerCase();

  if (desc.match(/content|blog|social|market|brand|seo|newsletter/)) {
    agents.push({ slug: "content-marketer", name: "Content Marketer", emoji: "\u{1F4E3}", role: "Blog, social media, newsletters, content strategy", checked: true });
  }

  if (desc.match(/seo|search|rank|keyword|organic|google/)) {
    agents.push({ slug: "seo", name: "SEO Specialist", emoji: "\u{1F50D}", role: "Keyword research, site optimization, rankings", checked: false });
  }

  if (desc.match(/sales|lead|outreach|revenue|customer|pipeline|deal/)) {
    agents.push({ slug: "sales", name: "Sales Agent", emoji: "\u{1F4B0}", role: "Lead generation, outreach, pipeline management", checked: false });
  }

  if (desc.match(/quality|review|proofread|test|check|audit/)) {
    agents.push({ slug: "qa", name: "QA Agent", emoji: "\u{1F9EA}", role: "Review, proofread, fact-check content", checked: false });
  }

  // If no specific agents matched, add content marketer as a reasonable default
  if (agents.length === 2) {
    agents.push({ slug: "content-marketer", name: "Content Marketer", emoji: "\u{1F4E3}", role: "Blog, social media, newsletters", checked: true });
  }

  return agents;
}

export function OnboardingWizard({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<OnboardingAnswers>({
    companyName: "",
    description: "",
    goals: "",
    teamSize: "",
    priority: "",
  });
  const [suggestedAgents, setSuggestedAgents] = useState<SuggestedAgent[]>([]);
  const [launching, setLaunching] = useState(false);

  const goToTeamSuggestion = () => {
    setSuggestedAgents(suggestTeam(answers));
    setStep(3);
  };

  const toggleAgent = (slug: string) => {
    setSuggestedAgents((prev) =>
      prev.map((a) => (a.slug === slug ? { ...a, checked: !a.checked } : a))
    );
  };

  const launch = useCallback(async () => {
    setLaunching(true);
    try {
      const selected = suggestedAgents.filter((a) => a.checked).map((a) => a.slug);

      await fetch("/api/onboarding/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answers,
          selectedAgents: selected,
        }),
      });

      onComplete();
    } catch (e) {
      console.error("Setup failed:", e);
      setLaunching(false);
    }
  }, [answers, suggestedAgents, onComplete]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="w-full max-w-xl mx-auto px-6">
        {/* Progress indicator */}
        <div className="flex items-center justify-center gap-2 mb-10">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`h-2.5 rounded-full transition-all duration-300 ${
                i <= step ? "bg-primary w-10" : "bg-muted w-6"
              }`}
            />
          ))}
        </div>

        {/* Step 0: Welcome */}
        {step === 0 && (
          <div className="space-y-8 animate-in fade-in duration-300">
            <div className="text-center space-y-3">
              <h1 className="text-3xl font-bold tracking-tight">
                Welcome to Cabinet
              </h1>
              <p className="text-muted-foreground text-lg leading-relaxed">
                Let&apos;s set up your AI team. I&apos;ll ask a few questions
                to get the right agents working for you.
              </p>
            </div>
            <div className="flex justify-center pt-4">
              <Button onClick={() => setStep(1)} className="gap-2 h-10 px-6">
                Let&apos;s go
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 1: Questions 1-3 */}
        {step === 1 && (
          <div className="space-y-8 animate-in fade-in duration-300">
            <div className="text-center space-y-2">
              <h1 className="text-2xl font-bold tracking-tight">
                Tell me about your project
              </h1>
            </div>

            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  What&apos;s your company or project name?
                </label>
                <Input
                  value={answers.companyName}
                  onChange={(e) =>
                    setAnswers({ ...answers, companyName: e.target.value })
                  }
                  placeholder="Acme Corp"
                  className="h-11 text-base"
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">What do you do?</label>
                <Input
                  value={answers.description}
                  onChange={(e) =>
                    setAnswers({ ...answers, description: e.target.value })
                  }
                  placeholder="We make a podcast about AI startups"
                  className="h-11 text-base"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  What are your top 3 goals right now?
                </label>
                <Input
                  value={answers.goals}
                  onChange={(e) =>
                    setAnswers({ ...answers, goals: e.target.value })
                  }
                  placeholder="Grow newsletter to 1k subs, launch blog, get first 10 customers"
                  className="h-11 text-base"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <Button
                variant="ghost"
                onClick={() => setStep(0)}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <Button
                onClick={() => setStep(2)}
                disabled={!answers.companyName.trim()}
                className="gap-2 h-10 px-5"
              >
                Next
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Questions 4-5 */}
        {step === 2 && (
          <div className="space-y-8 animate-in fade-in duration-300">
            <div className="text-center space-y-2">
              <h1 className="text-2xl font-bold tracking-tight">
                Almost there
              </h1>
            </div>

            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  How big is your team?
                </label>
                <div className="flex gap-2">
                  {TEAM_SIZES.map((size) => (
                    <button
                      key={size}
                      onClick={() =>
                        setAnswers({ ...answers, teamSize: size })
                      }
                      className={`flex-1 py-2.5 px-3 rounded-lg border text-sm font-medium transition-all ${
                        answers.teamSize === size
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border hover:border-primary/30 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  What&apos;s your most immediate priority?
                </label>
                <Input
                  value={answers.priority}
                  onChange={(e) =>
                    setAnswers({ ...answers, priority: e.target.value })
                  }
                  placeholder="Set up our content engine and start publishing weekly"
                  className="h-11 text-base"
                  autoFocus
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <Button
                variant="ghost"
                onClick={() => setStep(1)}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <Button
                onClick={goToTeamSuggestion}
                className="gap-2 h-10 px-5"
              >
                Next
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Team Suggestion */}
        {step === 3 && (
          <div className="space-y-8 animate-in fade-in duration-300">
            <div className="text-center space-y-2">
              <h1 className="text-2xl font-bold tracking-tight">
                Your starter team
              </h1>
              <p className="text-muted-foreground">
                Based on your goals, here&apos;s who I recommend. Check the
                agents you want &mdash; you can always add more from the library
                later.
              </p>
            </div>

            <div className="space-y-2">
              {suggestedAgents.map((agent) => (
                <button
                  key={agent.slug}
                  onClick={() => toggleAgent(agent.slug)}
                  className={`flex items-center gap-3 w-full p-3 rounded-lg border text-left transition-all ${
                    agent.checked
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/30"
                  }`}
                >
                  <div
                    className={`h-5 w-5 rounded border flex items-center justify-center shrink-0 transition-colors ${
                      agent.checked
                        ? "bg-primary border-primary"
                        : "border-muted-foreground/30"
                    }`}
                  >
                    {agent.checked && (
                      <Check className="h-3 w-3 text-primary-foreground" />
                    )}
                  </div>
                  <span className="text-xl">{agent.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium">{agent.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {agent.role}
                    </p>
                  </div>
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between pt-2">
              <Button
                variant="ghost"
                onClick={() => setStep(2)}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <Button
                onClick={launch}
                disabled={
                  launching ||
                  suggestedAgents.filter((a) => a.checked).length === 0
                }
                className="gap-2 h-10 px-6"
              >
                {launching ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Setting up...
                  </>
                ) : (
                  <>
                    <Rocket className="h-4 w-4" />
                    Set up team
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
