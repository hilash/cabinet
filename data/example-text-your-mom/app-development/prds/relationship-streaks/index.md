---
title: Relationship Streak Logic PRD
created: '2026-04-12T00:00:00Z'
modified: '2026-04-12T00:00:00Z'
tags:
  - prd
  - streaks
  - retention
  - roadmap-p3
---
# Relationship Streak Logic PRD

**Status:** Ready for Engineering | **Priority:** P3 | **Owner:** Product Manager

## Problem

The app tracks "streaks" — consecutive periods where the user stays in touch with someone. But the current implementation is fragile and punishing:

- Streaks reset on timezone changes (known bug, High severity, under investigation)
- A single missed day kills a long streak with no forgiveness
- Streaks feel like a guilt mechanic rather than a celebration of consistency

The strategy says "retain users by making the app feel caring, not nagging." A streak system that punishes missed days does the opposite.

## Goal

Redesign streaks so they reward consistency without punishing life. A streak should feel like a warm record of showing up, not a fragile chain that breaks.

## Principles

- Streaks celebrate connection, not perfection
- Missing one day should not erase a month of showing up
- The UI should make streaks feel like a gift, not a threat

## User Stories

### US-1: Forgiving Streak Windows
**As a** user, **I want** my streak to survive a missed day **so that** the app feels fair when life gets busy.

**Acceptance criteria:**
- Streaks use a "grace period" of 1 calendar day — missing one day does not break the streak
- After 2 consecutive missed days, the streak pauses (not resets) and can be resumed
- A paused streak shows as "paused" in the UI with encouraging copy: "Pick back up anytime"
- Streaks only fully reset after 7+ consecutive days of no contact

### US-2: Timezone-Safe Streaks
**As a** user who travels, **I want** my streak to not break when I change timezones **so that** the app feels reliable.

**Acceptance criteria:**
- Streak windows are calculated in UTC and mapped to the user's current local timezone
- A timezone change mid-day does not create a "gap" that breaks the streak
- Fix existing bug: "Streak resets after timezone change"
- Add automated tests covering timezone edge cases (DST transitions, date-line crossings)

### US-3: Streak Milestones
**As a** user, **I want** to see milestones when I reach streak thresholds **so that** I feel good about staying in touch.

**Acceptance criteria:**
- Milestones at 7, 14, 30, 60, and 100 days
- Each milestone shows a celebratory card with the person's name and the streak count
- Copy is warm and specific: "You and Mom have been connected for 30 days. That matters."
- Milestones are not push notifications (they appear in-app to avoid fatigue)

### US-4: Streak Visibility
**As a** user, **I want** to see my streaks at a glance **so that** I know who I've been keeping up with.

**Acceptance criteria:**
- Home screen shows a compact streak indicator next to each person (flame icon + day count)
- Tapping a streak opens a detail view: start date, longest streak, current status
- Paused streaks show in a muted style, active streaks in a warm color
- No leaderboard or competitive framing — this is personal, not social

### US-5: Streak Recovery
**As a** user whose streak paused, **I want** an easy way to resume it **so that** I don't feel like I have to start over.

**Acceptance criteria:**
- When a user contacts someone after a pause, the streak resumes from where it left off
- A "Welcome back" micro-animation plays when a streak resumes
- The resumed streak shows total days connected (not just consecutive), with a note like "42 days connected, 3 day pause"

## Technical Considerations

- **Data model:** `streak { contact_id, start_date_utc, current_count, longest_count, status: active|paused|reset, last_contact_utc, grace_used: boolean }`
- **Timezone handling:** All streak calculations in UTC. Store user's current timezone offset and recalculate display values on the client. Never compare local dates server-side.
- **Grace period logic:** At end-of-day UTC check, if no contact logged and grace_used is false, set grace_used = true. If grace already used and another day passes, set status = paused.
- **Bug fix prerequisite:** The timezone bug must be fixed before shipping any streak UI changes.

## Success Criteria

| Metric | Current | Target |
| --- | --- | --- |
| Users with active 7+ day streak | ~22% | 40% |
| Streak-related churn events | ~8% of churners cite streaks | Under 2% |
| Week-4 retention | 28% | 33%+ |
| Timezone-related streak resets | ~200/week | 0 |

## Dependencies

- Fix "Streak resets after timezone change" bug before shipping
- Pairs well with Smarter Reminder Timing — adaptive reminders help users maintain streaks naturally

## Related

- [[roadmap]] — Priority #3
- Bug: "Streak resets after timezone change" (High, Investigating)
