---
title: Roadmap
created: '2026-04-11T00:00:00Z'
modified: '2026-04-13T00:00:00Z'
tags:
  - product
  - roadmap
---
# Roadmap

## Principle

Every roadmap item should make it easier to keep one tiny human promise.

---

## Current Priorities

| # | Initiative | Status | PRD | Stories | Key Metric |
| --- | --- | --- | --- | --- | --- |
| P1 | Onboarding v2 | In Progress | [[prds/onboarding-v2]] | 7 stories | Activation 41% -> 55% |
| P2 | Smarter reminder timing | PRD Ready | [[prds/smarter-reminder-timing]] | 6 stories | Act-on rate 18% -> 30% |
| P3 | Relationship streak logic | PRD Ready | [[prds/relationship-streaks]] | 6 stories | 7-day streaks 22% -> 40% |
| P4 | Paid conversion clarity | PRD Ready | [[prds/paid-conversion-clarity]] | 7 stories | Conversion 3.5% -> 5% |

## Execution Order and Dependencies

```
P1 Onboarding v2  ──────────────────►  P2 Smarter Timing
                                             │
                                             ▼
                                        P3 Streaks  ───►  P4 Paid Conversion
```

- **P1 first:** Users need to set up contacts before timing or streaks matter
- **P2 before P3:** Better timing helps users maintain streaks naturally
- **P3 before P4:** Streak milestones are a paywall trigger for P4

## Critical Bugs Blocking Progress

| Bug | Severity | Blocks |
| --- | --- | --- |
| Reminder sent 2 hours late | Critical | P2 (CTO investigating — likely local scheduling issue) |
| Streak resets after timezone change | High | P3 (root cause: local time comparison, fix: UTC migration) |
| Paywall dismiss button clipped on small screens | High | P4 (must fix before new paywall) |

## Sprint Suggestion: First Sprint

Focus: **P1 Onboarding v2** (7 stories, estimated 2-3 week sprint)

1. OB-1: Pick Your People flow (M)
2. OB-2: Emotional copy rewrite (S)
3. OB-3: Delayed permission requests (M)
4. OB-4: First reminder preview card (M)
5. OB-5: Fix nickname display bug (S)
6. OB-6: Onboarding analytics events (S)
7. OB-7: A/B test harness (M)

Parallel: Start investigating the "Reminder sent 2 hours late" bug (RT-4) so P2 is unblocked when P1 ships.

## Full Backlog

See [[backlog]] for all 26 stories and 5 bugs across all initiatives.
