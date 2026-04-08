"use client";

import { type CSSProperties, type ReactNode, useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  Cloud,
  Check,
  ExternalLink,
  Loader2,
  Rocket,
  Bot,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  Sparkles,
  Star,
  Terminal,
  XCircle,
  Zap,
} from "lucide-react";
import type { ProviderInfo } from "@/types/agents";

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
const COMMUNITY_START_STEP = 5;
const COMMUNITY_END_STEP = 7;
const STEP_COUNT = 8;

/* ─── Colors from runcabinet.com ─── */
const WEB = {
  bg: "#FAF6F1",
  bgWarm: "#F3EDE4",
  bgCard: "#FFFFFF",
  text: "#3B2F2F",
  textSecondary: "#6B5B4F",
  textTertiary: "#A89888",
  accent: "#8B5E3C",
  accentWarm: "#7A4F30",
  accentBg: "#F5E6D3",
  border: "#E8DDD0",
  borderLight: "#F0E8DD",
  borderDark: "#D4C4B0",
} as const;

function DiscordIcon({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
      style={style}
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
        className="flex size-10 items-center justify-center rounded-xl border"
        style={{
          borderColor: WEB.borderLight,
          background: WEB.accentBg,
          color: WEB.accent,
        }}
      >
        {card.icon}
      </div>

      <div className="mt-4 flex flex-col gap-1">
        <p className="text-sm font-semibold" style={{ color: WEB.text }}>
          {card.title}
        </p>
        <p className="text-sm leading-relaxed" style={{ color: WEB.textSecondary }}>
          {card.description}
        </p>
      </div>
    </>
  );

  if (!card.href) {
    return (
      <div
        className="rounded-xl p-4"
        style={{
          border: `1px solid ${WEB.border}`,
          background: WEB.bgCard,
        }}
      >
        {content}
      </div>
    );
  }

  return (
    <a
      href={card.href}
      target="_blank"
      rel="noopener noreferrer"
      className="group rounded-xl p-4 transition-all hover:-translate-y-0.5"
      style={{
        border: `1px solid ${WEB.border}`,
        background: WEB.bgCard,
      }}
    >
      {content}
      <div
        className="mt-4 inline-flex items-center gap-1 text-sm font-medium"
        style={{ color: WEB.accent }}
      >
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

  if (agents.length === 2) {
    agents.push({ slug: "content-marketer", name: "Content Marketer", emoji: "\u{1F4E3}", role: "Blog, social media, newsletters", checked: true });
  }

  return agents;
}

/* ─── Dot-grid background (from runcabinet.com) ─── */
const dotGridStyle: React.CSSProperties = {
  backgroundImage: `radial-gradient(circle, ${WEB.borderDark} 0.5px, transparent 0.5px)`,
  backgroundSize: "32px 32px",
};

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
  const [providersLoading, setProvidersLoading] = useState(true);
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [expandedProvider, setExpandedProvider] = useState<string | null>(null);
  const anyProviderReady = providers.some((p) => p.available && p.authenticated);

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

  const checkProvider = useCallback(async () => {
    setProvidersLoading(true);
    try {
      const res = await fetch("/api/agents/providers");
      if (!res.ok) throw new Error("Failed to check providers");
      const data = await res.json();
      const cliProviders: ProviderInfo[] = (data.providers ?? []).filter(
        (p: ProviderInfo) => p.type === "cli"
      );
      setProviders(cliProviders);
    } catch {
      setProviders([]);
    } finally {
      setProvidersLoading(false);
    }
  }, []);

  useEffect(() => {
    if (step === 4) {
      void checkProvider();
    }
  }, [step, checkProvider]);

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
          iconClassName: "",
        },
        {
          title: "Why people stay",
          description:
            "Early features, fast answers, behind-the-scenes progress, and the occasional delightful chaos of building in public.",
          cta: "",
          icon: <Sparkles className="size-4" />,
          iconClassName: "",
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
          iconClassName: "",
        },
        {
          title: "Why people want it",
          description:
            "Less setup, easier sharing, faster onboarding for teams, and a much lower chance of explaining terminal tabs before lunch.",
          cta: "",
          icon: <Rocket className="size-4" />,
          iconClassName: "",
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

  /* ─── Shared inline styles (website tokens) ─── */
  const inputStyle: React.CSSProperties = {
    background: WEB.bgCard,
    border: `1px solid ${WEB.border}`,
    color: WEB.text,
    borderRadius: 12,
    height: 44,
    fontSize: 15,
    padding: "0 14px",
    outline: "none",
    width: "100%",
    fontFamily: "inherit",
  };

  return (
    <div className="min-h-screen" style={{ background: WEB.bg, color: WEB.text }}>
      <div
        className="mx-auto flex min-h-screen w-full max-w-3xl items-center justify-center px-6 py-10"
        style={dotGridStyle}
      >
        <div className="w-full">
          {/* Progress indicator */}
          <div className="mb-10 flex items-center justify-center gap-2">
            {Array.from({ length: STEP_COUNT }, (_, i) => i).map((i) => (
              <div
                key={i}
                className="rounded-full transition-all duration-300"
                style={{
                  height: 8,
                  width: i <= step ? 40 : 24,
                  background: i <= step ? WEB.accent : WEB.borderLight,
                }}
              />
            ))}
          </div>

          {/* Step 0: Welcome — Dictionary card + tagline side-by-side */}
          {step === 0 && (
            <div className="mx-auto flex max-w-4xl flex-col items-center gap-8 animate-in fade-in duration-300">
              <div className="flex flex-col lg:flex-row lg:items-center lg:gap-10 w-full">
                {/* Dictionary Definition Card (compact) */}
                <div
                  className="text-left rounded-2xl px-8 py-8 md:px-10 md:py-10 flex-1"
                  style={{
                    background: WEB.bgCard,
                    border: `1px solid ${WEB.border}`,
                    boxShadow: "0 1px 3px rgba(59, 47, 47, 0.04), 0 8px 30px rgba(59, 47, 47, 0.04)",
                  }}
                >
                  <div className="flex items-baseline gap-3 mb-1">
                    <h1
                      className="font-logo text-4xl sm:text-5xl tracking-tight italic"
                      style={{ color: WEB.text }}
                    >
                      cabinet
                    </h1>
                    <span className="font-mono text-xs" style={{ color: WEB.textTertiary }}>
                      /&#x2C8;kab.&#x26A;.n&#x259;t/
                    </span>
                  </div>
                  <p className="font-mono text-xs italic mb-6" style={{ color: WEB.textTertiary }}>
                    noun
                  </p>

                  <ol className="font-body-serif space-y-5 text-[15px] leading-relaxed">
                    <li className="flex gap-3">
                      <span className="font-logo italic text-lg mt-[-2px] shrink-0" style={{ color: WEB.accent }}>1.</span>
                      <div>
                        <p style={{ color: WEB.textSecondary }}>
                          A cupboard with shelves or drawers for storing or displaying items.
                        </p>
                        <p className="font-mono text-xs italic mt-1.5" style={{ color: WEB.textTertiary }}>
                          &ldquo;a filing cabinet&rdquo;
                        </p>
                      </div>
                    </li>
                    <li className="flex gap-3">
                      <span className="font-logo italic text-lg mt-[-2px] shrink-0" style={{ color: WEB.accent }}>2.</span>
                      <div>
                        <p style={{ color: WEB.textSecondary }}>
                          <span
                            className="font-mono text-[11px] uppercase tracking-wider mr-1.5 px-1.5 py-0.5 rounded"
                            style={{ color: WEB.textTertiary, background: "#F5F0EB" }}
                          >
                            politics
                          </span>
                          The committee of senior ministers responsible for controlling government policy.
                        </p>
                        <p className="font-mono text-xs italic mt-1.5" style={{ color: WEB.textTertiary }}>
                          &ldquo;a cabinet meeting&rdquo;
                        </p>
                      </div>
                    </li>
                    <li className="flex gap-3">
                      <span className="font-logo italic text-lg mt-[-2px] shrink-0" style={{ color: WEB.accent }}>3.</span>
                      <div>
                        <p style={{ color: WEB.text }}>
                          <span
                            className="font-mono text-[11px] uppercase tracking-wider mr-1.5 px-1.5 py-0.5 rounded"
                            style={{ color: WEB.accent, background: WEB.accentBg }}
                          >
                            software
                          </span>
                          An AI-first knowledge base where files live on disk and a team of AI agents helps you execute.
                        </p>
                        <p className="font-mono text-xs italic mt-1.5" style={{ color: WEB.textTertiary }}>
                          &ldquo;I asked my cabinet to research the market and draft the blog post&rdquo;
                        </p>
                      </div>
                    </li>
                  </ol>

                </div>

                {/* Tagline + CTA */}
                <div className="flex flex-col items-center lg:items-start gap-6 py-6 lg:py-0 lg:max-w-xs shrink-0">
                  <h2 className="text-center lg:text-left text-3xl sm:text-4xl lg:text-5xl tracking-tight leading-[1.1]">
                    <span className="font-logo italic" style={{ color: WEB.text }}>
                      Your knowledge base.
                    </span>
                    <br />
                    <span
                      className="font-logo italic"
                      style={{
                        background: "linear-gradient(135deg, #3B2F2F 0%, #8B5E3C 50%, #A0714D 100%)",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                        backgroundClip: "text",
                      }}
                    >
                      Your AI team.
                    </span>
                  </h2>

                  <button
                    onClick={() => setStep(1)}
                    className="inline-flex items-center justify-center gap-2.5 rounded-full px-10 py-4 text-base font-medium text-white transition-all hover:-translate-y-0.5 shadow-sm w-full lg:w-auto"
                    style={{ background: WEB.accent }}
                  >
                    Get started
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Step 1: Questions 1-3 */}
          {step === 1 && (
            <div className="mx-auto flex max-w-xl flex-col gap-8 animate-in fade-in duration-300">
              <div className="text-center space-y-2">
                <h1 className="font-logo text-2xl tracking-tight italic">
                  Tell me about your project
                </h1>
              </div>

              <div
                className="rounded-2xl p-6 space-y-5"
                style={{
                  background: WEB.bgCard,
                  border: `1px solid ${WEB.border}`,
                  boxShadow: "0 1px 3px rgba(59, 47, 47, 0.04), 0 8px 30px rgba(59, 47, 47, 0.04)",
                }}
              >
                <div className="space-y-2">
                  <label className="text-sm font-medium" style={{ color: WEB.text }}>
                    What&apos;s your company or project name?
                  </label>
                  <input
                    value={answers.companyName}
                    onChange={(e) =>
                      setAnswers({ ...answers, companyName: e.target.value })
                    }
                    placeholder="Acme Corp"
                    style={inputStyle}
                    autoFocus
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium" style={{ color: WEB.text }}>
                    What do you do?
                  </label>
                  <input
                    value={answers.description}
                    onChange={(e) =>
                      setAnswers({ ...answers, description: e.target.value })
                    }
                    placeholder="We make a podcast about AI startups"
                    style={inputStyle}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium" style={{ color: WEB.text }}>
                    What are your top 3 goals right now?
                  </label>
                  <input
                    value={answers.goals}
                    onChange={(e) =>
                      setAnswers({ ...answers, goals: e.target.value })
                    }
                    placeholder="Grow newsletter to 1k subs, launch blog, get first 10 customers"
                    style={inputStyle}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={() => setStep(0)}
                  className="inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-medium transition-colors"
                  style={{ color: WEB.textSecondary }}
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back
                </button>
                <button
                  onClick={() => setStep(2)}
                  disabled={!answers.companyName.trim()}
                  className="inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-medium text-white transition-all hover:-translate-y-0.5 disabled:opacity-40 disabled:hover:translate-y-0"
                  style={{ background: WEB.accent }}
                >
                  Next
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Questions 4-5 */}
          {step === 2 && (
            <div className="mx-auto flex max-w-xl flex-col gap-8 animate-in fade-in duration-300">
              <div className="text-center space-y-2">
                <h1 className="font-logo text-2xl tracking-tight italic">
                  Almost there
                </h1>
              </div>

              <div
                className="rounded-2xl p-6 space-y-5"
                style={{
                  background: WEB.bgCard,
                  border: `1px solid ${WEB.border}`,
                  boxShadow: "0 1px 3px rgba(59, 47, 47, 0.04), 0 8px 30px rgba(59, 47, 47, 0.04)",
                }}
              >
                <div className="space-y-2">
                  <label className="text-sm font-medium" style={{ color: WEB.text }}>
                    How big is your team?
                  </label>
                  <div className="flex gap-2">
                    {TEAM_SIZES.map((size) => (
                      <button
                        key={size}
                        onClick={() =>
                          setAnswers({ ...answers, teamSize: size })
                        }
                        className="flex-1 py-2.5 px-3 rounded-xl text-sm font-medium transition-all"
                        style={{
                          border: `1px solid ${answers.teamSize === size ? WEB.accent : WEB.border}`,
                          background: answers.teamSize === size ? WEB.accentBg : WEB.bgCard,
                          color: answers.teamSize === size ? WEB.accent : WEB.textSecondary,
                        }}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium" style={{ color: WEB.text }}>
                    What&apos;s your most immediate priority?
                  </label>
                  <input
                    value={answers.priority}
                    onChange={(e) =>
                      setAnswers({ ...answers, priority: e.target.value })
                    }
                    placeholder="Set up our content engine and start publishing weekly"
                    style={inputStyle}
                    autoFocus
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={() => setStep(1)}
                  className="inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-medium transition-colors"
                  style={{ color: WEB.textSecondary }}
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back
                </button>
                <button
                  onClick={goToTeamSuggestion}
                  className="inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-medium text-white transition-all hover:-translate-y-0.5"
                  style={{ background: WEB.accent }}
                >
                  Next
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Team Suggestion */}
          {step === 3 && (
            <div className="flex flex-col gap-8 animate-in fade-in duration-300">
              <div className="text-center space-y-2">
                <h1 className="font-logo text-2xl tracking-tight italic">
                  Your starter team
                </h1>
                <p className="text-sm leading-relaxed" style={{ color: WEB.textSecondary }}>
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
                    className="flex w-full items-center gap-3 rounded-xl p-4 text-left transition-all"
                    style={{
                      border: `1px solid ${agent.checked ? WEB.accent : WEB.border}`,
                      background: agent.checked ? WEB.accentBg : WEB.bgCard,
                    }}
                  >
                    <div
                      className="flex size-5 shrink-0 items-center justify-center rounded"
                      style={{
                        border: `1.5px solid ${agent.checked ? WEB.accent : WEB.borderDark}`,
                        background: agent.checked ? WEB.accent : "transparent",
                      }}
                    >
                      {agent.checked && (
                        <Check className="size-3 text-white" />
                      )}
                    </div>
                    <span className="text-xl">{agent.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium" style={{ color: WEB.text }}>
                        {agent.name}
                      </p>
                      <p className="text-[11px]" style={{ color: WEB.textSecondary }}>
                        {agent.role}
                      </p>
                    </div>
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={() => setStep(2)}
                  className="inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-medium transition-colors"
                  style={{ color: WEB.textSecondary }}
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back
                </button>
                <button
                  onClick={() => setStep(4)}
                  disabled={launchDisabled}
                  className="inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-medium text-white transition-all hover:-translate-y-0.5 disabled:opacity-40 disabled:hover:translate-y-0"
                  style={{ background: WEB.accent }}
                >
                  Next
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Step 4: AI Provider Check */}
          {step === 4 && (
            <div className="mx-auto flex max-w-xl flex-col gap-8 animate-in fade-in duration-300">
              <div className="text-center space-y-2">
                <h1 className="font-logo text-2xl tracking-tight italic">
                  Agent Provider
                </h1>
                <p className="text-sm leading-relaxed" style={{ color: WEB.textSecondary }}>
                  Cabinet uses AI agent providers to power your team.
                  Let&apos;s make sure yours is set up.
                </p>
              </div>

              {/* Registered CLI providers */}
              {providersLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="size-6 animate-spin" style={{ color: WEB.textTertiary }} />
                </div>
              ) : (
                <div className="space-y-3">
                  {providers.map((p) => {
                    const isReady = !!(p.available && p.authenticated);
                    const isExpanded = expandedProvider === p.id;
                    const ProviderIcon = p.icon === "sparkles" ? Sparkles : p.icon === "bot" ? Bot : Terminal;
                    return (
                      <div
                        key={p.id}
                        className="rounded-2xl p-6 space-y-4"
                        style={{
                          background: WEB.bgCard,
                          border: `1px solid ${isReady ? WEB.accent : WEB.border}`,
                          boxShadow: "0 1px 3px rgba(59, 47, 47, 0.04), 0 8px 30px rgba(59, 47, 47, 0.04)",
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="flex size-10 items-center justify-center rounded-xl"
                            style={{ background: WEB.accentBg, color: WEB.accent }}
                          >
                            <ProviderIcon className="size-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold" style={{ color: WEB.text }}>
                              {p.name}
                            </p>
                            <p className="text-xs" style={{ color: isReady ? "#16a34a" : WEB.textTertiary }}>
                              {isReady ? "Installed and ready" : "Not found"}
                            </p>
                          </div>
                          {isReady ? (
                            <CheckCircle2 className="size-5" style={{ color: "#16a34a" }} />
                          ) : (
                            <button
                              onClick={() => setExpandedProvider(isExpanded ? null : p.id)}
                              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors"
                              style={{ background: WEB.accentBg, border: `1px solid ${WEB.border}`, color: WEB.accent }}
                            >
                              Install instructions
                              {isExpanded ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
                            </button>
                          )}
                        </div>

                        {!isReady && isExpanded && (
                          <div className="space-y-3">
                            {p.installSteps && p.installSteps.length > 0 ? (
                              <div
                                className="rounded-xl p-4 space-y-3"
                                style={{ background: WEB.bgWarm, border: `1px solid ${WEB.borderLight}` }}
                              >
                                {p.installSteps.map((installStep, i) => (
                                  <div key={i} className="flex items-start gap-3">
                                    <span
                                      className="flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                                      style={{ background: WEB.accent, color: "white" }}
                                    >
                                      {i + 1}
                                    </span>
                                    <div>
                                      <p className="text-sm font-medium" style={{ color: WEB.text }}>
                                        {installStep.title}
                                      </p>
                                      <p className="text-xs mt-0.5" style={{ color: WEB.textSecondary }}>
                                        {installStep.detail}
                                      </p>
                                      {installStep.link && (
                                        <a
                                          href={installStep.link.url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="inline-flex items-center gap-1 text-xs font-medium mt-1"
                                          style={{ color: WEB.accent }}
                                        >
                                          {installStep.link.label}
                                          <ExternalLink className="size-3" />
                                        </a>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : p.installMessage ? (
                              <div
                                className="rounded-xl px-4 py-3 text-sm"
                                style={{ background: WEB.bgWarm, border: `1px solid ${WEB.borderLight}`, color: WEB.text }}
                              >
                                {p.installMessage}
                              </div>
                            ) : null}

                            <p className="text-xs" style={{ color: WEB.textTertiary }}>
                              After installing, click Re-check below. If the provider was installed while Cabinet was running, you may need to restart the app.
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  <button
                    onClick={checkProvider}
                    className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition-all hover:-translate-y-0.5"
                    style={{ background: WEB.accentBg, border: `1px solid ${WEB.border}`, color: WEB.accent }}
                  >
                    <RefreshCw className="size-3.5" />
                    Re-check providers
                  </button>
                </div>
              )}

              {/* Coming soon providers */}
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wider" style={{ color: WEB.textTertiary }}>
                  Coming soon
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {[
                    { name: "Gemini CLI", type: "CLI", icon: "terminal" },
                    { name: "Anthropic API", type: "API", icon: "api" },
                    { name: "OpenAI API", type: "API", icon: "api" },
                    { name: "Google AI API", type: "API", icon: "api" },
                  ].map((p) => (
                    <div
                      key={p.name}
                      className="flex items-center gap-3 rounded-xl px-4 py-3 opacity-50"
                      style={{
                        background: WEB.bgCard,
                        border: `1px solid ${WEB.borderLight}`,
                      }}
                    >
                      <div
                        className="flex size-8 items-center justify-center rounded-lg"
                        style={{ background: WEB.bgWarm, color: WEB.textTertiary }}
                      >
                        {p.icon === "terminal" ? (
                          <Terminal className="size-4" />
                        ) : (
                          <Zap className="size-4" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium" style={{ color: WEB.textSecondary }}>
                          {p.name}
                        </p>
                        <p className="text-[11px]" style={{ color: WEB.textTertiary }}>
                          {p.type} agent
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={() => setStep(3)}
                  className="inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-medium transition-colors"
                  style={{ color: WEB.textSecondary }}
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back
                </button>
                <button
                  onClick={() => setStep(COMMUNITY_START_STEP)}
                  className="inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-medium text-white transition-all hover:-translate-y-0.5"
                  style={{ background: WEB.accent }}
                >
                  {anyProviderReady ? "Next" : "Skip for now"}
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Steps 5-7: Community */}
          {communityStep && (
            <div className="relative mx-auto flex max-w-2xl flex-col gap-8 animate-in fade-in duration-300">
              {/* Floating emoji backdrop per community step */}
              {(() => {
                const emojiMap: Record<string, string> = {
                  "GitHub": "✨",
                  "Discord": "💬",
                  "Cabinet Cloud": "☁️",
                };
                const emoji = emojiMap[communityStep.eyebrow];
                if (!emoji) return null;
                return (
                  <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
                    {[
                      { top: "-5%", left: "-8%", duration: "34s", delay: "-8s", opacity: 0.45, reverse: false },
                      { top: "5%", left: "55%", duration: "42s", delay: "-17s", opacity: 0.4, reverse: true },
                      { top: "40%", left: "-5%", duration: "38s", delay: "-12s", opacity: 0.38, reverse: true },
                      { top: "50%", left: "60%", duration: "46s", delay: "-22s", opacity: 0.4, reverse: false },
                      { top: "75%", left: "20%", duration: "40s", delay: "-5s", opacity: 0.35, reverse: false },
                    ].map((cloud, i) => (
                      <div
                        key={i}
                        className={`waitlist-cloud-row absolute ${cloud.reverse ? "waitlist-cloud-row-reverse" : ""}`}
                        style={{
                          top: cloud.top,
                          left: cloud.left,
                          opacity: cloud.opacity,
                          ["--cloud-row-duration" as string]: cloud.duration,
                          animationDelay: cloud.delay,
                        }}
                      >
                        <span
                          className={`select-none leading-none ${
                            communityStep.eyebrow === "Cabinet Cloud"
                              ? "text-[280px] sm:text-[400px]"
                              : "text-[180px] sm:text-[260px]"
                          }`}
                          style={{ filter: "drop-shadow(0 18px 26px rgba(214,194,160,0.22))" }}
                        >
                          {emoji}
                        </span>
                      </div>
                    ))}
                  </div>
                );
              })()}
              <div
                className="relative z-10 rounded-2xl p-5 sm:p-6"
                style={{
                  border: `1px solid ${WEB.border}`,
                  background: communityStep.eyebrow === "Cabinet Cloud"
                    ? `linear-gradient(180deg, rgba(252,249,244,0.96), rgba(247,241,232,0.94))`
                    : WEB.bgCard,
                  boxShadow: "0 1px 3px rgba(59, 47, 47, 0.04), 0 8px 30px rgba(59, 47, 47, 0.04)",
                }}
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <h2
                        className="font-logo text-xl tracking-tight italic"
                        style={{ color: WEB.text }}
                      >
                        {communityStep.title}
                      </h2>
                      <p className="text-sm leading-relaxed" style={{ color: WEB.textSecondary }}>
                        {communityStep.description}
                      </p>
                      {communityStep.aside && (
                        <p className="text-sm leading-relaxed" style={{ color: WEB.textSecondary }}>
                          {communityStep.aside}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Big CTA buttons — same style across all community steps */}
                {isGitHubCommunityStep && (
                  <div className="pt-6">
                    <a
                      href={GITHUB_REPO_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex w-full items-center justify-between gap-4 rounded-full px-5 py-5 sm:px-6 sm:py-6 transition-all hover:-translate-y-0.5"
                      style={{ background: WEB.accentBg, border: `1px solid ${WEB.border}` }}
                    >
                      <span className="flex min-w-0 items-center gap-4">
                        <span className="flex size-11 shrink-0 items-center justify-center rounded-full shadow-sm" style={{ background: WEB.bgCard }}>
                          <Star className="size-5 fill-current" style={{ color: WEB.accent }} />
                        </span>
                        <span className="flex min-w-0 flex-col items-start gap-0.5 text-left">
                          <span className="truncate text-base font-semibold sm:text-lg" style={{ color: WEB.text }}>Star Cabinet on GitHub</span>
                          <span className="text-sm" style={{ color: WEB.textSecondary }}>Help more people find the community</span>
                        </span>
                      </span>
                      <span className="hidden shrink-0 rounded-full px-3 py-1 text-sm font-semibold sm:inline-flex" style={{ background: WEB.bgWarm, color: WEB.accent }}>
                        {starsLabel}
                      </span>
                    </a>
                  </div>
                )}

                {communityStep.eyebrow === "Discord" && (
                  <div className="pt-6">
                    <a
                      href={DISCORD_SUPPORT_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex w-full items-center justify-between gap-4 rounded-full px-5 py-5 sm:px-6 sm:py-6 transition-all hover:-translate-y-0.5"
                      style={{ background: "#ECEAFD", border: "1px solid #D8D4F7" }}
                    >
                      <span className="flex min-w-0 items-center gap-4">
                        <span className="flex size-11 shrink-0 items-center justify-center rounded-full shadow-sm" style={{ background: WEB.bgCard }}>
                          <DiscordIcon className="size-5" style={{ color: "#5865F2" }} />
                        </span>
                        <span className="flex min-w-0 flex-col items-start gap-0.5 text-left">
                          <span className="truncate text-base font-semibold sm:text-lg" style={{ color: WEB.text }}>Join the Discord</span>
                          <span className="text-sm" style={{ color: WEB.textSecondary }}>Chat with the people building Cabinet</span>
                        </span>
                      </span>
                      <span className="hidden shrink-0 rounded-full px-3 py-1 text-sm font-semibold sm:inline-flex" style={{ background: "#D8D4F7", color: "#5865F2" }}>
                        Join
                      </span>
                    </a>
                  </div>
                )}

                {communityStep.eyebrow === "Cabinet Cloud" && (
                  <div className="pt-6">
                    <a
                      href={CABINET_CLOUD_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex w-full items-center justify-between gap-4 rounded-full px-5 py-5 sm:px-6 sm:py-6 transition-all hover:-translate-y-0.5"
                      style={{ background: WEB.accentBg, border: `1px solid ${WEB.border}` }}
                    >
                      <span className="flex min-w-0 items-center gap-4">
                        <span className="flex size-11 shrink-0 items-center justify-center rounded-full shadow-sm" style={{ background: WEB.bgCard }}>
                          <Cloud className="size-5" style={{ color: WEB.accent }} />
                        </span>
                        <span className="flex min-w-0 flex-col items-start gap-0.5 text-left">
                          <span className="truncate text-base font-semibold sm:text-lg" style={{ color: WEB.text }}>Join the Cabinet Cloud waitlist</span>
                          <span className="text-sm" style={{ color: WEB.textSecondary }}>Get the hosted version when it&apos;s ready</span>
                        </span>
                      </span>
                      <span className="hidden shrink-0 rounded-full px-3 py-1 text-sm font-semibold sm:inline-flex" style={{ background: WEB.bgWarm, color: WEB.accent }}>
                        Waitlist
                      </span>
                    </a>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={() => setStep(step - 1)}
                  className="inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-medium transition-colors"
                  style={{ color: WEB.textSecondary }}
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back
                </button>
                {step < COMMUNITY_END_STEP ? (
                  <button
                    onClick={() => setStep(step + 1)}
                    disabled={launching}
                    className="inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-medium text-white transition-all hover:-translate-y-0.5"
                    style={{ background: WEB.accent }}
                  >
                    {communityStep.nextLabel}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    onClick={launch}
                    disabled={launchDisabled}
                    className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-medium text-white transition-all hover:-translate-y-0.5 disabled:opacity-40 disabled:hover:translate-y-0"
                    style={{ background: WEB.accent }}
                  >
                    {launching ? (
                      <>
                        <Loader2 className="animate-spin w-4 h-4" />
                        Setting up...
                      </>
                    ) : (
                      <>
                        <Rocket className="w-4 h-4" />
                        Set up team
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
