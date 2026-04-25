"use client";

import { useCallback, useState } from "react";
import { Loader2, AlertTriangle, Star, Clock, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { SkillCatalogBrowser } from "./skill-catalog-browser";

interface RepoMeta {
  owner: string;
  repo: string;
  stars: number;
  forks: number;
  lastCommitISO: string | null;
  lastCommitAgeDays: number | null;
  defaultBranch: string;
  description: string | null;
  topics: string[];
}

interface SkillAddDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cabinetPath?: string;
  onImported?: (key: string) => Promise<void> | void;
}

const VERIFIED_OWNERS = new Set([
  "anthropic",
  "anthropics",
  "vercel",
  "vercel-labs",
  "microsoft",
  "google",
  "openai",
  "shadcn",
  "shadcn-ui",
]);

function isVerified(owner: string): boolean {
  return VERIFIED_OWNERS.has(owner.toLowerCase());
}

function parsePreviewSource(raw: string): { owner: string; repo: string; skill?: string } | null {
  const trimmed = raw.trim();
  const skillsSh = trimmed.match(/^https?:\/\/skills\.sh\/([^/]+)\/([^/]+)(?:\/([^/?#]+))?/);
  if (skillsSh) return { owner: skillsSh[1], repo: skillsSh[2], skill: skillsSh[3] };
  const gh = trimmed.match(/^https?:\/\/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?(?:\/.*)?$/);
  if (gh) return { owner: gh[1], repo: gh[2] };
  const shorthand = trimmed.match(/^github:([^/]+)\/([^/]+)(?:\/([^/]+))?$/);
  if (shorthand) return { owner: shorthand[1], repo: shorthand[2], skill: shorthand[3] };
  return null;
}

export function SkillAddDialog({
  open,
  onOpenChange,
  cabinetPath,
  onImported,
}: SkillAddDialogProps) {
  const [source, setSource] = useState("");
  const [previewing, setPreviewing] = useState(false);
  const [preview, setPreview] = useState<RepoMeta | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  const handlePreview = useCallback(async () => {
    setPreview(null);
    setPreviewError(null);
    const parsed = parsePreviewSource(source);
    if (!parsed) {
      setPreviewError(
        "Unrecognized format. Try `github:owner/repo`, a github.com URL, or a skills.sh URL.",
      );
      return;
    }
    setPreviewing(true);
    try {
      const params = new URLSearchParams({ owner: parsed.owner, repo: parsed.repo });
      if (parsed.skill) params.set("skill", parsed.skill);
      const res = await fetch(`/api/agents/skills/catalog?${params}`);
      if (!res.ok) throw new Error(`couldn't fetch ${parsed.owner}/${parsed.repo}`);
      const data = (await res.json()) as { skill?: RepoMeta };
      if (data.skill) setPreview(data.skill);
      else setPreviewError("No metadata returned for that repo.");
    } catch (err) {
      setPreviewError(err instanceof Error ? err.message : "Preview failed");
    } finally {
      setPreviewing(false);
    }
  }, [source]);

  const handleImport = useCallback(async () => {
    setImporting(true);
    setImportError(null);
    try {
      const scope = cabinetPath ? `cabinet:${cabinetPath}` : "root";
      const res = await fetch("/api/agents/skills/import", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ source, scope }),
      });
      const data = (await res.json()) as { ok?: boolean; key?: string; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error || "import failed");
      if (onImported && data.key) await onImported(data.key);
      setSource("");
      setPreview(null);
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setImporting(false);
    }
  }, [source, cabinetPath, onImported]);

  const [tab, setTab] = useState<"paste" | "browse">("paste");

  const handleCatalogPick = useCallback(
    (next: string) => {
      setSource(next);
      setTab("paste");
      setPreview(null);
      setPreviewError(null);
    },
    [],
  );

  const verified = preview ? isVerified(preview.owner) : false;
  const stale =
    preview?.lastCommitAgeDays != null && preview.lastCommitAgeDays > 365
      ? "red"
      : preview?.lastCommitAgeDays != null && preview.lastCommitAgeDays > 180
      ? "yellow"
      : null;
  const lowStars = preview != null && preview.stars < 10;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add skill</DialogTitle>
          <DialogDescription>
            Paste a skills.sh URL, GitHub URL, or `github:owner/repo[/skill]` shortcode.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          <div className="flex gap-1 border-b border-border">
            <button
              type="button"
              onClick={() => setTab("paste")}
              className={cn(
                "px-3 py-1.5 text-xs border-b-2 -mb-px",
                tab === "paste"
                  ? "border-foreground text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              Paste URL
            </button>
            <button
              type="button"
              onClick={() => setTab("browse")}
              className={cn(
                "px-3 py-1.5 text-xs border-b-2 -mb-px",
                tab === "browse"
                  ? "border-foreground text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              Browse catalog
            </button>
          </div>

          {tab === "browse" ? (
            <SkillCatalogBrowser onPick={handleCatalogPick} />
          ) : (
            <div className="flex gap-2">
              <Input
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder="https://skills.sh/anthropics/skills/release"
                className="flex-1"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handlePreview();
                }}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handlePreview}
                disabled={!source.trim() || previewing}
              >
                {previewing ? <Loader2 className="size-3.5 animate-spin" /> : "Preview"}
              </Button>
            </div>
          )}

          {previewError && (
            <div className="text-xs text-destructive flex items-start gap-1.5">
              <AlertTriangle className="size-3.5 shrink-0 mt-0.5" />
              {previewError}
            </div>
          )}

          {preview && (
            <div className="border border-border rounded-md p-3 flex flex-col gap-2 bg-muted/30">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">
                  {preview.owner}/{preview.repo}
                </span>
                {verified && (
                  <span
                    className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium"
                    title="Verified publisher"
                  >
                    <ShieldCheck className="size-3" />
                    Verified
                  </span>
                )}
              </div>
              {preview.description && (
                <p className="text-xs text-muted-foreground line-clamp-2">{preview.description}</p>
              )}
              <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Star className="size-3" />
                  {preview.stars.toLocaleString()}
                </span>
                {preview.lastCommitAgeDays != null && (
                  <span
                    className={cn(
                      "flex items-center gap-1",
                      stale === "red" && "text-red-500",
                      stale === "yellow" && "text-amber-500",
                    )}
                  >
                    <Clock className="size-3" />
                    {preview.lastCommitAgeDays}d ago
                  </span>
                )}
              </div>
              {(stale || lowStars || !verified) && (
                <div className="flex flex-col gap-1 mt-1">
                  {lowStars && (
                    <div className="text-[11px] text-amber-600 dark:text-amber-400 flex items-start gap-1.5">
                      <AlertTriangle className="size-3 shrink-0 mt-0.5" />
                      Few stars — this skill is unverified by the community.
                    </div>
                  )}
                  {stale === "red" && (
                    <div className="text-[11px] text-red-500 flex items-start gap-1.5">
                      <AlertTriangle className="size-3 shrink-0 mt-0.5" />
                      Stale — last commit over a year ago. May be unmaintained.
                    </div>
                  )}
                  {stale === "yellow" && (
                    <div className="text-[11px] text-amber-600 dark:text-amber-400 flex items-start gap-1.5">
                      <AlertTriangle className="size-3 shrink-0 mt-0.5" />
                      Last commit over 6 months ago.
                    </div>
                  )}
                  {!verified && !lowStars && !stale && (
                    <div className="text-[11px] text-muted-foreground flex items-start gap-1.5">
                      <AlertTriangle className="size-3 shrink-0 mt-0.5" />
                      Publisher is not on the verified list. Review the source before installing.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {importError && (
            <div className="text-xs text-destructive flex items-start gap-1.5">
              <AlertTriangle className="size-3.5 shrink-0 mt-0.5" />
              {importError}
            </div>
          )}
        </div>

        <DialogFooter>
          <DialogClose render={<Button variant="ghost">Cancel</Button>} />
          <Button onClick={handleImport} disabled={!source.trim() || importing}>
            {importing ? <Loader2 className="size-3.5 mr-1 animate-spin" /> : null}
            Install
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
