---
title: 'Sprint: Week of April 14'
created: '2026-04-13T00:00:00Z'
modified: '2026-04-13T00:00:00Z'
tags:
  - sprint
  - planning
  - devops
order: 1
---
# Sprint Plan: Week of April 14, 2026

**Author:** DevOps Engineer
**Sprint window:** April 14 -- April 18
**Sprint goal:** Start shipping P1, fix the trust-breaking bugs, unblock P2 investigation.

---

## Situation

All 26 backlog stories sit in "Ready." Zero are in progress. The CEO has flagged that P1 story velocity is a leading indicator being watched weekly. The CFO has called out that our effective CAC per paying user is ~$223 -- retention and activation improvements are not nice-to-haves, they are financial survival. The CTO has taken ownership of RT-4 investigation and declared "the planning is done, what we need now is velocity."

From a DevOps standpoint, three things worry me:

1. **No delivery pipeline has been exercised.** Nothing has shipped. We have a release checklist but no evidence it has ever been run. First releases always surface process gaps -- better to find them on a small story than on the full onboarding rewrite.
2. **The RT-4 bug reveals an architecture gap in observability.** Reminders are scheduled locally on-device. We have no server-side delivery logs, no retry mechanism, and no way to build RT-6 (delivery health monitoring) without a server-side component. This is the biggest technical risk on the roadmap.
3. **No rollback plan exists for onboarding changes.** OB-7 gives us an A/B harness, but it ships at the end of the sprint. If we ship OB-1 without the harness and activation drops, we need a feature flag or a fast revert path. This should be decided before code lands.

---

## Top Priorities

### Tier 1: Ship this week (high confidence)

| # | Story | Size | Why this week |
| --- | --- | --- | --- |
| 1 | **OB-2: Emotional copy rewrite** | S | Zero code risk, pure copy change. Gets something shipped and exercises the release pipeline. Should be first to merge. |
| 2 | **OB-6: Onboarding analytics events** | S | CTO flagged: analytics schema must be defined *before* building the new flow, not after. If we build OB-1 first and instrument second, we lose baseline measurement. |
| 3 | **OB-5: Fix nickname display bug** | S | Small fix, improves onboarding polish, unblocks a known irritant. Ships with the analytics instrumentation. |
| 4 | **PC-3: Fix paywall dismiss button** | S | CTO estimate: < 1 day. Trust issue -- users who cannot dismiss a paywall feel trapped. App Store risk. Quick win. |

**Estimated capacity used:** 4 S-sized stories = ~4 days of focused work.

### Tier 2: Start this week, finish next week

| # | Story | Size | Why start now |
| --- | --- | --- | --- |
| 5 | **OB-1: Pick Your People flow** | M | The centerpiece of P1. Start building after OB-6 analytics schema is agreed so we instrument from day one. |
| 6 | **OB-3: Delayed permission requests** | M | CTO flagged this should be M/L, not M. Needs a permission state machine separate from onboarding state. Start design work and spike this week. |

### Tier 3: Parallel investigation (no story points, risk mitigation)

| # | Item | Owner | Why now |
| --- | --- | --- | --- |
| 7 | **RT-4: "Reminder sent 2 hours late" root cause** | CTO | Critical bug that blocks P2. CTO has already taken ownership. This week: pull delivery logs, determine if delay is consistent or variable, identify whether the fix is local (exact alarms) or architectural (server-side push). |
| 8 | **OB-7 A/B assignment decision** | CTO + PM | Client-side vs server-side experiment assignment. CTO recommends device ID bucketing with server-side persistence. Needs a decision before OB-7 can be built. No code this week, just agreement. |

---

## What to Defer

| Story | Why defer |
| --- | --- |
| **OB-4: First reminder preview card (M)** | Depends on OB-1 being built. Queue for next sprint. |
| **OB-7: A/B test harness (M)** | Needs the A/B assignment decision first (Tier 3 above). Build next sprint once the decision is locked. |
| **All P2 stories (RT-1 through RT-6)** | Blocked by RT-4 investigation. P2 cannot start until the scheduling architecture is understood. |
| **All P3 stories** | Blocked by SK-2 (timezone bug) and by P2 dependency chain. |
| **All P4 stories** | Depends on P1 and P3 shipping first. Furthest out. |
| **SK-2: Streak timezone fix** | Important but P3 is not this sprint's focus. Flag for the sprint after P1 ships. |
| **Reply suggestion flicker (Low)** | Cosmetic. Backlog indefinitely. |

---

## Risk Mitigation (Not Feature Work)

These are items that carry release-process or reliability risk. They are not user stories but they must happen.

### 1. First release dry run

**What:** Ship OB-2 (copy change) through the full release pipeline -- build, QA checklist, staged rollout, monitoring confirmation. Treat it as a dress rehearsal.

**Why:** We have never shipped a release from this backlog. The release checklist exists on paper but has never been tested against reality. A copy-only change is the safest possible first release. Any pipeline gaps (signing, distribution, monitoring thresholds) surface here, not on OB-1.

**Action:** After OB-2 merges, run the full release checklist. Document any steps that are missing or unclear. Update the checklist.

### 2. Rollback strategy for P1

**What:** Decide how we revert onboarding changes if activation drops after shipping OB-1.

**Options:**
- Feature flag: new onboarding behind a flag, kill switch if metrics drop
- Fast revert: revert the commit and push a hotfix build
- Wait for OB-7: the A/B harness gives us a holdback group, but it ships later

**Recommendation:** Feature flag for OB-1. The A/B harness (OB-7) gives us proper measurement, but we need a kill switch before we have measurement. A feature flag costs an hour of work and buys us a safe revert path.

### 3. RT-4 investigation output format

**What:** CTO's RT-4 investigation should produce a written finding this week -- even if the fix is not done.

**Why:** The entire P2 initiative depends on the answer. If the fix is "use exact alarms," it is a bounded M-sized story. If the fix is "migrate to server-side push," it is a multi-sprint architecture project that changes the P2 timeline. The team needs to know which one by end of week.

**Action:** CTO to document findings in [[cto-updates]] by Friday. DevOps to review for deployment and monitoring implications.

### 4. Monitoring for first release

**What:** Confirm that basic monitoring thresholds exist before OB-2 ships.

**Checklist:**
- [ ] Crash rate alerting configured
- [ ] Onboarding funnel drop-off tracking live (dependent on OB-6)
- [ ] Reminder delivery success rate visible (may be blocked by RT-4 findings)
- [ ] App Store review queue turnaround estimated

---

## Sprint Scorecard

Track at Friday standup:

| Metric | Target |
| --- | --- |
| Stories completed | 4 (OB-2, OB-5, OB-6, PC-3) |
| Stories started | 2 (OB-1, OB-3) |
| Release pipeline exercised | Yes/No |
| RT-4 root cause documented | Yes/No |
| OB-7 A/B decision made | Yes/No |
| Release checklist updated | Yes/No |

---

## DevOps Notes

This is a velocity sprint, not a feature sprint. The goal is to prove we can ship, surface process gaps, and build the muscle of weekly delivery. The actual user-facing impact of this sprint is small (copy change, bug fixes, analytics plumbing). That is the point. The expensive mistakes happen on the first release, not the fifth. Make the first release boring.

The RT-4 investigation is the highest-leverage single item on the board. Its outcome reshapes the P2 timeline and potentially the entire Q2 plan. Prioritize getting a clear technical answer this week, even if the fix takes longer.

Next week's plan should be built around: finish OB-1, start OB-4, build OB-7 if the A/B decision is locked, and scope the RT-4 fix based on this week's findings.
