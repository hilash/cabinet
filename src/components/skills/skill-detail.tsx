"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  ClipboardCheck,
  Loader2,
  Save,
  ShieldAlert,
  ShieldCheck,
  Shield,
  Trash2,
  Lock,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type {
  SkillBundle,
  SkillOrigin,
  TrustLevel,
  TrustPolicy,
} from "@/lib/agents/skills/types";

const ORIGIN_LABEL: Record<SkillOrigin, string> = {
  "cabinet-scoped": "Cabinet (scoped)",
  "cabinet-root": "Cabinet (root)",
  "linked-repo": "Linked repo",
  system: "System",
  "legacy-home": "Legacy ~/.cabinet",
};

const TRUST_LABEL: Record<TrustLevel, string> = {
  markdown_only: "Markdown only",
  assets: "Assets",
  scripts_executables: "Scripts",
};

function TrustIcon({ level }: { level: TrustLevel }) {
  if (level === "markdown_only") return <ShieldCheck className="size-3.5 text-emerald-500" />;
  if (level === "assets") return <Shield className="size-3.5 text-blue-500" />;
  return <ShieldAlert className="size-3.5 text-amber-500" />;
}

interface SkillDetailProps {
  skillKey: string;
  cabinetPath?: string;
}

export function SkillDetail({ skillKey, cabinetPath }: SkillDetailProps) {
  const [bundle, setBundle] = useState<SkillBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">("idle");

  // Editable fields
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [trustPolicy, setTrustPolicy] = useState<TrustPolicy | "">("");
  const [allowedTools, setAllowedTools] = useState("");
  const [body, setBody] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (cabinetPath) params.set("cabinet", cabinetPath);
      const res = await fetch(`/api/agents/skills/${encodeURIComponent(skillKey)}?${params}`);
      if (!res.ok) throw new Error(`load failed: ${res.statusText}`);
      const data = (await res.json()) as { skill: SkillBundle };
      setBundle(data.skill);
      setName(data.skill.name);
      setDescription(data.skill.description ?? "");
      setTrustPolicy(data.skill.trustPolicy ?? "");
      setAllowedTools(data.skill.allowedTools.join(", "));
      setBody(data.skill.body);
    } catch (err) {
      setError(err instanceof Error ? err.message : "load failed");
    } finally {
      setLoading(false);
    }
  }, [skillKey, cabinetPath]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleSave = useCallback(async () => {
    if (!bundle) return;
    setSaving(true);
    setSaveStatus("idle");
    try {
      const params = new URLSearchParams();
      if (cabinetPath) params.set("cabinet", cabinetPath);
      const frontmatter: Record<string, unknown> = { name, description };
      if (trustPolicy) frontmatter["trust-policy"] = trustPolicy;
      if (allowedTools.trim()) frontmatter["allowed-tools"] = allowedTools.trim();
      const res = await fetch(`/api/agents/skills/${encodeURIComponent(skillKey)}?${params}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ body, frontmatter }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || `save failed: ${res.statusText}`);
      }
      setSaveStatus("saved");
      await refresh();
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "save failed");
      setSaveStatus("error");
    } finally {
      setSaving(false);
    }
  }, [bundle, skillKey, cabinetPath, name, description, trustPolicy, allowedTools, body, refresh]);

  const handleDelete = useCallback(async () => {
    if (!bundle) return;
    if (!confirm(`Delete skill "${bundle.key}"? Files will be removed from disk.`)) return;
    const params = new URLSearchParams();
    if (cabinetPath) params.set("cabinet", cabinetPath);
    const res = await fetch(`/api/agents/skills/${encodeURIComponent(skillKey)}?${params}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      alert(`Delete failed: ${(await res.json().catch(() => ({}))).error || res.statusText}`);
      return;
    }
    window.location.href = "/skills";
  }, [bundle, skillKey, cabinetPath]);

  const handleRevokeTrust = useCallback(async () => {
    if (!bundle) return;
    const res = await fetch(`/api/agents/skills/${encodeURIComponent(skillKey)}/trust`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        status: "revoked",
        cabinetPath: cabinetPath ?? null,
        reason: "Revoked from skill detail page",
      }),
    });
    if (res.ok) {
      alert("Trust revoked. Next run will re-prompt.");
    }
  }, [bundle, skillKey, cabinetPath]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground p-8">
        <Loader2 className="size-3.5 animate-spin" /> Loading…
      </div>
    );
  }
  if (error || !bundle) {
    return (
      <div className="p-8 text-sm text-destructive flex items-start gap-2">
        <AlertTriangle className="size-4 shrink-0 mt-0.5" />
        {error ?? "Skill not found."}
      </div>
    );
  }

  const readOnly = !bundle.editable;

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-border px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Link
            href="/skills"
            className="text-muted-foreground hover:text-foreground"
            aria-label="Back to skills library"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <h2 className="text-sm font-semibold truncate">{bundle.name}</h2>
          <code className="text-[11px] text-muted-foreground font-mono">{bundle.key}</code>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
            {ORIGIN_LABEL[bundle.origin]}
          </span>
          {readOnly && (
            <Lock
              className="size-3.5 text-muted-foreground"
              aria-label={`Read-only — origin ${bundle.origin}`}
            />
          )}
        </div>
        <div className="flex items-center gap-2">
          {bundle.trustPolicy && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRevokeTrust}
              title="Revoke trust decision for this skill"
            >
              Revoke trust
            </Button>
          )}
          {!readOnly && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDelete}
                aria-label="Delete skill"
              >
                <Trash2 className="size-3.5" />
              </Button>
              <Button size="sm" onClick={handleSave} disabled={saving}>
                {saving ? (
                  <Loader2 className="size-3.5 mr-1 animate-spin" />
                ) : saveStatus === "saved" ? (
                  <Check className="size-3.5 mr-1" />
                ) : (
                  <Save className="size-3.5 mr-1" />
                )}
                Save
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <ScrollArea className="flex-1 border-r border-border">
          <div className="p-4 flex flex-col gap-4">
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Body (markdown)
              </label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                disabled={readOnly}
                spellCheck={false}
                className={cn(
                  "mt-1 w-full h-[60vh] font-mono text-xs p-3 bg-card border border-border rounded-md",
                  "focus:outline-none focus:ring-2 focus:ring-ring",
                  readOnly && "cursor-not-allowed opacity-70",
                )}
              />
            </div>
          </div>
        </ScrollArea>

        <div className="w-80 shrink-0 overflow-y-auto">
          <div className="p-4 flex flex-col gap-4">
            <section className="flex flex-col gap-2">
              <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Name
              </label>
              <Input value={name} onChange={(e) => setName(e.target.value)} disabled={readOnly} />
            </section>

            <section className="flex flex-col gap-2">
              <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Description (routing logic)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={readOnly}
                rows={4}
                className={cn(
                  "w-full text-xs p-2 bg-card border border-border rounded-md",
                  "focus:outline-none focus:ring-2 focus:ring-ring",
                  readOnly && "cursor-not-allowed opacity-70",
                )}
              />
            </section>

            <section className="flex flex-col gap-2">
              <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Trust policy
              </label>
              <select
                value={trustPolicy}
                onChange={(e) => setTrustPolicy(e.target.value as TrustPolicy | "")}
                disabled={readOnly}
                className={cn(
                  "w-full text-xs p-2 bg-card border border-border rounded-md",
                  readOnly && "cursor-not-allowed opacity-70",
                )}
              >
                <option value="">(default — auto from trust level)</option>
                <option value="auto-allow">auto-allow</option>
                <option value="prompt-once">prompt-once</option>
                <option value="always-prompt">always-prompt</option>
                <option value="refuse">refuse</option>
              </select>
            </section>

            <section className="flex flex-col gap-2">
              <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Allowed tools (comma-separated)
              </label>
              <Input
                value={allowedTools}
                onChange={(e) => setAllowedTools(e.target.value)}
                disabled={readOnly}
                placeholder="Bash(git status), Bash(npm *)"
                className="font-mono text-[11px]"
              />
            </section>

            <section className="flex flex-col gap-1.5 pt-2 border-t border-border">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground">Trust level</span>
                <span className="flex items-center gap-1">
                  <TrustIcon level={bundle.trustLevel} />
                  {TRUST_LABEL[bundle.trustLevel]}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground">Origin</span>
                <span>{ORIGIN_LABEL[bundle.origin]}</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground">Files</span>
                <span>{bundle.fileInventory.length}</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground">Editable</span>
                <span>{bundle.editable ? "yes" : "no"}</span>
              </div>
            </section>

            {bundle.fileInventory.some((f) => f.path.startsWith("evals/")) && (
              <section className="border-t border-border pt-3">
                <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                  <ClipboardCheck className="size-3" />
                  Evals
                </label>
                <p className="text-[11px] text-muted-foreground mt-1.5">
                  This skill ships{" "}
                  {bundle.fileInventory.filter((f) => f.path.startsWith("evals/")).length}{" "}
                  evaluation file
                  {bundle.fileInventory.filter((f) => f.path.startsWith("evals/")).length === 1
                    ? ""
                    : "s"}{" "}
                  under{" "}
                  <code className="font-mono text-[10px]">evals/</code>. A built-in
                  &quot;Run evals&quot; runner is on the roadmap; for now, run them
                  manually against your CLI when adopting a third-party skill.
                </p>
              </section>
            )}

            {bundle.fileInventory.length > 0 && (
              <section>
                <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Bundle ({bundle.fileInventory.length})
                </label>
                <div className="mt-1.5 flex flex-col gap-1 max-h-48 overflow-y-auto">
                  {bundle.fileInventory.map((file) => (
                    <div
                      key={file.path}
                      className="flex items-center justify-between text-[10px] font-mono"
                    >
                      <span className="text-muted-foreground truncate">{file.path}</span>
                      <span className="text-muted-foreground/60 ml-2">{file.kind}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
