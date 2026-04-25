/**
 * Source-string parsing for the skill import endpoint. Extracted from the
 * route so it can be unit-tested in isolation.
 *
 * Accepted source forms:
 *   - "github:owner/repo[/skill]"
 *   - "https://github.com/owner/repo[/...]"
 *   - "https://skills.sh/owner/repo[/skill]"
 *   - "local:/absolute/path"
 */

export interface ResolvedSource {
  kind: "github" | "skills_sh" | "local";
  owner?: string;
  repo?: string;
  skillName?: string;
  ref?: string;
  localPath?: string;
}

export function parseSource(raw: string): ResolvedSource | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // local:/path
  if (trimmed.startsWith("local:")) {
    const localPath = trimmed.slice("local:".length);
    if (!localPath) return null;
    return { kind: "local", localPath };
  }

  // skills.sh URL
  const skillsShMatch = trimmed.match(
    /^https?:\/\/skills\.sh\/([^/]+)\/([^/]+)(?:\/([^/?#]+))?/,
  );
  if (skillsShMatch) {
    return {
      kind: "skills_sh",
      owner: skillsShMatch[1],
      repo: skillsShMatch[2],
      skillName: skillsShMatch[3],
    };
  }

  // GitHub URL
  const ghMatch = trimmed.match(
    /^https?:\/\/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?(?:\/.*)?$/,
  );
  if (ghMatch) {
    return { kind: "github", owner: ghMatch[1], repo: ghMatch[2] };
  }

  // github:owner/repo[/skill]
  const shorthand = trimmed.match(/^github:([^/]+)\/([^/]+)(?:\/([^/]+))?$/);
  if (shorthand) {
    return {
      kind: "github",
      owner: shorthand[1],
      repo: shorthand[2],
      skillName: shorthand[3],
    };
  }

  return null;
}
