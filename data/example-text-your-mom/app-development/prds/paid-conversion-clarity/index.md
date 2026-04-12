---
title: Paid Conversion Clarity PRD
created: '2026-04-12T00:00:00Z'
modified: '2026-04-12T00:00:00Z'
tags:
  - prd
  - subscription
  - conversion
  - roadmap-p4
---
# Paid Conversion Clarity PRD

**Status:** Ready for Engineering | **Priority:** P4 | **Owner:** Product Manager + CFO

## Problem

Trial-to-paid conversion is 3.5% against a 5% target. Users don't clearly understand what they get by paying, and the paywall experience has UX issues:

- The value proposition on the paywall screen is vague ("Unlock Premium")
- The dismiss button is clipped on small screens (known bug, High severity)
- Users who haven't imported meaningful contacts rarely convert — they haven't experienced enough value
- The paywall appears at an arbitrary point, not tied to a moment of delight

KPI watchout: "Paid conversion is weak unless the user imports meaningful contacts quickly."

## Goal

Make the free-to-paid transition feel like a natural upgrade after the user has experienced real value, not a gate that blocks them before they care.

## Principles

- Show the paywall after a moment of delight, not frustration
- The paywall should make the user think "yes, I want more of this," not "ugh, another subscription"
- Free users should feel valued, not punished

## User Stories

### US-1: Value-Triggered Paywall
**As a** free user, **I want** to see the upgrade offer after I've experienced a win **so that** paying feels like getting more of something good.

**Acceptance criteria:**
- Paywall triggers after the user's first successful "I texted them" confirmation (proof of value)
- Alternative trigger: after reaching a 7-day streak with any contact
- Never trigger the paywall during onboarding or within the first 3 days
- If the user dismisses, don't show again for at least 7 days

### US-2: Clear Value Communication
**As a** free user considering an upgrade, **I want** to see exactly what paid gives me **so that** I can make an informed decision.

**Acceptance criteria:**
- Paywall screen shows 3 concrete benefits with examples, not abstract labels:
  - "Unlimited people" — "Keep up with your whole crew, not just 3"
  - "Smarter timing" — "Reminders that learn when you're most likely to text"
  - "Streak history" — "See your full connection timeline with everyone"
- Each benefit has a mini-illustration or icon, not just text
- A/B test: benefit-focused copy vs. current "Unlock Premium" copy

### US-3: Accessible Paywall UI
**As a** user on a small screen, **I want** the paywall to be fully usable **so that** I can dismiss it or subscribe without frustration.

**Acceptance criteria:**
- Fix bug: "Trial paywall dismiss button clipped on small screens"
- Dismiss button is always fully visible and tappable (min 44x44 tap target)
- Paywall is scrollable on screens under 667px height
- Test on iPhone SE, iPhone 13 mini, and small Android devices

### US-4: Soft Upgrade Nudges
**As a** free user, **I want** subtle reminders of premium benefits in context **so that** I understand the value over time without feeling pressured.

**Acceptance criteria:**
- When a free user hits the 3-person limit, show a gentle inline message: "Want to add more people? Premium lets you keep your whole circle close."
- When a free user views a streak, show a muted note: "Premium shows your full connection history"
- Nudges are inline (not modals or popups) and appear max once per session
- No nudges in the first 7 days

### US-5: Transparent Pricing
**As a** potential subscriber, **I want** pricing to be upfront and simple **so that** I feel respected, not tricked.

**Acceptance criteria:**
- Price shown clearly on the paywall: monthly and annual with savings highlighted
- Free trial terms are explicit: "7-day free trial, cancel anytime"
- No dark patterns: no pre-checked annual plan, no confusing "Continue" button that starts a trial
- Post-purchase confirmation screen: "You're on Premium. Here's what just unlocked."

## Technical Considerations

- **Trigger system:** Event-driven paywall triggers. Listen for `first_confirmation` and `streak_milestone_7` events. Store `last_paywall_shown_at` to enforce cooldown.
- **A/B testing:** Split paywall copy variants. Track conversion rate per variant over 14-day windows.
- **Small screen fix:** The clipped dismiss button is likely a fixed-position layout issue. Switch to a scrollable sheet with the dismiss button inside the scroll area, not overlaid.
- **Analytics:** Track paywall impressions, trigger type, time-to-dismiss, and conversion per trigger type.

## Success Criteria

| Metric | Current | Target |
| --- | --- | --- |
| Trial-to-paid conversion | 3.5% | 5% |
| Paywall dismiss-to-convert ratio | ~2% | 5%+ |
| "Subscription feels fair" (survey) | 44% agree | 65% |
| Small-screen paywall usability issues | Reported | 0 |

## Dependencies

- Onboarding v2 should ship first — conversion depends on users importing meaningful contacts
- Streak logic (P3) feeds into the streak-triggered paywall

## Related

- [[roadmap]] — Priority #4
- Bug: "Trial paywall dismiss button clipped on small screens" (High, Open)
- KPI: Trial to paid conversion 3.5% → 5% target
