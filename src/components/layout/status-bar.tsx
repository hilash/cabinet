"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { GitBranch, RefreshCw, Check, CloudDownload, Star, X, ArrowRight } from "lucide-react";
import { useCabinetUpdate } from "@/hooks/use-cabinet-update";
import { useEditorStore } from "@/stores/editor-store";
import { useTreeStore } from "@/stores/tree-store";
import { useAppStore } from "@/stores/app-store";
import { useAIPanelStore } from "@/stores/ai-panel-store";

const DISCORD_SUPPORT_URL = "https://discord.gg/hJa5TRTbTH";
const GITHUB_REPO_URL = "https://github.com/hilash/cabinet";
const GITHUB_STATS_URL = "/api/github/repo";
const GITHUB_STARS_FALLBACK = 244;

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

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M12 .5a12 12 0 0 0-3.8 23.38c.6.11.82-.26.82-.58v-2.24c-3.34.73-4.04-1.42-4.04-1.42-.55-1.37-1.33-1.73-1.33-1.73-1.08-.74.08-.72.08-.72 1.2.08 1.83 1.22 1.83 1.22 1.06 1.8 2.8 1.28 3.48.98.11-.77.42-1.28.76-1.58-2.67-.3-5.47-1.32-5.47-5.86 0-1.3.47-2.36 1.23-3.2-.12-.3-.53-1.52.12-3.16 0 0 1-.32 3.3 1.22a11.67 11.67 0 0 1 6.02 0c2.3-1.54 3.3-1.22 3.3-1.22.65 1.64.24 2.86.12 3.16.77.84 1.23 1.9 1.23 3.2 0 4.55-2.8 5.56-5.48 5.86.43.37.81 1.08.81 2.19v3.25c0 .32.22.7.83.58A12 12 0 0 0 12 .5Z" />
    </svg>
  );
}

function formatGithubStars(stars: number) {
  return new Intl.NumberFormat("en-US").format(stars);
}

/* ── Star burst explosion particles ── */
const BURST_ANGLES = [0, 45, 90, 135, 180, 225, 270, 315];

function StarExplosion() {
  return (
    <span className="pointer-events-none absolute inset-0" aria-hidden="true">
      {BURST_ANGLES.map((angle, i) => {
        const rad = (angle * Math.PI) / 180;
        const dist = i % 2 === 0 ? 18 : 14;
        const tx = Math.round(Math.cos(rad) * dist);
        const ty = Math.round(Math.sin(rad) * dist);
        return (
          <span
            key={angle}
            className="absolute left-1/2 top-1/2 text-[7px] leading-none text-amber-400"
            style={{
              "--sb-x": `${tx}px`,
              "--sb-y": `${ty}px`,
              animation: "cabinet-star-burst 0.65s ease-out forwards",
              animationDelay: `${i * 25}ms`,
            } as React.CSSProperties}
          >
            ✦
          </span>
        );
      })}
    </span>
  );
}

export function StatusBar() {
  const { saveStatus, currentPath } = useEditorStore();
  const loadTree = useTreeStore((s) => s.loadTree);
  const selectedPath = useTreeStore((s) => s.selectedPath);
  const section = useAppStore((s) => s.section);
  const setSection = useAppStore((s) => s.setSection);
  const setAiPanelCollapsed = useAppStore((s) => s.setAiPanelCollapsed);
  const { open, addEditorSession } = useAIPanelStore();
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiSubmitting, setAiSubmitting] = useState(false);

  const showAIPill = section.type === "page" && !!selectedPath;

  const handleAISubmit = async () => {
    if (!aiPrompt.trim() || !selectedPath || aiSubmitting) return;
    const message = aiPrompt.trim();
    setAiPrompt("");
    setAiSubmitting(true);
    setAiPanelCollapsed(false);
    open();
    try {
      const response = await fetch("/api/agents/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "editor",
          pagePath: selectedPath,
          userMessage: message,
          mentionedPaths: [],
        }),
      });
      if (response.ok) {
        const data = await response.json();
        const conversation = data.conversation as { id: string; title: string };
        addEditorSession({
          id: conversation.id,
          sessionId: conversation.id,
          pagePath: selectedPath,
          userMessage: message,
          prompt: conversation.title,
          timestamp: Date.now(),
          status: "running",
          reconnect: true,
        });
      }
    } finally {
      setAiSubmitting(false);
    }
  };
  const [uncommitted, setUncommitted] = useState(0);
  const [pullStatus, setPullStatus] = useState<"idle" | "pulling" | "pulled" | "up-to-date" | "error">("idle");
  const [pulling, setPulling] = useState(false);
  const [githubStars, setGithubStars] = useState(GITHUB_STARS_FALLBACK);
  const [displayStars, setDisplayStars] = useState(0);
  const [starsExploding, setStarsExploding] = useState(false);
  const starsAnimRef = useRef<number | null>(null);
  const starsAnimated = useRef(false);
  const didAutoPullRef = useRef(false);
  const [appAlive, setAppAlive] = useState(true);
  const [daemonAlive, setDaemonAlive] = useState(true);
  const [installKind, setInstallKind] = useState<"source-managed" | "source-custom" | "electron-macos" | "electron-windows">("source-custom");
  const [showServerPopup, setShowServerPopup] = useState(false);
  const [providerStatuses, setProviderStatuses] = useState<
    { id: string; name: string; available: boolean; authenticated: boolean }[]
  >([]);
  const [providersLoaded, setProvidersLoaded] = useState(false);
  const { update } = useCabinetUpdate();

  const anyProviderReady = useMemo(
    () => !providersLoaded || providerStatuses.some((p) => p.available && p.authenticated),
    [providersLoaded, providerStatuses],
  );
  const isElectronInstall = installKind === "electron-macos" || installKind === "electron-windows";

  const fetchProviderStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/agents/providers/status", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.providers)) {
        setProviderStatuses(data.providers);
        setProvidersLoaded(true);
      }
    } catch { /* ignore */ }
  }, []);

  // Poll both server health endpoints
  useEffect(() => {
    let mounted = true;
    const checkHealth = async () => {
      const [appRes, daemonRes] = await Promise.allSettled([
        fetch("/api/health", { cache: "no-store" }),
        fetch("/api/health/daemon", { cache: "no-store" }),
      ]);
      if (!mounted) return;
      const appOk = appRes.status === "fulfilled" && appRes.value.ok;
      setAppAlive(appOk);
      setDaemonAlive(daemonRes.status === "fulfilled" && daemonRes.value.ok);
      if (appOk && appRes.status === "fulfilled") {
        try {
          const data = await appRes.value.json();
          if (data.installKind) setInstallKind(data.installKind);
        } catch { /* ignore */ }
      }
    };
    void checkHealth();
    const interval = setInterval(checkHealth, 10000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  // Fetch provider status once on mount
  useEffect(() => {
    void fetchProviderStatus();
  }, [fetchProviderStatus]);

  const fetchGitStatus = async () => {
    try {
      const res = await fetch("/api/git/commit");
      if (res.ok) {
        const data = await res.json();
        setUncommitted(data.uncommitted || 0);
      }
    } catch {
      // ignore
    }
  };

  const fetchGitHubStats = useCallback(async (signal?: AbortSignal) => {
    try {
      const res = await fetch(GITHUB_STATS_URL, {
        signal,
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
  }, []);

  const pullAndRefresh = useCallback(async () => {
    if (pulling) return;
    setPulling(true);
    setPullStatus("pulling");
    try {
      const res = await fetch("/api/git/pull", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        if (data.pulled) {
          setPullStatus("pulled");
          // Reload tree to reflect new/changed files
          await loadTree();
        } else {
          setPullStatus("up-to-date");
        }
      } else {
        setPullStatus("error");
      }
    } catch {
      setPullStatus("error");
    } finally {
      setPulling(false);
      // Reset status after 3 seconds
      setTimeout(() => setPullStatus("idle"), 3000);
    }
  }, [pulling, loadTree]);

  // Auto-pull on mount (page load)
  useEffect(() => {
    if (didAutoPullRef.current) return;
    didAutoPullRef.current = true;

    const initialPull = window.setTimeout(() => {
      void pullAndRefresh();
    }, 0);
    return () => window.clearTimeout(initialPull);
  }, [pullAndRefresh]);

  // Poll git status
  useEffect(() => {
    const initialFetch = window.setTimeout(() => {
      void fetchGitStatus();
    }, 0);
    const interval = setInterval(fetchGitStatus, 15000);
    return () => {
      window.clearTimeout(initialFetch);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const initialFetch = window.setTimeout(() => {
      void fetchGitHubStats(controller.signal);
    }, 0);
    const handleFocus = () => {
      void fetchGitHubStats();
    };

    window.addEventListener("focus", handleFocus);
    return () => {
      controller.abort();
      window.clearTimeout(initialFetch);
      window.removeEventListener("focus", handleFocus);
    };
  }, [fetchGitHubStats]);

  // Animate stars counter from 0 → real value once real data arrives
  useEffect(() => {
    if (githubStars === GITHUB_STARS_FALLBACK) return;
    if (starsAnimated.current) return;
    starsAnimated.current = true;
    const target = githubStars;
    const duration = 2000;
    const startTime = performance.now();
    const tick = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayStars(Math.round(target * eased));
      if (progress < 1) {
        starsAnimRef.current = requestAnimationFrame(tick);
      } else {
        setDisplayStars(target);
        setStarsExploding(true);
        setTimeout(() => setStarsExploding(false), 900);
      }
    };
    starsAnimRef.current = requestAnimationFrame(tick);
    return () => {
      if (starsAnimRef.current !== null) cancelAnimationFrame(starsAnimRef.current);
    };
  }, [githubStars]);

  return (
    <div className="relative flex items-center justify-between px-3 py-1 border-t border-border text-[11px] text-muted-foreground/60 bg-background">
      {/* Center: AI edit pill */}
      {showAIPill && (
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center pointer-events-auto">
          <div className="flex items-center rounded-full border border-border/50 bg-muted/30 px-2.5 py-0.5 gap-1.5 focus-within:border-border/80 focus-within:bg-muted/60 transition-colors w-56">
            <input
              type="text"
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void handleAISubmit();
                }
              }}
              placeholder="How to edit this page?"
              className="flex-1 bg-transparent text-[11px] text-foreground placeholder:text-muted-foreground/40 outline-none min-w-0"
            />
            <button
              onClick={() => void handleAISubmit()}
              disabled={!aiPrompt.trim() || aiSubmitting}
              className="shrink-0 text-muted-foreground/30 hover:text-muted-foreground disabled:opacity-20 transition-colors cursor-pointer"
            >
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}
      <div className="flex min-w-0 items-center gap-3">
        <div className="relative">
          <button
            onClick={() => {
              setShowServerPopup((v) => {
                if (!v) void fetchProviderStatus();
                return !v;
              });
            }}
            className={`flex items-center gap-1.5 rounded-md px-1.5 py-0.5 transition-colors cursor-pointer ${
              appAlive && daemonAlive && anyProviderReady
                ? "text-green-500 hover:bg-green-500/10"
                : !appAlive
                ? "text-red-500 hover:bg-red-500/10"
                : "text-amber-500 hover:bg-amber-500/10"
            }`}
            title={
              appAlive && daemonAlive && anyProviderReady
                ? "All systems running"
                : !appAlive
                ? "App server is not responding"
                : !daemonAlive && !anyProviderReady
                ? "Daemon is not responding; no agent providers available"
                : !daemonAlive
                ? "Daemon is not responding"
                : "No agent providers available"
            }
            aria-label="Server status — click for details"
          >
            <span
              className={`inline-block h-2 w-2 rounded-full ${
                appAlive && daemonAlive && anyProviderReady
                  ? "bg-green-500"
                  : !appAlive
                  ? "bg-red-500 animate-pulse"
                  : "bg-amber-500 animate-pulse"
              }`}
            />
            <span>
              {appAlive && daemonAlive && anyProviderReady
                ? "Online"
                : !appAlive
                ? "Offline"
                : "Degraded"}
            </span>
          </button>
          {showServerPopup && (
            <div className={`absolute bottom-full left-0 mb-2 z-50 w-80 rounded-lg border bg-background p-3 shadow-lg ${
              appAlive && daemonAlive && anyProviderReady
                ? "border-green-500/30"
                : !appAlive
                ? "border-red-500/30"
                : "border-amber-500/30"
            }`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 space-y-2.5">
                  <p className={`text-xs font-medium ${
                    appAlive && daemonAlive && anyProviderReady
                      ? "text-green-500"
                      : !appAlive
                      ? "text-red-500"
                      : "text-amber-500"
                  }`}>
                    {appAlive && daemonAlive && anyProviderReady
                      ? "All Systems Running"
                      : "Service Disruption"}
                  </p>

                  {/* App Server */}
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2 text-[11px]">
                      <span className={`inline-block h-1.5 w-1.5 rounded-full shrink-0 ${appAlive ? "bg-green-500" : "bg-red-500"}`} />
                      <span className="font-medium text-foreground/80">App Server</span>
                      <span className={`ml-auto ${appAlive ? "text-green-500" : "text-red-500"}`}>{appAlive ? "Running" : "Down"}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground/70 pl-3.5">
                      {appAlive
                        ? "Pages, editor, search, and file management are working."
                        : "Pages, editor, search, and saving are unavailable. You can still read cached content."}
                    </p>
                  </div>

                  {/* Daemon */}
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2 text-[11px]">
                      <span className={`inline-block h-1.5 w-1.5 rounded-full shrink-0 ${daemonAlive ? "bg-green-500" : "bg-red-500"}`} />
                      <span className="font-medium text-foreground/80">Daemon</span>
                      <span className={`ml-auto ${daemonAlive ? "text-green-500" : "text-red-500"}`}>{daemonAlive ? "Running" : "Down"}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground/70 pl-3.5">
                      {daemonAlive
                        ? "AI agents, scheduled jobs, and the web terminal are working."
                        : "AI agents, scheduled jobs, and the web terminal are unavailable. Page editing still works."}
                    </p>
                  </div>

                  {/* Agent Providers */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-[11px]">
                      <span className={`inline-block h-1.5 w-1.5 rounded-full shrink-0 ${
                        anyProviderReady ? "bg-green-500" : "bg-red-500"
                      }`} />
                      <span className="font-medium text-foreground/80">Agent Providers</span>
                      <span className={`ml-auto ${anyProviderReady ? "text-green-500" : "text-red-500"}`}>
                        {!providersLoaded ? "Checking..." : anyProviderReady ? "Available" : "None Ready"}
                      </span>
                    </div>
                    {providersLoaded && providerStatuses.map((p) => (
                      <div key={p.id} className="flex items-center gap-2 text-[10px] pl-3.5 text-muted-foreground/70">
                        <span className={`inline-block h-1 w-1 rounded-full shrink-0 ${
                          p.available && p.authenticated ? "bg-green-500"
                          : p.available ? "bg-amber-500"
                          : "bg-red-500/50"
                        }`} />
                        <span>{p.name}</span>
                        <span className="ml-auto">
                          {p.available && p.authenticated ? "Ready"
                          : p.available ? "Not logged in"
                          : "Not installed"}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Troubleshooting tips */}
                  {(!appAlive || !daemonAlive || !anyProviderReady) && (
                    <div className="pt-1.5 border-t border-border space-y-1">
                      <p className="text-[10px] font-medium text-foreground/70">How to fix</p>
                      {(!appAlive || !daemonAlive) && (
                        isElectronInstall ? (
                          <p className="text-[10px] text-muted-foreground">
                            {!appAlive && !daemonAlive
                              ? "Both servers are down. Try quitting and reopening the Cabinet app."
                              : !appAlive
                              ? "The app server is not responding. Try quitting and reopening the Cabinet app."
                              : "The background daemon is not running. Try quitting and reopening the Cabinet app. If the issue persists, check Activity Monitor for stuck Cabinet processes."}
                          </p>
                        ) : installKind === "source-managed" ? (
                          <p className="text-[10px] text-muted-foreground">
                            {!appAlive && !daemonAlive ? (
                              <>Both servers are down. Restart with:{" "}
                              <code className="rounded bg-muted px-1 py-0.5 text-[10px]">npx cabinet</code></>
                            ) : !appAlive ? (
                              <>The app server crashed. Restart with:{" "}
                              <code className="rounded bg-muted px-1 py-0.5 text-[10px]">npx cabinet</code></>
                            ) : (
                              <>The daemon is not running. It should start automatically with{" "}
                              <code className="rounded bg-muted px-1 py-0.5 text-[10px]">npx cabinet</code>
                              . Try restarting.</>
                            )}
                          </p>
                        ) : (
                          <p className="text-[10px] text-muted-foreground">
                            {!appAlive && !daemonAlive ? (
                              <>Both servers are down. Start everything with:{" "}
                              <code className="rounded bg-muted px-1 py-0.5 text-[10px]">npm run dev:all</code></>
                            ) : !appAlive ? (
                              <>The Next.js app server crashed or was stopped. Restart with:{" "}
                              <code className="rounded bg-muted px-1 py-0.5 text-[10px]">npm run dev</code></>
                            ) : (
                              <>The daemon is not running. If you started only{" "}
                              <code className="rounded bg-muted px-1 py-0.5 text-[10px]">npm run dev</code>
                              , use{" "}
                              <code className="rounded bg-muted px-1 py-0.5 text-[10px]">npm run dev:all</code>
                              {" "}instead to start both servers.</>
                            )}
                          </p>
                        )
                      )}
                      {appAlive && daemonAlive && !anyProviderReady && (
                        <p className="text-[10px] text-muted-foreground">
                          No agent providers are installed or logged in.{" "}
                          <button
                            onClick={() => { setSection({ type: "settings" }); setShowServerPopup(false); }}
                            className="underline hover:text-foreground transition-colors"
                          >
                            Configure in Settings
                          </button>
                        </p>
                      )}
                    </div>
                  )}

                  {/* All good state */}
                  {appAlive && daemonAlive && anyProviderReady && (
                    <p className="text-[10px] text-muted-foreground/60 pt-1 border-t border-border">
                      Cabinet is fully operational. All features are available.
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setShowServerPopup(false)}
                  className="shrink-0 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  aria-label="Dismiss"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            </div>
          )}
        </div>
        {currentPath && (
          <span>
            {saveStatus === "saving"
              ? "Saving..."
              : saveStatus === "saved"
              ? "Saved"
              : saveStatus === "error"
              ? "Save failed"
              : "Ready"}
          </span>
        )}
        {pullStatus === "pulling" && (
          <span className="flex items-center gap-1 text-blue-400">
            <CloudDownload className="h-3 w-3 animate-pulse" />
            Pulling...
          </span>
        )}
        {pullStatus === "pulled" && (
          <span className="flex items-center gap-1 text-green-400">
            <Check className="h-3 w-3" />
            Updated from remote
          </span>
        )}
        {pullStatus === "up-to-date" && (
          <span className="flex items-center gap-1 text-muted-foreground/60">
            <Check className="h-3 w-3" />
            Up to date
          </span>
        )}
        {pullStatus === "error" && (
          <span className="flex items-center gap-1 text-red-400">
            Pull failed
          </span>
        )}
        {update?.updateStatus.state === "restart-required" && (
          <button
            onClick={() => setSection({ type: "settings" })}
            className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-amber-600 hover:bg-muted hover:text-foreground transition-colors"
            title="Open Settings to review the installed update"
          >
            <CloudDownload className="h-3 w-3" />
            Restart to finish update
          </button>
        )}
        {update?.updateAvailable && update?.updateStatus.state !== "restart-required" && update.latest && (
          <button
            onClick={() => setSection({ type: "settings" })}
            className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-blue-500 hover:bg-muted hover:text-foreground transition-colors"
            title={`Cabinet ${update.latest.version} is available`}
          >
            <CloudDownload className="h-3 w-3" />
            Update {update.latest.version} available
          </button>
        )}
        <span className="flex items-center gap-1">
          <GitBranch className="h-3 w-3" />
          {uncommitted > 0 ? `${uncommitted} uncommitted` : "All committed"}
        </span>
        <button
          onClick={pullAndRefresh}
          disabled={pulling}
          aria-label="Pull latest changes from GitHub and refresh"
          className="flex items-center gap-1 rounded-md px-1.5 py-0.5 hover:bg-muted hover:text-foreground transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-1"
          title="Pull latest from GitHub & refresh"
        >
          <RefreshCw className={`h-3 w-3 ${pulling ? "animate-spin" : ""}`} />
          Sync
        </button>
      </div>
      <div className="flex items-center gap-1.5">
        <a
          href={DISCORD_SUPPORT_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Open Discord for support and feedback"
          title="Support and feedback on Discord"
          className="inline-flex items-center gap-1.5 rounded-full border border-[#5865F2]/20 bg-[#5865F2]/10 px-2.5 py-1 text-[#5865F2] transition-all hover:-translate-y-px hover:border-[#5865F2]/35 hover:bg-[#5865F2]/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-1"
        >
          <DiscordIcon className="h-3.5 w-3.5" />
          <span className="text-[10px] font-semibold tracking-[0.04em] text-foreground">
            Chat
          </span>
        </a>
        <a
          href={GITHUB_REPO_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Open the Cabinet GitHub repository to contribute"
          title="Contribute on GitHub"
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/55 px-2.5 py-1 transition-all hover:-translate-y-px hover:border-foreground/15 hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-1"
        >
          <GitHubIcon className="h-3.5 w-3.5" />
          <span className="text-[10px] font-semibold tracking-[0.04em] text-foreground">
            Contribute
          </span>
        </a>
        <a
          href={GITHUB_REPO_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Star Cabinet on GitHub (${formatGithubStars(githubStars)} stars)`}
          title={`Star on GitHub (${formatGithubStars(githubStars)} stars)`}
          className="relative inline-flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-amber-700 transition-all hover:-translate-y-px hover:border-amber-500/35 hover:bg-amber-500/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-1 dark:text-amber-300"
        >
          {starsExploding && <StarExplosion />}
          <Star className="h-3.5 w-3.5 fill-current" />
          <span className="text-[10px] font-semibold tracking-[0.04em] text-foreground">
            {formatGithubStars(displayStars || githubStars)} stars
          </span>
        </a>
      </div>
    </div>
  );
}
