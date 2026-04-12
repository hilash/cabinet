---
title: Smarter Reminder Timing PRD
created: '2026-04-12T00:00:00Z'
modified: '2026-04-12T00:00:00Z'
tags:
  - prd
  - reminders
  - notifications
  - roadmap-p2
---
# Smarter Reminder Timing PRD

**Status:** Ready for Engineering | **Priority:** P2 | **Owner:** Product Manager + CTO

## Problem

Reminders currently fire on a fixed schedule chosen during setup. This creates two failure modes:

1. **Bad timing** — a reminder at 7 AM on a Saturday feels robotic, not caring
2. **Notification fatigue** — repeated reminders at the same cadence get ignored, then swiped, then the app gets muted

The KPI watchout confirms this: "Retention drops when reminders feel repetitive." The critical bug "Reminder sent 2 hours late" compounds the problem — when a reminder finally arrives and it's also badly timed, trust collapses.

## Goal

Make reminders feel like they arrive at the right moment — when the user is likely to act on them — so the app feels like a thoughtful friend, not a cron job.

## Principles

- A well-timed reminder is worth five poorly-timed ones
- Fewer, better nudges beat a fixed schedule
- The user should never wonder "why is the app bugging me right now?"

## User Stories

### US-1: Smart Delivery Windows
**As a** user, **I want** reminders to arrive when I'm likely to act on them **so that** they feel helpful instead of interruptive.

**Acceptance criteria:**
- System learns from when the user typically opens the app and sends messages
- Reminders shift toward the user's active windows (e.g., lunch break, evening wind-down)
- User can still set a hard preference ("always remind me in the evening") that overrides learning
- Never deliver reminders between 10 PM and 7 AM local time unless the user explicitly opts in

### US-2: Adaptive Frequency
**As a** user, **I want** the app to ease off when I've been responsive **so that** I don't get nagged about people I'm already talking to.

**Acceptance criteria:**
- If the user has contacted a person in the last 48 hours, suppress the next reminder for that person
- If the user dismisses a reminder twice in a row for the same person, widen the interval by 1.5x
- If the user acts on a reminder within 5 minutes, tighten the interval slightly (signal of good timing)

### US-3: Contextual Nudge Copy
**As a** user, **I want** the reminder text to vary **so that** it doesn't feel like the same notification every time.

**Acceptance criteria:**
- Maintain a pool of 20+ nudge copy variants per relationship type (parent, friend, sibling, partner)
- Rotate copy so the same text never appears twice in a row
- Copy should reference time since last contact when relevant: "It's been about a week since you talked to Dad"

### US-4: Delivery Reliability
**As a** user, **I want** reminders to arrive on time **so that** I can trust the app.

**Acceptance criteria:**
- Fix critical bug: "Reminder sent 2 hours late"
- Reminders must fire within a 5-minute window of the scheduled time
- If delivery fails, retry once within 15 minutes and log the failure
- Surface delivery health in an internal monitoring dashboard

## Technical Considerations

- **Delivery window model:** Start simple — track last 14 days of app-open timestamps, compute 2-hour buckets, pick the most active bucket. No ML needed initially.
- **Suppression logic:** Check outgoing message log (if accessible) or app-initiated "I texted them" taps to determine recent contact
- **Copy rotation:** Store `last_nudge_variant_id` per contact, select next from pool excluding it
- **Late delivery bug:** Likely a background task scheduling issue (iOS BGTaskScheduler or Android WorkManager). Investigate and fix as a prerequisite.

## Success Criteria

| Metric | Current | Target |
| --- | --- | --- |
| Reminder act-on rate | ~18% | 30% |
| Notification dismiss rate | ~45% | Under 30% |
| "Reminders feel repetitive" (survey) | 38% agree | Under 15% |
| Week-4 retention | 28% | 32%+ |
| Late delivery incidents | ~12/week | Under 1/week |

## Dependencies

- Fix "Reminder sent 2 hours late" bug (Critical, Open) before shipping adaptive timing
- Onboarding v2 ships first (users need to set up contacts before timing matters)

## Related

- [[roadmap]] — Priority #2
- Bug: "Reminder sent 2 hours late" (Critical, Open)
