"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { GitBranch, RefreshCw, Check, CloudDownload, Star } from "lucide-react";
import { useCabinetUpdate } from "@/hooks/use-cabinet-update";
import { useEditorStore } from "@/stores/editor-store";
import { useTreeStore } from "@/stores/tree-store";
import { useAppStore } from "@/stores/app-store";

const DISCORD_SUPPORT_URL = "https://discord.com/invite/rxd8BYnN";
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

export function StatusBar() {
  const { saveStatus, currentPath } = useEditorStore();
  const loadTree = useTreeStore((s) => s.loadTree);
  const setSection = useAppStore((s) => s.setSection);
  const [uncommitted, setUncommitted] = useState(0);
  const [pullStatus, setPullStatus] = useState<"idle" | "pulling" | "pulled" | "up-to-date" | "error">("idle");
  const [pulling, setPulling] = useState(false);
  const [githubStars, setGithubStars] = useState(GITHUB_STARS_FALLBACK);
  const didAutoPullRef = useRef(false);
  const { update } = useCabinetUpdate();

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

  return (
    <div className="flex items-center justify-between px-3 py-1 border-t border-border text-[11px] text-muted-foreground/60 bg-background">
      <div className="flex min-w-0 items-center gap-3">
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
          className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-amber-700 transition-all hover:-translate-y-px hover:border-amber-500/35 hover:bg-amber-500/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-1 dark:text-amber-300"
        >
          <Star className="h-3.5 w-3.5 fill-current" />
          <span className="text-[10px] font-semibold tracking-[0.04em] text-foreground">
            {formatGithubStars(githubStars)} stars
          </span>
        </a>
      </div>
    </div>
  );
}
