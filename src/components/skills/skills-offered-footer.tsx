"use client";

import { useState } from "react";
import Link from "next/link";
import { Sparkles, AlertTriangle, Lock, Check, Loader2 } from "lucide-react";
import type { ConversationMeta } from "@/types/conversations";

/**
 * Per-run honest observability footer (docs/SKILLS_PLAN.md C5).
 *
 * Lists which skills were *offered* to this run — this is something we know
 * for sure because we put them there. Does NOT claim which skills the model
 * actually expanded; that signal isn't reliable across providers.
 *
 * Reads `adapterConfig.skills` (allow-list) and `adapterConfig.skillsNeedsPrompt`
 * / `adapterConfig.skillsBlocked` (trust-gating snapshots) populated by
 * `prepareSkillMount` in `src/lib/agents/skills/sync.ts`.
 *
 * Surfaces an inline "Approve" affordance for skills in `skillsNeedsPrompt`
 * — clicking it persists an "approved" decision to `.cabinet/skills-trust.json`
 * via the trust API so the next run mounts the skill silently.
 */
export function SkillsOfferedFooter({ meta }: { meta: ConversationMeta }) {
  const config = (meta.adapterConfig || {}) as {
    skills?: string[];
    skillsNeedsPrompt?: Array<{ key: string; reason: string }>;
    skillsBlocked?: Array<{ key: string; reason: string }>;
  };

  const offered = config.skills ?? [];
  const needsPrompt = config.skillsNeedsPrompt ?? [];
  const blocked = config.skillsBlocked ?? [];

  const [approving, setApproving] = useState<Set<string>>(new Set());
  const [approved, setApproved] = useState<Set<string>>(new Set());
  const [approveError, setApproveError] = useState<string | null>(null);

  const handleApprove = async (key: string) => {
    setApproving((prev) => new Set(prev).add(key));
    setApproveError(null);
    try {
      const res = await fetch(`/api/agents/skills/${encodeURIComponent(key)}/trust`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          status: "approved",
          cabinetPath: meta.cabinetPath ?? null,
          reason: `Approved from conversation ${meta.id}`,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || `approve failed (${res.status})`);
      }
      setApproved((prev) => new Set(prev).add(key));
    } catch (err) {
      setApproveError(err instanceof Error ? err.message : "approve failed");
    } finally {
      setApproving((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  };

  if (offered.length === 0 && needsPrompt.length === 0 && blocked.length === 0) {
    return null;
  }

  return (
    <div className="mt-3 pt-3 border-t border-border/60 text-[11px]">
      {offered.length > 0 && (
        <div className="flex items-start gap-2 text-muted-foreground">
          <Sparkles className="size-3 mt-0.5 shrink-0" />
          <div>
            <span className="font-medium">Skills offered:</span>{" "}
            {offered.map((key, i) => (
              <span key={key}>
                {i > 0 && ", "}
                <Link
                  href={`/skills/${encodeURIComponent(key)}`}
                  className="hover:text-foreground hover:underline"
                >
                  {key}
                </Link>
              </span>
            ))}
          </div>
        </div>
      )}
      {needsPrompt.length > 0 && (
        <div className="flex items-start gap-2 text-amber-600 dark:text-amber-400 mt-1.5">
          <AlertTriangle className="size-3 mt-0.5 shrink-0" />
          <div className="flex-1">
            <span className="font-medium">Skipped (needs trust approval):</span>{" "}
            <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
              {needsPrompt.map((entry) => {
                const isApproving = approving.has(entry.key);
                const isApproved = approved.has(entry.key);
                return (
                  <span
                    key={entry.key}
                    className="inline-flex items-center gap-1"
                    title={entry.reason}
                  >
                    <Link
                      href={`/skills/${encodeURIComponent(entry.key)}`}
                      className="hover:underline"
                    >
                      {entry.key}
                    </Link>
                    {isApproved ? (
                      <span className="inline-flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400">
                        <Check className="size-2.5" />
                        approved (next run)
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleApprove(entry.key)}
                        disabled={isApproving}
                        className="inline-flex items-center gap-0.5 text-[10px] underline hover:text-amber-700 dark:hover:text-amber-300 disabled:opacity-60"
                      >
                        {isApproving ? (
                          <Loader2 className="size-2.5 animate-spin" />
                        ) : (
                          <Check className="size-2.5" />
                        )}
                        approve
                      </button>
                    )}
                  </span>
                );
              })}
            </span>
            {approveError && (
              <div className="text-[10px] text-red-500 mt-0.5">{approveError}</div>
            )}
          </div>
        </div>
      )}
      {blocked.length > 0 && (
        <div className="flex items-start gap-2 text-red-500 mt-1.5">
          <Lock className="size-3 mt-0.5 shrink-0" />
          <div>
            <span className="font-medium">Blocked:</span>{" "}
            {blocked.map((entry, i) => (
              <span key={entry.key} title={entry.reason}>
                {i > 0 && ", "}
                <Link
                  href={`/skills/${encodeURIComponent(entry.key)}`}
                  className="hover:underline"
                >
                  {entry.key}
                </Link>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
