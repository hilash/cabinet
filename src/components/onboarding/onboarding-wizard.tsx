"use client";

import { type ReactNode, useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Cloud,
  Check,
  Loader2,
  Rocket,
  Sparkles,
  Star,
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

interface CommunityCard {
  title: string;
  description: string;
  cta: string;
  href?: string;
  icon: ReactNode;
  iconClassName: string;
}

interface CommunityStepConfig {
  eyebrow: string;
  title: string;
  description: string;
  aside?: string;
  cards: CommunityCard[];
  nextLabel?: string;
}

const DISCORD_SUPPORT_URL = "https://discord.com/invite/rxd8BYnN";
const GITHUB_REPO_URL = "https://github.com/hilash/cabinet";
const GITHUB_STATS_URL = "/api/github/repo";
const GITHUB_STARS_FALLBACK = 393;
const CABINET_CLOUD_URL = "https://runcabinet.com/waitlist";
const TEAM_SIZES = ["Just me", "2-5", "5-20", "20+"];
const COMMUNITY_START_STEP = 4;
const COMMUNITY_END_STEP = 6;
const STEP_COUNT = 7;

function DiscordIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M20.32 4.37a16.4 16.4 0 0 0-4.1-1.28.06.06 0 0 0-.07.03c-.18.32-.38.73-.52 1.06a15.16 15.16 0 0 0-4.56 0c-.15-.34-.35-.74-.53-1.06a.06.06 0 0 0-.07-.03c-1.43.24-2.8.68-4.1 1.28a.05.05 0 0 0-.02.02C3.77 8.17 3.12 11.87 3.44 15.53a.06.06 0 0 0 .02.04 16.52 16.52 0 0 0 5.03 2.54.06.06 0 0 0 .07-.02c.39-.54.74-1.12 1.04-1.73a.06.06 0 0 0-.03-.08 10.73 10.73 0 0 1-1.6-.77.06.06 0 0 1-.01-.1l.32-.24a.06.06 0 0 1 .06-.01c3.35 1.53 6.98 1.53 10.29 0a.06.06 0 0 1 .06 0c.1.08.21.16.32.24a.06.06 0 0 1-.01.1c-.51.3-1.05.56-1.6.77a.06.06 0 0 0-.03.08c.3.61.65 1.19 1.04 1.73a.06.06 0 0 0 .07.02 16.42 16.42 0 0 0 5.03-2.54.06.06 0 0 0 .02-.04c.38-4.23-.64-7.9-2.89-11.14a.04.04 0 0 0-.02-.02ZM9.68 13.3c-.98 0-1.78-.9-1.78-2s.79-2 1.78-2c.99 0 1.79.9 1.78 2 0 1.1-.8 2-1.78 2Zm4.64 0c-.98 0-1.78-.9-1.78-2s.79-2 1.78-2c.99 0 1.79.9 1.78 2 0 1.1-.79 2-1.78 2Z" />
    </svg>
  );
}

function formatGithubStars(stars: number) {
  return new Intl.NumberFormat("en-US").format(stars);
}

function CommunityCardTile({ card }: { card: CommunityCard }) {
  const content = (
    <>
      <div
        className={`flex size-10 items-center justify-center rounded-xl border ${card.iconClassName}`}
      >
        {card.icon}
      </div>

      <div className="mt-4 flex flex-col gap-1">
        <p className="text-sm font-semibold">{card.title}</p>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {card.description}
        </p>
      </div>
    </>
  );

  if (!card.href) {
    return (
      <div className="rounded-xl border border-border bg-background/85 p-4">
        {content}
      </div>
    );
  }

  return (
    <a
      href={card.href}
      target="_blank"
      rel="noopener noreferrer"
      className="group rounded-xl border border-border bg-background/90 p-4 transition-all hover:-translate-y-0.5 hover:border-foreground/15 hover:bg-background"
    >
      {content}
      <div className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-foreground">
        <span>{card.cta}</span>
        <ArrowUpRight className="size-4 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
      </div>
    </a>
  );
}

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
  const [githubStars, setGithubStars] = useState(GITHUB_STARS_FALLBACK);

  useEffect(() => {
    const controller = new AbortController();

    const fetchGitHubStats = async () => {
      try {
        const res = await fetch(GITHUB_STATS_URL, {
          signal: controller.signal,
          cache: "no-store",
        });
        if (!res.ok) return;

        const data = await res.json();
        if (typeof data.stars === "number") {
          setGithubStars(data.stars);
        }
      } catch {
        // ignore
      }
    };

    void fetchGitHubStats();
    return () => controller.abort();
  }, []);

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

  const selectedAgentCount = suggestedAgents.filter(
    (agent) => agent.checked
  ).length;
  const communitySteps: CommunityStepConfig[] = [
    {
      eyebrow: "GitHub",
      title: "Help the Cabinet community grow",
      description:
        "A GitHub star helps more people discover Cabinet and join the community.",
      aside:
        "If Cabinet feels useful, give it a star.",
      nextLabel: "Next",
      cards: [],
    },
    {
      eyebrow: "Discord",
      title: "Discord is where the good weirdness happens.",
      description:
        "This is where feedback turns into features, screenshots turn into debates, and somebody usually finds the edge case before it finds you.",
      aside:
        "If you want new features first and prefer 'come chat' over 'please submit a ticket,' this is your room.",
      nextLabel: "Next",
      cards: [
        {
          title: "Join the Discord",
          description:
            "Meet the people building Cabinet, see what's shipping, and toss ideas into the fire while they are still hot.",
          cta: "Join the chat",
          href: DISCORD_SUPPORT_URL,
          icon: <DiscordIcon className="size-4" />,
          iconClassName: "border-[#5865F2]/20 bg-[#5865F2]/10 text-[#5865F2]",
        },
        {
          title: "Why people stay",
          description:
            "Early features, fast answers, behind-the-scenes progress, and the occasional delightful chaos of building in public.",
          cta: "",
          icon: <Sparkles className="size-4" />,
          iconClassName: "border-primary/15 bg-primary/10 text-primary",
        },
      ],
    },
    {
      eyebrow: "Cabinet Cloud",
      title: "Cabinet Cloud is for people who want the magic without babysitting the plumbing.",
      description:
        "Self-hosting is great until you're explaining ports, sync, and local setup to a teammate who just wanted the doc to open.",
      aside:
        "Cloud is the future easy button: easier sharing, less setup, and fewer heroic acts of yak shaving before coffee.",
      cards: [
        {
          title: "Join the Cabinet Cloud waitlist",
          description:
            "Raise your hand if you want the hosted version first when it is ready.",
          cta: "Register for Cabinet Cloud",
          href: CABINET_CLOUD_URL,
          icon: <Cloud className="size-4" />,
          iconClassName: "border-primary/15 bg-primary/10 text-primary",
        },
        {
          title: "Why people want it",
          description:
            "Less setup, easier sharing, faster onboarding for teams, and a much lower chance of explaining terminal tabs before lunch.",
          cta: "",
          icon: <Rocket className="size-4" />,
          iconClassName: "border-border bg-background text-foreground",
        },
      ],
    },
  ];
  const communityStep =
    step >= COMMUNITY_START_STEP && step <= COMMUNITY_END_STEP
      ? communitySteps[step - COMMUNITY_START_STEP]
      : null;
  const isGitHubCommunityStep = communityStep?.eyebrow === "GitHub";
  const launchDisabled = launching || selectedAgentCount === 0;
  const starsLabel = `${formatGithubStars(githubStars)} GitHub stars`;

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen w-full max-w-3xl items-center justify-center px-6 py-10">
        <div className="w-full">
          {/* Progress indicator */}
          <div className="mb-10 flex items-center justify-center gap-2">
            {Array.from({ length: STEP_COUNT }, (_, i) => i).map((i) => (
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
            <div className="mx-auto flex max-w-xl flex-col gap-8 animate-in fade-in duration-300">
              <div className="text-center space-y-3">
                <h1 className="text-3xl font-bold tracking-tight">
                  Welcome to Cabinet
                </h1>
                <p className="text-muted-foreground text-lg leading-relaxed">
                  Let&apos;s set up your AI team. I&apos;ll ask a few questions
                  to get the right agents working for you.
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                <span className="rounded-full border border-border bg-muted/60 px-3 py-1 text-xs font-medium text-muted-foreground">
                  Build your starter team in minutes
                </span>
              </div>
              <div className="flex justify-center pt-2">
                <Button onClick={() => setStep(1)} className="h-10 px-6">
                  Let&apos;s go
                  <ArrowRight data-icon="inline-end" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 1: Questions 1-3 */}
          {step === 1 && (
            <div className="mx-auto flex max-w-xl flex-col gap-8 animate-in fade-in duration-300">
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
                >
                  <ArrowLeft data-icon="inline-start" />
                  Back
                </Button>
                <Button
                  onClick={() => setStep(2)}
                  disabled={!answers.companyName.trim()}
                  className="h-10 px-5"
                >
                  Next
                  <ArrowRight data-icon="inline-end" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Questions 4-5 */}
          {step === 2 && (
            <div className="mx-auto flex max-w-xl flex-col gap-8 animate-in fade-in duration-300">
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
                >
                  <ArrowLeft data-icon="inline-start" />
                  Back
                </Button>
                <Button
                  onClick={goToTeamSuggestion}
                  className="h-10 px-5"
                >
                  Next
                  <ArrowRight data-icon="inline-end" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Team Suggestion */}
          {step === 3 && (
            <div className="flex flex-col gap-8 animate-in fade-in duration-300">
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

              <div className="grid gap-2 md:grid-cols-2">
                {suggestedAgents.map((agent) => (
                  <button
                    key={agent.slug}
                    onClick={() => toggleAgent(agent.slug)}
                    className={`flex w-full items-center gap-3 rounded-xl border p-4 text-left transition-all ${
                      agent.checked
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/30"
                    }`}
                  >
                    <div
                      className={`flex size-5 shrink-0 items-center justify-center rounded border transition-colors ${
                        agent.checked
                          ? "bg-primary border-primary"
                          : "border-muted-foreground/30"
                      }`}
                    >
                      {agent.checked && (
                        <Check className="size-3 text-primary-foreground" />
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
                >
                  <ArrowLeft data-icon="inline-start" />
                  Back
                </Button>
                <Button
                  onClick={() => setStep(COMMUNITY_START_STEP)}
                  disabled={launchDisabled}
                  className="h-10 px-5"
                >
                  Next
                  <ArrowRight data-icon="inline-end" />
                </Button>
              </div>
            </div>
          )}

          {/* Steps 4-6: Community */}
          {communityStep && (
            <div className="mx-auto flex max-w-2xl flex-col gap-8 animate-in fade-in duration-300">
              <div className="rounded-2xl border border-border bg-muted/35 p-5 sm:p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-3">
                    <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      <Sparkles className="size-3.5 text-primary" />
                      {communityStep.eyebrow}
                    </div>
                    <div className="space-y-2">
                      <h2 className="text-xl font-semibold tracking-tight">
                        {communityStep.title}
                      </h2>
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        {communityStep.description}
                      </p>
                      {communityStep.aside && (
                        <p className="text-sm leading-relaxed text-muted-foreground">
                          {communityStep.aside}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {communityStep.cards.length > 0 && (
                  <>
                    <Separator className="my-5" />

                    <div className="grid gap-3 md:grid-cols-2">
                      {communityStep.cards.map((card) => (
                        <CommunityCardTile key={card.title} card={card} />
                      ))}
                    </div>
                  </>
                )}

                {isGitHubCommunityStep && (
                  <div className="pt-6">
                    <Button
                      variant="highlight"
                      render={
                        <a
                          href={GITHUB_REPO_URL}
                          target="_blank"
                          rel="noopener noreferrer"
                        />
                      }
                      className="h-auto w-full rounded-[2rem] px-5 py-5 sm:px-6 sm:py-6"
                    >
                      <span className="flex w-full items-center justify-between gap-4">
                        <span className="flex min-w-0 items-center gap-4">
                          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-background/70 shadow-sm">
                            <Star className="size-5 fill-current text-amber-500" />
                          </span>
                          <span className="flex min-w-0 flex-col items-start gap-0.5 text-left">
                            <span className="truncate text-base font-semibold sm:text-lg">
                              Star Cabinet on GitHub
                            </span>
                            <span className="text-sm text-amber-950/70 sm:text-[0.95rem]">
                              Help more people find the community
                            </span>
                          </span>
                        </span>
                        <span className="hidden shrink-0 rounded-full bg-amber-950/10 px-3 py-1 text-sm font-semibold text-amber-950 sm:inline-flex">
                          {starsLabel}
                        </span>
                      </span>
                    </Button>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-2">
                <Button
                  variant="ghost"
                  onClick={() => setStep(step - 1)}
                >
                  <ArrowLeft data-icon="inline-start" />
                  Back
                </Button>
                {step < COMMUNITY_END_STEP ? (
                  <Button
                    onClick={() => setStep(step + 1)}
                    disabled={launching}
                    className="h-10 px-5"
                  >
                    {communityStep.nextLabel}
                    <ArrowRight data-icon="inline-end" />
                  </Button>
                ) : (
                  <Button
                    onClick={launch}
                    disabled={launchDisabled}
                    className="h-10 px-6"
                  >
                    {launching ? (
                      <>
                        <Loader2 className="animate-spin" data-icon="inline-start" />
                        Setting up...
                      </>
                    ) : (
                      <>
                        <Rocket data-icon="inline-start" />
                        Set up team
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
