# Cabinet-Root Skills for K8s Deployment

## Problem

Skills in the k8s Cabinet deployment are invisible. The `testing-and-reviewing` skill exists in `cabinet-storage/skills/testing-and-reviewing/` (i.e. `/data/skills/`) but Cabinet's skill discovery never scans that path. The `cabinet-root` origin resolves to `PROJECT_ROOT/.agents/skills/` (`/app/.agents/skills/`), and system-level paths (`~/.claude/skills/`) don't exist inside the container. As a result the Skills library shows nothing.

## Goal

Make the `testing-and-reviewing` skill (and any future globally-available skills) discoverable in the k8s Cabinet deployment by placing them at the `cabinet-root` origin — `.agents/skills/` in the cabinet app repo — so they are baked into the Docker image and always present regardless of PVC state.

## Non-goals

- Migrating room-scoped skills (cabinet-scoped origin) — not needed yet
- Adding new skills beyond `testing-and-reviewing`
- Changing how Cabinet resolves skills (the loader is correct; the content placement is wrong)
- Modifying `cabinet-storage` skill paths (the `skills/` dir there is effectively dead for in-app discovery)

## User stories

1. As a Cabinet user in the k8s deployment, I can open the Skills library and see `testing-and-reviewing` listed and available to attach to agents.
2. As a developer, when I add a skill bundle to `.agents/skills/` in the cabinet app repo, it is automatically available in the next Docker image build with no PVC changes required.

## Acceptance criteria

1. Given the cabinet container is running, when I open the Skills library, then `testing-and-reviewing` appears in the list with its name and description from `SKILL.md`.
2. Given `.agents/skills/testing-and-reviewing/` exists in the cabinet app repo, when `docker build` runs, then the skill bundle is present at `/app/.agents/skills/testing-and-reviewing/` inside the image.
3. Given `cabinetRootSkillsDir()` returns `path.join(PROJECT_ROOT, ".agents", "skills")`, when the skill loader runs, then it finds the bundle at that path and returns it with `origin: "cabinet-root"`.
4. Given the skill is at `cabinet-root` origin, when a user attaches it to an agent, then it is writable/editable (not read-only).
5. Given `cabinet-storage/skills/` currently holds the skill bundle, when this work is complete, the duplicate in cabinet-storage is removed or noted as redundant to avoid confusion.

## Out of scope / deferred

- Automating sync of skills from cabinet-storage into the image (future: skill import API)
- Room-scoped skills in cabinet-storage
- System-level skill paths in the container (`/agent-state/.claude/skills/`)

## Open questions

- None — path resolution confirmed from source code.

## Assumptions

- `PROJECT_ROOT = process.cwd() = /app` in the container (confirmed from Dockerfile `WORKDIR /app`).
- The `.dockerignore` does not exclude `.agents/` — needs verification.
- The skill bundle structure is `SKILL.md` at the bundle root; sub-dirs (`references/`, `scripts/`, `assets/`) are optional.
