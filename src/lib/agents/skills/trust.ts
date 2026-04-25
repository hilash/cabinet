import fs from "fs";
import path from "path";
import { DATA_DIR } from "@/lib/storage/path-utils";
import { PROJECT_ROOT } from "@/lib/runtime/runtime-config";
import type { SkillEntry, TrustPolicy } from "./types";

/**
 * Trust gating runs at mount time. Decision combines three inputs:
 *   1. Auto-detected `trustLevel` of the bundle (from file inventory)
 *   2. Origin & verification status (verified publisher / unverified)
 *   3. Skill author's declared `trust-policy` in SKILL.md frontmatter
 *
 * Cabinet operator's per-cabinet decision in `.cabinet/skills-trust.json`
 * overrides the author default. Plan ref: docs/SKILLS_PLAN.md C6.
 */

export type TrustDecisionStatus =
  | "allow"               // mount silently
  | "needs-prompt"        // first-run prompt; remembered after approval
  | "block";              // refuse mount; require explicit approval

export interface CabinetTrustEntry {
  /** "approved" — operator clicked allow; "revoked" — operator clicked deny. */
  status: "approved" | "revoked";
  decidedAt: string;       // ISO timestamp
  decidedBy?: string;      // operator id, optional
  reason?: string;         // optional free-text reason
}

export interface CabinetTrustFile {
  version: 1;
  decisions: Record<string, CabinetTrustEntry>; // key → entry
}

function trustFilePath(cabinetPath: string | null | undefined): string {
  const cabinetRoot = cabinetPath
    ? path.join(DATA_DIR, cabinetPath)
    : PROJECT_ROOT;
  return path.join(cabinetRoot, ".cabinet", "skills-trust.json");
}

export async function loadCabinetTrustDecisions(
  cabinetPath: string | null | undefined,
): Promise<CabinetTrustFile> {
  const file = trustFilePath(cabinetPath);
  try {
    const raw = await fs.promises.readFile(file, "utf-8");
    const parsed = JSON.parse(raw) as Partial<CabinetTrustFile>;
    if (parsed && typeof parsed === "object" && parsed.decisions && typeof parsed.decisions === "object") {
      return { version: 1, decisions: parsed.decisions as Record<string, CabinetTrustEntry> };
    }
  } catch {
    // Fall through to empty default.
  }
  return { version: 1, decisions: {} };
}

export async function saveCabinetTrustDecision(
  cabinetPath: string | null | undefined,
  key: string,
  entry: CabinetTrustEntry,
): Promise<void> {
  const file = trustFilePath(cabinetPath);
  await fs.promises.mkdir(path.dirname(file), { recursive: true });
  const current = await loadCabinetTrustDecisions(cabinetPath);
  current.decisions[key] = entry;
  await fs.promises.writeFile(file, JSON.stringify(current, null, 2), "utf-8");
}

/**
 * Verified publisher list. Phase 4 / catalog integration will widen this from
 * skills.sh's verified-badge data; for now we accept Anthropic plus a small
 * starter list. UI surfaces the badge based on this set.
 */
const KNOWN_VERIFIED_PUBLISHERS: ReadonlySet<string> = new Set([
  "anthropic",
  "anthropics",
  "vercel",
  "vercel-labs",
  "microsoft",
  "google",
  "openai",
  "shadcn",
]);

export function isVerifiedPublisher(publisher?: string | null): boolean {
  if (!publisher) return false;
  return KNOWN_VERIFIED_PUBLISHERS.has(publisher.trim().toLowerCase());
}

export interface TrustEvaluationInput {
  skill: SkillEntry;
  cabinetPath?: string | null;
  /** Publisher slug (e.g. "anthropic") if known from import metadata. Optional. */
  publisher?: string | null;
}

export interface TrustEvaluation {
  status: TrustDecisionStatus;
  reason: string;
  /** Effective trust policy after combining frontmatter + origin defaults. */
  effectivePolicy: TrustPolicy;
}

function defaultTrustPolicyFor(skill: SkillEntry, verified: boolean): TrustPolicy {
  if (skill.trustPolicy) return skill.trustPolicy;

  // Catch-all Bash → always-prompt unless verified
  if (skill.allowedTools.some((tool) => /Bash\(\s*\*\s*\)/.test(tool))) {
    return verified ? "prompt-once" : "always-prompt";
  }

  if (skill.trustLevel === "scripts_executables") {
    return verified ? "prompt-once" : "always-prompt";
  }

  // markdown_only or assets — auto-allow regardless of provenance
  return "auto-allow";
}

/**
 * Decide whether a skill should be mounted for a run, based on its trust
 * level, declared policy, the cabinet operator's prior decisions, and
 * whether the publisher is verified. Pure function: caller is responsible
 * for surfacing prompts / persisting decisions.
 */
export async function evaluateMountDecision(
  input: TrustEvaluationInput,
): Promise<TrustEvaluation> {
  const verified = isVerifiedPublisher(input.publisher);
  const effectivePolicy = defaultTrustPolicyFor(input.skill, verified);

  // Operator's per-cabinet decision overrides the author default.
  const trust = await loadCabinetTrustDecisions(input.cabinetPath);
  const operatorDecision = trust.decisions[input.skill.key];
  if (operatorDecision?.status === "approved") {
    return {
      status: "allow",
      reason: `Approved in this cabinet on ${operatorDecision.decidedAt}.`,
      effectivePolicy,
    };
  }
  if (operatorDecision?.status === "revoked") {
    return {
      status: "block",
      reason: `Revoked in this cabinet on ${operatorDecision.decidedAt}.`,
      effectivePolicy,
    };
  }

  // No operator decision — apply author policy.
  switch (effectivePolicy) {
    case "auto-allow":
      return { status: "allow", reason: "Author trust-policy: auto-allow", effectivePolicy };
    case "prompt-once":
    case "always-prompt":
      return {
        status: "needs-prompt",
        reason: `Author trust-policy: ${effectivePolicy}${verified ? "" : " (publisher unverified)"}`,
        effectivePolicy,
      };
    case "refuse":
      return { status: "block", reason: "Author trust-policy: refuse", effectivePolicy };
  }
}
