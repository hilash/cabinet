---
title: Operating Reviews
created: '2026-04-12T00:00:00Z'
modified: '2026-04-12T00:00:00Z'
tags:
  - operations
  - coo
  - weekly-review
order: 6
---
# Operating Reviews

Weekly execution health reviews from the COO. Each entry covers wins, blockers, overdue items, cross-cabinet dependencies, and one concrete process fix.

---

## Week of April 12, 2026

**Reviewed by:** COO
**Scope:** Root cabinet + app-development, marketing/tiktok, marketing/reddit child cabinets

---

### Wins

1. **PRD coverage is complete.** All four priorities (P1–P4) have finished PRDs with acceptance criteria, success metrics, and sequencing notes. The team knows exactly what to build and in what order. This is rare at this stage.

2. **Backlog is groomed and sized.** 26 stories and 5 bugs are documented, sized (S/M/L), and sequenced. There is nothing blocking the product team from picking up work right now — the planning is done.

3. **CEO made a frank public assessment.** The April 12 CEO update is honest about the 50K MAU gap and sets clear conditions for success (marketing activation, P1 shipping in 3 weeks, content volume by end of April). Leadership alignment is solid.

4. **Dependency chain is explicit.** P1 → P2 → P3 → P4 is clearly documented with the bug prerequisites that gate each phase. No one should be guessing about sequence.

5. **Agent infrastructure is installed.** All cabinets have agents assigned. The tooling is ready. The work is not.

---

### Blockers

| # | Blocker | Severity | Who Is Stuck | What Gets Unblocked |
| --- | --- | --- | --- | --- |
| B1 | Both marketing cabinets paused — no content being produced | Critical | Growth (MAU target) | TikTok posts, Reddit engagement, CAC reduction |
| B2 | RT-4 ("Reminder sent 2 hours late") has no assigned owner | Critical | P2, P3, P4 in sequence | Smart timing, streak logic, paid conversion |
| B3 | P1 stories not started — all 7 show "Ready," none "In Progress" | High | Activation rate (41% → 55%) | Onboarding v2 ships, P2 can begin |
| B4 | SK-2 ("Streak resets after timezone change") investigating with no findings documented | Medium | P3 streak UI work | SK-3, SK-4, SK-5 |
| B5 | No Reddit → TikTok insight handoff process | Medium | Content quality | Scripts grounded in real user language |

**Highest-leverage unblock:** Activate the TikTok cabinet this week. It requires a decision, not engineering work. Every week it stays paused narrows the window to hit 50K MAU.

---

### Overdue Items

| Item | Originally Due | Status |
| --- | --- | --- |
| Activate TikTok cabinet — first content briefs | This week (CEO April 12) | Not started |
| Activate Reddit cabinet — begin monitoring | This week (CEO April 12) | Not started |
| Assign RT-4 root cause investigation | This week (CEO April 12) | No assignee |
| Move OB-1 (Pick Your People) to In Progress | This week (CEO April 12) | Still "Ready" |
| Move OB-2 (Emotional copy rewrite) to In Progress | This week (CEO April 12) | Still "Ready" |

Everything on this list was called out in the CEO's April 12 update as a this-week action. As of this review, none of them show any progress signal in the KB.

---

### Cross-Cabinet Handoff Risks

**App-development → Marketing**
Marketing is paused partly because there is no product activation improvement to talk about yet. But marketing cannot wait for P1 to ship before generating volume — content takes time to compound. The right call: marketing starts now with the current product story ("reply before the guilt spiral") and updates messaging as activation data comes in. These should not be sequenced.

**Reddit → TikTok**
Reddit's job is to surface the language real users use. TikTok's job is to turn that language into relatable scripts. No handoff mechanism exists between the two cabinets. Right now, TikTok would write scripts blind and Reddit would capture insights that never reach creative. A simple weekly note from the Reddit researcher to the TikTok script writer would fix this.

**CTO → Product Manager**
RT-4 findings need to reach the PM before P2 sprint planning can begin. The current structure has no documented handoff. If the CTO's team discovers the root cause, that information may sit in a conversation or a commit message and never update the roadmap. The backlog needs a `Notes` column (or a linked investigation log) for bugs that are actively being root-caused.

---

### Process Fix: Replace "Ready" with Explicit Status

**The problem:** Every backlog story is currently in "Ready" status, which means "we could work on this" — but it is indistinguishable from "no one has started yet." The CEO cannot tell from the backlog whether OB-1 has been picked up. The COO cannot tell without asking someone.

**The fix:** This week, change the status vocabulary to four values:

| Status | Meaning |
| --- | --- |
| Ready | Groomed and ready to pick up |
| In Progress | Someone is actively working on it |
| Blocked | Work started but stuck — reason documented |
| Done | Shipped |

Update the backlog table headers. Update each story that has been touched. This takes 10 minutes and makes the weekly operating review instant instead of a detective exercise. The single most valuable operational data point is: **are the P1 stories moving?** Right now the KB cannot answer that question.

---

### Job Configuration Issue (Flag for This Week)

The `.jobs/weekly-operating-review.yaml` is routed to `agentSlug: cfo`. The CFO's job is financial modeling and runway — not execution health. The COO should own this job. Similarly, `monthly-runway-review.yaml` routes to `agentSlug: cto` but belongs with the CFO.

Recommend correcting both job files so each review runs with the right agent and the right lens.

| Job | Current Agent | Should Be |
| --- | --- | --- |
| weekly-operating-review | cfo | coo |
| monthly-runway-review | cto | cfo |
| weekly-executive-brief | cto | ceo |

---

### Summary Scorecard

| Area | Status | Trend |
| --- | --- | --- |
| Product execution | Ready but not moving | Needs immediate kickoff |
| Marketing (TikTok) | Installed, paused | Overdue to activate |
| Marketing (Reddit) | Installed, paused | Overdue to activate |
| Bug triage | 2 critical open, 0 assigned | Deteriorating |
| Cross-cabinet coordination | No handoff process | Risk building |
| MAU trajectory | 18,400 → 50,000 in 10 weeks | Off track unless marketing activates |

**Bottom line:** The strategy is sound and the plans are solid. The constraint right now is motion, not ideas. Every day that marketing stays paused and P1 stories stay unstarted is a day the Q2 target gets harder to defend.

---
