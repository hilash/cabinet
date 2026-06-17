Implement the plan referenced below, acting as the orchestrating Developer.

You coordinate the work; you do NOT pour the whole plan into one context.
Substantial tasks are delegated to implementer subagents with precisely
constructed briefs, then gated by a reviewer before they count as done.

## 0. Load context (once)

Read end-to-end: `ai-agents-wd/specs/<name>.md`, `ai-agents-wd/plans/<name>.md`,
and `CLAUDE.md` for repo conventions. Then read `PROGRESS.md` — it is the
durable ledger. Any task already recorded there as complete is DONE; do not
re-implement it. This makes a restarted/compacted run idempotent.

## 1. Per-task loop

Work through the plan's task breakdown. Independent tasks may run in parallel.

For each not-yet-complete task:

- **Trivial/mechanical task** (one small edit, no design judgement): do it
  inline, run the relevant check, record it. Don't pay subagent overhead.
- **Substantial or independent task**: dispatch an **implementer subagent**.
  Construct its brief from scratch — task goal, the exact file paths it touches,
  the interfaces/contracts from the plan, and the key rules below. Do NOT hand
  it your session history; give it exactly what it needs and nothing else.
  Prefer a cheaper model for mechanical work, a capable one for design-heavy
  work; state the model explicitly.

  The implementer: implements, runs `npm run lint` + `npx tsc --noEmit` on what
  it touched, self-reviews against the key rules, and reports back DONE,
  DONE_WITH_CONCERNS, NEEDS_CONTEXT, or BLOCKED (with evidence — command output,
  not claims).

## 2. Per-task review gate

After each substantial task, before moving on, review the task's diff against
two bars — **spec compliance** AND **code quality / key-rule conformance**.
Use the `testing-and-reviewing` skill scoped to that task's diff, or dispatch a
separate reviewer subagent (separate from the implementer — no marking your own
homework). Both bars must pass. If issues are found, dispatch a fix (or fix
inline for small ones) and re-review. Record only Critical/Important findings
as fix work; note Minor ones in `PROGRESS.md` and move on.

## 3. Record and continue

Append the completed task to `PROGRESS.md` with its task id from the plan, so a
later restart skips it. Then continue. **Do not pause to check in between
tasks** — execute the whole plan — UNLESS a step is irreversible or
outward-facing (data deletion, a push, an external call) or the plan is
genuinely ambiguous; surface those.

## Cabinet key rules (enforce at all times — see `CLAUDE.md` for the full list)

- No database — all content lives as files under `data/`.
- shadcn/ui uses base-ui, NOT Radix — no `asChild` on triggers.
- No em-dashes in any user-facing string or copy.
- TypeScript strict — no `any`, no suppressed type errors.
- Path traversal prevention — all resolved paths must start with DATA_DIR.
- App Router conventions — server components by default; `"use client"` only
  where interactivity requires it; API routes under `src/app/api/`.

## When all tasks are complete

Do a final whole-branch pass for cross-task integration issues, then stop and
print: `/qa ai-agents-wd/specs/<name>.md` for the final acceptance review.

Plan:

$ARGUMENTS
