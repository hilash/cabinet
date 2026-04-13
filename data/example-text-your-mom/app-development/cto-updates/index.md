---
title: CTO Updates
created: '2026-04-13T00:00:00Z'
modified: '2026-04-13T00:00:00Z'
tags:
  - engineering
  - cto
  - updates
order: 2
---
# CTO Updates

Technical assessments and engineering direction for Text Your Mom.

---

## April 13, 2026 — First Technical Assessment

### State of Play

I reviewed every PRD, the full backlog, the KPI dashboard, the CEO and COO updates, and the release checklist. Here is the engineering picture.

**The good:** Planning quality is excellent. All four PRDs have clear acceptance criteria, technical considerations, and success metrics. The dependency chain (P1 -> P2 -> P3 -> P4) is correct. The backlog is groomed and sized. The team can start building tomorrow.

**The problem:** Nothing is moving. All 26 stories are "Ready." Zero are "In Progress." Two critical bugs have no owner. The engineering team has a fully loaded gun sitting on the table and nobody has picked it up.

---

### Critical Bug Assessment

#### RT-4: Reminder sent 2 hours late (Critical, Open, UNOWNED)

**Why this matters:** This bug undermines the core promise of the app. A reminder that arrives 2 hours late teaches the user that the app cannot be trusted. The strategy says "product quality matters because reminders are intimate; one annoying bug can destroy trust." This bug is that bug.

**Likely root cause (hypothesis):** Based on the PRD's technical note, this is almost certainly a background task scheduling issue. On iOS, `BGTaskScheduler` has no guaranteed execution time — the OS can delay background tasks based on battery state, app usage patterns, and system load. On Android, `WorkManager` has similar constraints with Doze mode. A 2-hour delay is consistent with both.

**Investigation plan:**
1. Pull delivery logs — correlate late reminders with device OS version, battery state, and time of day
2. Check if the delay is consistent (always ~2h) or variable — consistent suggests a scheduling window issue, variable suggests OS throttling
3. Determine whether we are using exact alarms (Android `AlarmManager.setExactAndAllowWhileIdle`) or inexact background work
4. On iOS, check if we are using `BGAppRefreshTask` (unreliable for time-sensitive work) vs. push notification triggers

**Recommended fix direction:** Time-sensitive reminders should NOT depend on background task execution. They should be server-triggered push notifications with the server owning the schedule. The device should receive the push, not generate the reminder locally. This is a meaningful architecture change but it is the only reliable path.

**I am taking ownership of this investigation.** Will document findings as they develop.

#### SK-2: Streak resets after timezone change (High, Investigating)

**Why this matters:** This blocks the entire P3 streak initiative. It also signals a deeper problem — if streak calculations use local time, there will be edge cases forever.

**Likely root cause:** The streak logic is comparing local dates rather than UTC timestamps. When a user changes timezones, the "current day" shifts, creating a gap that the system interprets as a missed day.

**Fix approach:** The PRD already specifies the right answer: all streak calculations in UTC. Store `last_contact_utc`, compute streak windows in UTC, and only convert to local time for display on the client. This is a data model fix + migration, not a UI fix.

**Estimated effort:** M-sized story. The fix itself is straightforward but needs thorough testing — DST transitions, date-line crossings, and mid-day timezone changes. Story SK-6 (timezone edge case test suite) should ship alongside SK-2, not after it.

#### PC-3: Trial paywall dismiss button clipped (High, Open)

**Why this matters:** Less urgent (P4 is last in sequence) but it is a trust issue. Users who cannot dismiss a paywall feel trapped. That violates App Store guidelines and our own principle of making free users feel valued.

**Likely fix:** The dismiss button is probably positioned with `position: fixed` or `absolute` at a coordinate that falls outside the viewport on short screens. Switch to a scrollable sheet with the dismiss button inside the scroll container. Small fix, someone should just do it this week.

---

### P1 Technical Readiness Review

The 7 onboarding stories are technically sound. A few notes:

**OB-3 (Delayed permission requests)** is the trickiest story. The acceptance criteria say "if the user declines a permission, the app continues gracefully with degraded functionality and a soft re-prompt later." This requires:
- A permission state machine separate from the onboarding state machine
- Graceful degradation paths for both notification and contacts permissions independently
- A re-prompt scheduler that respects iOS rate limits (iOS only allows one permission prompt per session — repeated calls silently fail)

This story should be sized as M/L, not M. Flag for the PM.

**OB-7 (A/B test harness)** needs a decision: client-side or server-side experiment assignment? Client-side is faster to ship but leaks if the user reinstalls. Server-side requires a user ID before onboarding completes. Recommendation: use the device ID for experiment assignment, persist the bucket server-side on first API call. Simple, reliable, no new infrastructure.

**OB-6 (Analytics events)** should be defined before OB-1 starts, not after. If we build the flow first and instrument it second, we risk missing the baseline measurement window. The analytics event schema should be agreed upon this week.

---

### Architectural Risk: Local-First Scheduling

The RT-4 bug reveals a systemic issue. Right now, reminder scheduling appears to be device-local. This means:
- Delivery depends on OS-level background task scheduling (unreliable)
- The server has no visibility into whether reminders were actually delivered
- There is no retry mechanism if a device is off or in Doze mode
- Delivery health monitoring (RT-6) is impossible without server-side data

**Recommendation:** Migrate reminder delivery to server-triggered push notifications. The server owns the schedule, fires the push at the right time, logs delivery status, and retries on failure. The device receives and displays — it does not decide when to remind.

This is not a P1 blocker. But it should be planned as infrastructure work during or right after P2, because the entire "smarter timing" initiative depends on reliable, observable delivery. Building adaptive timing on top of unreliable local scheduling is building on sand.

---

### Priorities This Week (Engineering)

| Priority | Action | Owner |
| --- | --- | --- |
| 1 | Move OB-1 and OB-2 to In Progress — start building | Engineering team |
| 2 | Define OB-6 analytics event schema | PM + Engineering |
| 3 | Begin RT-4 root cause investigation (in parallel with P1) | CTO |
| 4 | Fix PC-3 paywall dismiss button (quick win) | Any engineer, < 1 day |
| 5 | Decision: A/B test assignment approach for OB-7 | CTO + PM |

### Message to the Team

The planning is done. The PRDs are good. The dependency chain is clear. What we need now is velocity. Ship OB-1 and OB-2 this sprint. Investigate RT-4 in parallel. Fix the paywall button because it takes an hour and it matters. Do not wait for perfection — the A/B test exists so we can learn in production.

---
