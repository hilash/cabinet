"use client";

import { type ReactNode, useCallback, useEffect, useState } from "react";
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
  Zap,
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

          {/* Step 0: Welcome */}
          {step === 0 && (
            <div className="mx-auto flex max-w-xl flex-col gap-8 animate-in fade-in duration-300">
              <div className="text-center space-y-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/cabinet-icon.png"
                  alt=""
                  className="mx-auto h-20 w-20 rounded-2xl drop-shadow-lg"
                />
                <h1
                  className="text-4xl tracking-tight italic"
                  style={{ fontFamily: "var(--font-logo), Georgia, serif", color: WEB.text }}
                >
                  cabinet
                </h1>
                <p
                  className="text-lg leading-relaxed"
                  style={{ color: WEB.textSecondary }}
                >
                  Let&apos;s set up your AI team. I&apos;ll ask a few questions
                  to get the right agents working for you.
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                <span
                  className="rounded-full px-3 py-1 text-xs font-mono uppercase tracking-widest"
                  style={{
                    border: `1px solid ${WEB.border}`,
                    background: WEB.bgCard,
                    color: WEB.accent,
                  }}
                >
                  <Zap className="inline w-3 h-3 mr-1 -mt-0.5" />
                  Build your starter team in minutes
                </span>
              </div>
              <div className="flex justify-center pt-2">
                <button
                  onClick={() => setStep(1)}
                  className="inline-flex items-center gap-2 rounded-full px-8 py-3.5 text-sm font-medium text-white transition-all hover:-translate-y-0.5"
                  style={{ background: WEB.accent }}
                >
                  Let&apos;s go
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Step 1: Questions 1-3 */}
          {step === 1 && (
            <div className="mx-auto flex max-w-xl flex-col gap-8 animate-in fade-in duration-300">
              <div className="text-center space-y-2">
                <h1
                  className="text-2xl tracking-tight italic"
                  style={{ fontFamily: "var(--font-logo), Georgia, serif" }}
                >
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
                <h1
                  className="text-2xl tracking-tight italic"
                  style={{ fontFamily: "var(--font-logo), Georgia, serif" }}
                >
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
                <h1
                  className="text-2xl tracking-tight italic"
                  style={{ fontFamily: "var(--font-logo), Georgia, serif" }}
                >
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
                  onClick={() => setStep(COMMUNITY_START_STEP)}
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

          {/* Steps 4-6: Community */}
          {communityStep && (
            <div className="mx-auto flex max-w-2xl flex-col gap-8 animate-in fade-in duration-300">
              <div
                className="rounded-2xl p-5 sm:p-6"
                style={{
                  border: `1px solid ${WEB.border}`,
                  background: WEB.bgCard,
                  boxShadow: "0 1px 3px rgba(59, 47, 47, 0.04), 0 8px 30px rgba(59, 47, 47, 0.04)",
                }}
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-3">
                    <div
                      className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-mono uppercase tracking-[0.18em]"
                      style={{
                        border: `1px solid ${WEB.border}`,
                        background: WEB.bg,
                        color: WEB.accent,
                      }}
                    >
                      <Sparkles className="size-3.5" style={{ color: WEB.accent }} />
                      {communityStep.eyebrow}
                    </div>
                    <div className="space-y-2">
                      <h2
                        className="text-xl tracking-tight italic"
                        style={{ fontFamily: "var(--font-logo), Georgia, serif", color: WEB.text }}
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

                {communityStep.cards.length > 0 && (
                  <>
                    <div className="my-5" style={{ borderTop: `1px solid ${WEB.borderLight}` }} />

                    <div className="grid gap-3 md:grid-cols-2">
                      {communityStep.cards.map((card) => (
                        <CommunityCardTile key={card.title} card={card} />
                      ))}
                    </div>
                  </>
                )}

                {isGitHubCommunityStep && (
                  <div className="pt-6">
                    <a
                      href={GITHUB_REPO_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex w-full items-center justify-between gap-4 rounded-full px-5 py-5 sm:px-6 sm:py-6 transition-all hover:-translate-y-0.5"
                      style={{
                        background: WEB.accentBg,
                        border: `1px solid ${WEB.border}`,
                      }}
                    >
                      <span className="flex min-w-0 items-center gap-4">
                        <span
                          className="flex size-11 shrink-0 items-center justify-center rounded-full shadow-sm"
                          style={{ background: WEB.bgCard }}
                        >
                          <Star className="size-5 fill-current" style={{ color: WEB.accent }} />
                        </span>
                        <span className="flex min-w-0 flex-col items-start gap-0.5 text-left">
                          <span className="truncate text-base font-semibold sm:text-lg" style={{ color: WEB.text }}>
                            Star Cabinet on GitHub
                          </span>
                          <span className="text-sm" style={{ color: WEB.textSecondary }}>
                            Help more people find the community
                          </span>
                        </span>
                      </span>
                      <span
                        className="hidden shrink-0 rounded-full px-3 py-1 text-sm font-semibold sm:inline-flex"
                        style={{
                          background: WEB.bgWarm,
                          color: WEB.accent,
                        }}
                      >
                        {starsLabel}
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
