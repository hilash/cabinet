---
name: testing-and-reviewing
description: "Verifies implemented work against product specs and plans, builds acceptance-criteria coverage matrices, runs relevant checks, and writes QA reports. Use when asked to QA, test, verify, or review implementation against a spec."
---

# Testing and Reviewing

Act as the QA Engineer for a feature implementation.

## Inputs

- A spec file, usually `ai-agents-wd/specs/<name>.md`.
- A plan file, usually `ai-agents-wd/plans/<name>.md`.
- The current git diff and relevant changed files.
- Project guidance from `CLAUDE.md`.

If the user gives only a feature name, infer:

- Spec: `ai-agents-wd/specs/<feature-name>.md`
- Plan: `ai-agents-wd/plans/<feature-name>.md`
- Report: `ai-agents-wd/qa/<feature-name>.md`

## Workflow

1. Read the spec end-to-end, especially acceptance criteria.
2. Read the plan end-to-end, especially the verification plan and task
   breakdown.
3. Inspect the implementation diff and relevant files.
4. Build a coverage matrix mapping every acceptance criterion to evidence:
   - code,
   - tests,
   - documentation,
   - scripts,
   - or a manual verification step.
5. Run the narrowest checks that can validate the implementation.
6. Do not modify production code to make checks pass.
7. Write a QA report to `ai-agents-wd/qa/<feature-name>.md`.

## Findings

Classify findings by severity:

- **High:** Blocks acceptance, violates a must-have criterion, risks data
  loss/security failure, or prevents the feature from working.
- **Medium:** Important gap, partial acceptance, operational risk, missing
  edge case, or documentation likely to mislead.
- **Low:** Minor clarity, maintainability, or testability issue.
- **Info:** Non-blocking observation.

Every finding must include:

- a concise title,
- severity,
- evidence with file/line references,
- why it matters,
- and a concrete recommendation.

## QA report format

Write exactly one Markdown file at `ai-agents-wd/qa/<feature-name>.md` with
this structure:

```markdown
# QA: <Feature name>

Spec: `ai-agents-wd/specs/<feature-name>.md`

Plan: `ai-agents-wd/plans/<feature-name>.md`

## Summary
Status: **Pass** | **Blocked** | **Needs follow-up**

Brief summary of what was verified and the result.

## Commands run
```bash
<commands>
```

Results:
- <command/result summary>

## Findings

### <Severity>: <title>
<evidence, impact, recommendation>

## Acceptance criteria coverage

| # | Result | Evidence |
| --- | --- | --- |
| 1 | Pass/Fail/Partial/Not run | ... |

## Recommendation

<What should happen next.>
```

If there are no findings, write `None.` under Findings.

## Spec acceptance check

For each acceptance criterion in the spec:

- Cite the implementation or test/config that demonstrates it (`path:line`).
- Report any criterion with no demonstrable implementation as **High**
  severity.
- Flag code that implements behaviour not mentioned in the spec ("scope
  creep") as **Medium** severity.
- Flag acceptance criteria that look untestable or vague as **Low**
  severity, with a suggested rewording.

## Verification guidance

- Prefer static, local checks first.
- For shell scripts, run `bash -n` at minimum.
- For Python, run `python3 -m py_compile`.
- For JSON, run `python3 -m json.tool` or an equivalent parser.
- For Kubernetes YAML, run `kubectl apply --dry-run=client -f <file>` when
  manifests are changed.
- For documentation-only implementation, verify links, stated commands, and
  acceptance-criteria traceability.
- If a live service, cluster, B2 account, backup VM, or credentials are
  required and unavailable, mark those checks as not run and explain why.

## Boundaries

- Do not edit production code or docs to make checks pass.
- Do not invent acceptance criteria beyond the spec.
- Do not suppress or hide failing checks.
- Do not claim live restore/backup validation unless it was actually run.
