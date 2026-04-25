"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, ShieldCheck, ExternalLink, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Browse curated picks from `/api/agents/skills/catalog`. Currently the
 * backend returns a hand-curated stub of verified publishers because
 * skills.sh doesn't expose a stable public API yet — see plan §C3 / Phase 4.
 *
 * Each row links into the preview in the parent Add Skill dialog by passing
 * `github:owner/repo` to `onPick(source)`.
 */

interface FeaturedRepo {
  owner: string;
  repo: string;
  verified?: boolean;
}

interface CatalogResponse {
  mode: "listing";
  source: "cache" | "fresh";
  data: {
    note?: string;
    featured: FeaturedRepo[];
    sort?: string;
    query?: string | null;
  };
}

interface SkillCatalogBrowserProps {
  /** Called when the user clicks a row — parent should populate the source field. */
  onPick: (source: string) => void;
}

export function SkillCatalogBrowser({ onPick }: SkillCatalogBrowserProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<CatalogResponse["data"] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/agents/skills/catalog?sort=trending`);
      if (!res.ok) throw new Error(`catalog request failed (${res.status})`);
      const body = (await res.json()) as CatalogResponse;
      if (body.mode !== "listing") {
        throw new Error("catalog returned an unexpected shape");
      }
      setData(body.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "catalog failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground py-6 justify-center">
        <Loader2 className="size-3.5 animate-spin" /> Loading catalog…
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-xs text-destructive flex items-start gap-1.5 p-3">
        <AlertCircle className="size-3.5 shrink-0 mt-0.5" />
        {error}
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="flex flex-col gap-3">
      {data.note && (
        <div className="text-[11px] text-muted-foreground bg-muted/30 rounded-md px-2.5 py-2 flex items-start gap-1.5">
          <AlertCircle className="size-3 shrink-0 mt-0.5" />
          <span>{data.note}</span>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        {data.featured.map((repo) => {
          const source = `github:${repo.owner}/${repo.repo}`;
          return (
            <button
              key={source}
              type="button"
              onClick={() => onPick(source)}
              className={cn(
                "flex items-center justify-between gap-3 px-3 py-2 rounded-md text-left",
                "border border-border bg-background hover:bg-muted/40 transition-colors",
              )}
            >
              <div className="flex items-center gap-2 min-w-0">
                <code className="text-[11px] font-mono">{repo.owner}/{repo.repo}</code>
                {repo.verified && (
                  <ShieldCheck
                    className="size-3 text-emerald-500 shrink-0"
                    aria-label="Verified publisher"
                  />
                )}
              </div>
              <ExternalLink className="size-3 text-muted-foreground/60 shrink-0" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
