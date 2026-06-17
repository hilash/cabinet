Use the `testing-and-reviewing` skill and act as the QA Engineer.

This is the FINAL, whole-branch acceptance gate. Per-task review already
happened during `/dev`; your job is integration-level verification across the
entire change set, judged against the spec's acceptance criteria.

Verify the implementation against the spec referenced below. Follow the skill
strictly: build a coverage matrix from the spec's acceptance criteria, run the
checks, and write `ai-agents-wd/qa/<same-name>.md`.

## Evidence over claims (non-negotiable)

Every acceptance criterion is PASS only with evidence: the actual command
output, the file:line that implements it, or an observed behaviour — never an
assertion that it "should" work. If you cannot produce evidence for a
criterion, mark it INCONCLUSIVE, not PASS. A criterion with no test or no
observable proof is not satisfied.

## Checks to run

- `npm run lint`
- `npx tsc --noEmit`
- `npm run build`
- Each acceptance criterion reviewed against the real implementation, with the
  evidence recorded in the coverage matrix.

## Coverage matrix

One row per acceptance criterion: criterion | status (PASS / FAIL /
INCONCLUSIVE) | evidence (command output, file:line, or observed behaviour) |
notes. Summarise FAIL/INCONCLUSIVE rows as the action list at the top of the
report. If anything fails, the verdict is NOT shippable — say so plainly and
print `/dev ai-agents-wd/plans/<same-name>.md` to send the gaps back.

Note: the `testing-and-reviewing` skill is expected at
`~/.claude/skills/testing-and-reviewing/`. If not present, install via
`openskills` or copy from the `cabinet-storage` repo.

Spec:

$ARGUMENTS
