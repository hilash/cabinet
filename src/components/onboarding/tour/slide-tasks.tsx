"use client";

import { ArrowRight, Music, AtSign } from "lucide-react";
import { MockupSidebar } from "./mockup-sidebar";
import { TOUR_PALETTE as P } from "./palette";
import { useLocale } from "@/i18n/use-locale";

const SONG_TITLES = [
  "Neon Dreams",
  "Paper Moons",
  "Cassette",
  "Slow Burn",
  "Overgrown",
  "Salt & Smoke",
  "Late Bloom",
  "Low Tide",
  "Signal Lost",
  "Halfway Home",
];

const TYPED_COMMAND = "Run 10 tasks, each writing a song, save to @Songs/";

export function SlideTasks() {
  const { t } = useLocale();
  return (
    <div className="grid h-full grid-cols-[minmax(360px,420px)_1fr] gap-10 lg:gap-14 items-center">
      <div className="h-[440px] w-full">
        <MockupSidebar activeTab="tasks" viewTransitionName="cabinet-card">
          <div className="flex h-full flex-col gap-2 px-2 py-2">
            {/* Composer */}
            <div
              className="opacity-0 rounded-lg px-2.5 py-2"
              style={{
                background: P.bgCard,
                border: `1px solid ${P.border}`,
                boxShadow: "0 1px 2px rgba(59,47,47,0.06)",
                animation: "cabinet-tour-fade-up 0.4s ease-out forwards",
                animationDelay: "200ms",
              }}
            >
              <div className="flex items-center gap-1.5">
                <div className="flex-1 overflow-hidden">
                  <div
                    className="relative whitespace-nowrap text-[13px] overflow-hidden"
                    style={{
                      color: P.text,
                      animation: "cabinet-tour-typing 1.6s steps(40, end) forwards",
                      animationDelay: "600ms",
                      width: 0,
                    }}
                  >
                    {TYPED_COMMAND.split(/(@\w+\/?)/).map((part, i) =>
                      part.startsWith("@") ? (
                        <span
                          key={i}
                          className="font-mono font-semibold"
                          style={{ color: P.accent }}
                        >
                          {part}
                        </span>
                      ) : (
                        <span key={i}>{part}</span>
                      ),
                    )}
                    <span
                      className="ml-0.5 inline-block h-3 w-[1.5px] translate-y-[2px]"
                      style={{
                        background: P.text,
                        animation: "cabinet-tour-caret-blink 0.9s step-end infinite",
                      }}
                    />
                  </div>
                </div>
                <div
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full opacity-0"
                  style={{
                    background: P.accentBg,
                    color: P.accent,
                    animation: "cabinet-tour-pop-in 0.3s ease-out forwards",
                    animationDelay: "2300ms",
                  }}
                >
                  <ArrowRight className="h-3 w-3" />
                </div>
              </div>
            </div>

            {/* Fan-out grid */}
            <div className="grid flex-1 grid-cols-2 gap-1.5 overflow-hidden">
              {SONG_TITLES.map((title, i) => (
                <div
                  key={title}
                  className="opacity-0 flex flex-col gap-1 rounded-md px-1.5 py-1.5"
                  style={{
                    background: P.bgCard,
                    border: `1px solid ${P.border}`,
                    animation: "cabinet-tour-pop-in 0.35s ease-out forwards",
                    animationDelay: `${2500 + i * 60}ms`,
                  }}
                >
                  <div className="flex items-center gap-1">
                    <Music
                      className="h-2.5 w-2.5 shrink-0"
                      style={{ color: "#D08BA6" }}
                    />
                    <span
                      className="truncate text-[9px] font-medium"
                      style={{ color: P.text }}
                    >
                      {title}
                    </span>
                    <span className="ml-auto relative flex h-1 w-1 shrink-0">
                      <span
                        className="absolute inline-flex h-full w-full rounded-full"
                        style={{
                          background: "#5A9E7B",
                          animation:
                            "cabinet-tour-heartbeat-dot 1.2s ease-in-out infinite",
                          animationDelay: `${i * 80}ms`,
                        }}
                      />
                      <span
                        className="relative inline-flex h-1 w-1 rounded-full"
                        style={{ background: "#4A8E6B" }}
                      />
                    </span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span
                      className="h-0.5 rounded-full"
                      style={{
                        background: "rgba(59,47,47,0.18)",
                        animation: "cabinet-tour-stream-bar 1.4s ease-out forwards",
                        animationDelay: `${2900 + i * 80}ms`,
                        width: 0,
                      }}
                    />
                    <span
                      className="h-0.5 rounded-full"
                      style={{
                        background: "rgba(59,47,47,0.12)",
                        animation: "cabinet-tour-stream-bar 1.6s ease-out forwards",
                        animationDelay: `${3100 + i * 80}ms`,
                        width: 0,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Footer destination pill */}
            <div
              className="opacity-0 flex items-center justify-center gap-1 rounded-full py-1 text-[9px]"
              style={{
                color: P.textSecondary,
                background: P.paperWarm,
                border: `1px solid ${P.borderLight}`,
                animation: "cabinet-tour-fade-up 0.4s ease-out forwards",
                animationDelay: "3800ms",
              }}
            >
              <AtSign className="h-2.5 w-2.5" style={{ color: P.accent }} />
              <span>Saving to </span>
              <span className="font-mono font-semibold" style={{ color: P.text }}>
                Songs/
              </span>
            </div>
          </div>
        </MockupSidebar>
      </div>

      {/* Copy */}
      <div className="flex flex-col gap-5 max-w-lg">
        <span
          className="inline-block w-fit rounded-full px-3 py-1 text-[10px] font-semibold tracking-[0.18em] opacity-0"
          style={{
            color: P.accent,
            background: P.accentBg,
            border: `1px solid ${P.borderDark}`,
            animation: "cabinet-tour-fade-up 0.4s ease-out forwards",
            animationDelay: "60ms",
          }}
        >
          03 &middot; TASKS
        </span>
        <h2
          className="font-logo text-4xl italic tracking-tight opacity-0 lg:text-5xl"
          style={{
            color: P.text,
            animation: "cabinet-tour-fade-up 0.5s ease-out forwards",
            animationDelay: "180ms",
          }}
        >
          Ready to <span style={{ color: P.accent }}>start</span>?
        </h2>
        <p
          className="font-body-serif text-base leading-relaxed opacity-0 lg:text-lg"
          style={{
            color: P.textSecondary,
            animation: "cabinet-tour-fade-up 0.5s ease-out forwards",
            animationDelay: "320ms",
          }}
        >
          Write a task. Run one, run ten, schedule them forever.
          Mention pages with{" "}
          <span className="font-mono" style={{ color: P.accent }}>@</span>,
          save output wherever you want. You&apos;re the director now.
        </p>
      </div>
    </div>
  );
}
