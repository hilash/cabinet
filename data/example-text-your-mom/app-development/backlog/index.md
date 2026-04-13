---
title: Backlog
created: '2026-04-11T00:00:00Z'
modified: '2026-04-13T00:00:00Z'
tags:
  - product
  - backlog
---
# Backlog

## Top Backlog Themes

- Import contacts with less hesitation
- Make first reminder setup emotionally safe
- Improve follow-up suggestions after a missed reply
- Reduce notification fatigue without reducing follow-through

---

## P1: Onboarding v2

PRD: [[prds/onboarding-v2]]

| ID | Story | Size | Status |
| --- | --- | --- | --- |
| OB-1 | Pick Your People — manual name entry for 1-3 contacts, no permissions needed | M | Ready |
| OB-2 | Emotional reminder framing — warm copy, no productivity language | S | Ready |
| OB-3 | Delayed permission requests — show value before asking for notifications/contacts | M | Ready |
| OB-4 | First reminder preview card — show what the nudge will look like before confirming | M | Ready |
| OB-5 | Fix imported contact nickname display in setup | S | Ready |
| OB-6 | Onboarding analytics — events at each step to measure new drop-offs | S | Ready |
| OB-7 | A/B test harness — 20% holdback on current flow vs v2 | M | Ready |

## P2: Smarter Reminder Timing

PRD: [[prds/smarter-reminder-timing]]

| ID | Story | Size | Status |
| --- | --- | --- | --- |
| RT-1 | Smart delivery windows — learn from app-open patterns, shift reminders to active hours | L | Ready |
| RT-2 | Adaptive frequency — suppress reminders for recently-contacted people, widen on dismissal | M | Ready |
| RT-3 | Nudge copy rotation — 20+ variants per relationship type, never repeat back-to-back | M | Ready |
| RT-4 | Fix "Reminder sent 2 hours late" critical bug | M | Blocked (must fix before RT-1) |
| RT-5 | Quiet hours enforcement — no reminders 10 PM-7 AM unless user opts in | S | Ready |
| RT-6 | Delivery health monitoring dashboard | S | Ready |

## P3: Relationship Streak Logic

PRD: [[prds/relationship-streaks]]

| ID | Story | Size | Status |
| --- | --- | --- | --- |
| SK-1 | Forgiving streak windows — 1-day grace, pause after 2 days, reset after 7 | M | Ready |
| SK-2 | Fix "Streak resets after timezone change" — UTC-based calculation | M | Blocked (must fix before SK-3) |
| SK-3 | Streak milestones — celebratory cards at 7, 14, 30, 60, 100 days | M | Ready |
| SK-4 | Streak visibility — flame icon + day count on home screen | S | Ready |
| SK-5 | Streak recovery — resume from pause with "welcome back" animation | S | Ready |
| SK-6 | Timezone edge case test suite (DST, date-line crossings) | S | Ready |

## P4: Paid Conversion Clarity

PRD: [[prds/paid-conversion-clarity]]

| ID | Story | Size | Status |
| --- | --- | --- | --- |
| PC-1 | Value-triggered paywall — show after first "I texted them" or 7-day streak | M | Ready |
| PC-2 | Clear benefit copy — 3 concrete examples with illustrations | M | Ready |
| PC-3 | Fix "Trial paywall dismiss button clipped on small screens" | S | Ready |
| PC-4 | Soft inline upgrade nudges — contextual, max once per session | M | Ready |
| PC-5 | Transparent pricing — upfront monthly/annual, explicit trial terms | S | Ready |
| PC-6 | Paywall A/B test — benefit-focused vs current "Unlock Premium" | M | Ready |
| PC-7 | Paywall analytics — impression, trigger type, dismiss, convert per variant | S | Ready |

## Bug Fixes (Cross-cutting)

| Bug | Severity | Blocks | Status |
| --- | --- | --- | --- |
| Reminder sent 2 hours late | Critical | RT-1 | Investigating (CTO owned, Apr 13) |
| Streak resets after timezone change | High | SK-3 | Investigating (root cause documented, Apr 13) |
| Trial paywall dismiss button clipped | High | PC-1 | Open |
| Imported contact nickname not shown | Medium | OB-5 | Open |
| Reply suggestion card flickers on refresh | Low | — | Backlog |
