# Plan: Cabinet-Root Skills for K8s Deployment

Spec: `ai-agents-wd/specs/cabinet-root-skills.md`

## Approach

Add the `testing-and-reviewing` skill bundle to the cabinet app repo at `.agents/skills/testing-and-reviewing/`, making it a `cabinet-root` origin skill baked into the Docker image.

`cabinetRootSkillsDir()` in `src/lib/agents/skills/loader.ts:25` resolves to `path.join(PROJECT_ROOT, ".agents", "skills")`. `PROJECT_ROOT = process.cwd()` which is `/app` in the container (confirmed: Dockerfile `WORKDIR /app`). So placing the bundle at `.agents/skills/testing-and-reviewing/` in the app repo puts it at `/app/.agents/skills/testing-and-reviewing/` inside the image — exactly where the loader looks.

The `.dockerignore` currently has `*.md` (root-only glob in Docker's Go `filepath.Match` semantics — does NOT cross `/`), so `SKILL.md` inside a subdirectory is already included in the build context. An explicit `!.agents/` exception is added anyway to make intent unambiguous and prevent future confusion.

`cabinet-storage/skills/testing-and-reviewing/` is at `/data/skills/` in the container — a path Cabinet's skill loader never scans. It is removed to eliminate the dead copy.

No code changes are required. The loader, trust gating, and skills API all work off the filesystem path at runtime — adding the bundle file is sufficient.

Rejected alternatives:
- **Mount skills via PVC** — adds operational complexity; skills would be lost if the PVC is recreated and require manual re-population.
- **System path (`/agent-state/.claude/skills/`)** — the `cabinet-agent-state` PVC is auth-only by design; mixing skills into it conflates two concerns and complicates the "never commit credentials" invariant.
- **Leave `cabinet-storage/skills/`** — the path is never scanned; keeping it creates a false impression that the skill is installed.

## Affected files

| Path | Repo | Change | Reason |
| --- | --- | --- | --- |
| `.agents/skills/testing-and-reviewing/SKILL.md` | `cabinet` (app) | new | Skill bundle at `cabinet-root` origin; baked into Docker image at `/app/.agents/skills/testing-and-reviewing/SKILL.md` |
| `.dockerignore` | `cabinet` (app) | edit | Add `!.agents/` exception to explicitly protect skill bundles from any future `*.md` glob changes |
| `skills/testing-and-reviewing/SKILL.md` | `cabinet-storage` | delete | Dead copy at `/data/skills/` — not a recognized discovery path; remove to avoid confusion |

## Interfaces / contracts

- **Skill bundle format**: `SKILL.md` at the bundle root with YAML frontmatter containing at minimum `name` and `description`. The loader reads these via `readOneSkill()` in `src/lib/agents/skills/loader.ts:225`. The `testing-and-reviewing` bundle has no `references/`, `scripts/`, or `assets/` sub-dirs — the single file is sufficient.
- **`cabinet-root` origin properties**: editable (not read-only), no `cabinetPath` scope, key = directory name (`testing-and-reviewing`). See `src/lib/agents/skills/loader.ts:192` and `src/lib/agents/skills/types.ts:6-10`.
- **Docker build context**: `.agents/` must not be excluded. After this change `.dockerignore` explicitly allows it via `!.agents/`.
- **No skills-lock.json update required**: `npm run skills:sync` reports drift but does not block; the lock file is a dev-time consistency check, not a runtime gate.

## Data / migration notes

- No PVC data is changed. cabinet-storage is git-backed; deleting the dead `skills/` dir from it will be committed and pushed, and the git-sync CronJob will propagate the deletion to the running pod's `/data` within 15 minutes (next sync cycle).
- The skill becomes available as soon as the new Docker image is deployed — no Cabinet restart script or manual step needed beyond the ArgoCD sync after the image push.

## Risks & mitigations

| Risk | Likelihood | Mitigation |
| --- | --- | --- |
| `.dockerignore` `*.md` glob excludes `SKILL.md` in subdirs | Low | Docker uses Go `filepath.Match`; `*` does not cross `/`, so the glob is root-only. Explicit `!.agents/` exception removes any ambiguity. |
| Future skills added to `.agents/skills/` accidentally excluded by a new `.dockerignore` rule | Low | The `!.agents/` exception makes the intent durable — any future exclusion rule must explicitly override it. |
| git-sync CronJob pushes a deletion of `skills/` that conflicts with in-flight Cabinet writes | Very low | `skills/testing-and-reviewing/SKILL.md` is static config, never written by Cabinet at runtime. No conflict possible. |
| `skills-lock.json` drift warning after adding the bundle | Low | Expected. Run `npm run skills:sync` if a clean lock file is needed; not a runtime blocker. |

## Task breakdown

Tasks 1 and 2 are independent and can be done in parallel. Task 3 (cabinet-storage cleanup) is independent of both. All three can be committed and pushed in any order; the image rebuild (triggered by the cabinet app push) is the gate for the skill becoming visible.

---

**Task 1 — Add skill bundle to cabinet app repo** *(independent)*

Files: `.agents/skills/testing-and-reviewing/SKILL.md`

Copy the `SKILL.md` from `cabinet-storage/skills/testing-and-reviewing/SKILL.md` verbatim. The content is already correct — no edits needed.

Done when: `.agents/skills/testing-and-reviewing/SKILL.md` exists in the cabinet app repo with valid frontmatter (`name`, `description`).

---

**Task 2 — Update `.dockerignore`** *(independent)*

Files: `.dockerignore`

Add `!.agents/` as an explicit exception after the existing `*.md` line. The updated block:

```
*.md
!README.md
!CLAUDE.md
!.agents/
```

Done when: `.dockerignore` contains `!.agents/` and no other rule excludes `.agents/skills/`.

---

**Task 3 — Remove dead skill copy from cabinet-storage** *(independent)*

Files: `cabinet-storage/skills/testing-and-reviewing/SKILL.md` (delete), `cabinet-storage/skills/` (remove dir if empty after deletion)

Done when: `skills/testing-and-reviewing/` no longer exists in the `cabinet-storage` repo and the deletion is committed and pushed.

---

## Verification plan

1. **File exists in app repo**: confirm `.agents/skills/testing-and-reviewing/SKILL.md` is present and has valid YAML frontmatter with `name` and `description`.
2. **`.dockerignore` is correct**: confirm `!.agents/` appears and no subsequent rule re-excludes it.
3. **Dead copy removed**: confirm `cabinet-storage/skills/` is empty or deleted.
4. **Skills library**: after image rebuild and ArgoCD sync, open Cabinet → Skills; confirm `testing-and-reviewing` appears with correct name and description.
5. **Origin check**: the skill should be listed as editable (not read-only) — confirming `cabinet-root` origin was resolved, not `system`/`legacy-home`.
