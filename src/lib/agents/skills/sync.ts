import fs from "fs";
import os from "os";
import path from "path";
import { resolveDesiredSkills } from "./loader";
import { evaluateMountDecision } from "./trust";
import { recordSkillsOffered } from "./stats";
import type { SkillBundle } from "./types";

/**
 * Idempotent symlink: clobbers an existing managed link, leaves a real dir
 * (user-installed) alone if `protectExisting` is true (default).
 */
export function ensureSymlink(
  source: string,
  target: string,
  opts: { protectExisting?: boolean } = {},
): void {
  const protectExisting = opts.protectExisting !== false;
  let existing: fs.Stats | null = null;
  try {
    existing = fs.lstatSync(target);
  } catch {
    /* doesn't exist */
  }
  if (existing) {
    if (existing.isSymbolicLink()) {
      try {
        fs.unlinkSync(target);
      } catch {
        return;
      }
    } else if (protectExisting) {
      // Real dir/file — leave alone.
      return;
    } else {
      try {
        fs.rmSync(target, { recursive: true, force: true });
      } catch {
        return;
      }
    }
  }
  fs.mkdirSync(path.dirname(target), { recursive: true });
  try {
    fs.symlinkSync(source, target, "dir");
  } catch (err) {
    if ((err as NodeJS.ErrnoException)?.code !== "EEXIST") {
      try {
        fs.cpSync(source, target, { recursive: true });
      } catch {
        /* give up */
      }
    }
  }
}

export interface InstalledTarget {
  name: string;
  targetPath: string;
  managed: boolean;
}

/**
 * Inspect a "skills home" directory (e.g. `~/.claude/skills/` or `~/.agents/skills/`)
 * and report what's there. `managed: true` means the entry is a symlink to a
 * Cabinet-managed source; `false` means a real dir, presumed user-installed.
 */
export function readInstalledTargets(home: string): InstalledTarget[] {
  let dirents: fs.Dirent[];
  try {
    dirents = fs.readdirSync(home, { withFileTypes: true });
  } catch {
    return [];
  }
  const out: InstalledTarget[] = [];
  for (const dirent of dirents) {
    if (dirent.name.startsWith(".")) continue;
    const targetPath = path.join(home, dirent.name);
    let managed = false;
    if (dirent.isSymbolicLink()) {
      managed = true;
    }
    if (dirent.isDirectory() || dirent.isSymbolicLink()) {
      out.push({ name: dirent.name, targetPath, managed });
    }
  }
  return out;
}

/**
 * Mount handle returned from `prepareSkillMount`. Callers pass it to
 * `cleanupSkillMount(handle)` after the run completes.
 */
export interface SkillMount {
  /** Tmpdir containing symlinks to the mounted skill bundles. */
  dir: string;
  /** Skills successfully mounted. */
  mounted: SkillBundle[];
  /** Skills that needed an operator prompt — surfaced for UI. */
  needsPrompt: Array<{ skill: SkillBundle; reason: string }>;
  /** Skills explicitly blocked. */
  blocked: Array<{ skill: SkillBundle; reason: string }>;
}

export interface PrepareSkillMountInput {
  sessionId: string;
  desiredKeys: string[] | undefined;
  cabinetPath?: string | null;
  /** Publisher slug if known (e.g. from import metadata). Optional. */
  publisher?: string | null;
}

/**
 * Resolve a persona's desired skills, apply trust gating, and materialize a
 * symlink tmpdir for adapters that consume `adapterConfig.skillsDir`.
 *
 * Returns null when nothing was selected (so the spawn isn't polluted with
 * an empty `skillsDir` flag). When a skill needs a prompt or is blocked, it
 * goes into the appropriate snapshot field — caller decides whether to
 * surface a UI prompt or proceed with the partial mount.
 */
export async function prepareSkillMount(
  input: PrepareSkillMountInput,
): Promise<SkillMount | null> {
  if (!input.desiredKeys || input.desiredKeys.length === 0) return null;
  const bundles = await resolveDesiredSkills(input.desiredKeys, input.cabinetPath ?? undefined);
  if (bundles.length === 0) return null;

  const mounted: SkillBundle[] = [];
  const needsPrompt: SkillMount["needsPrompt"] = [];
  const blocked: SkillMount["blocked"] = [];

  for (const skill of bundles) {
    const decision = await evaluateMountDecision({
      skill,
      cabinetPath: input.cabinetPath,
      publisher: input.publisher,
    });
    if (decision.status === "allow") {
      mounted.push(skill);
    } else if (decision.status === "needs-prompt") {
      needsPrompt.push({ skill, reason: decision.reason });
    } else {
      blocked.push({ skill, reason: decision.reason });
    }
  }

  if (mounted.length === 0 && needsPrompt.length === 0) {
    // Nothing to mount; tmpdir would be empty.
    return null;
  }

  const base = path.join(os.tmpdir(), "cabinet-skills");
  fs.mkdirSync(base, { recursive: true });
  const dir = path.join(base, input.sessionId);
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch {
    /* fine */
  }
  fs.mkdirSync(dir, { recursive: true });

  for (const skill of mounted) {
    ensureSymlink(skill.path, path.join(dir, skill.key));
  }

  // Record that these skills were offered (mounted + needsPrompt count, not
  // blocked). Honest C5 observability — drives the "last offered" timestamp
  // shown in the library. Best-effort: stat write failures don't block the run.
  const offeredKeys = [
    ...mounted.map((s) => s.key),
    ...needsPrompt.map((e) => e.skill.key),
  ];
  if (offeredKeys.length > 0) {
    await recordSkillsOffered(offeredKeys, input.cabinetPath ?? null);
  }

  return { dir, mounted, needsPrompt, blocked };
}

export function cleanupSkillMount(handle: SkillMount | null): void {
  if (!handle) return;
  try {
    fs.rmSync(handle.dir, { recursive: true, force: true });
  } catch {
    /* already gone */
  }
}
