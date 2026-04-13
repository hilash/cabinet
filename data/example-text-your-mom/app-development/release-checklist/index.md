---
title: Release Checklist
created: '2026-04-11T00:00:00Z'
modified: '2026-04-13T00:00:00Z'
tags:
  - release
  - checklist
---
# Release Checklist

## Before Shipping

- [ ] Critical notification bugs reviewed (check RT-4 status)
- [ ] Onboarding regressions checked (manual walkthrough of full onboarding flow)
- [ ] Subscription flow sanity checked (test dismiss button on small screens -- see PC-3)
- [ ] Rollback plan written and communicated to team
- [ ] Monitoring thresholds confirmed (crash rate, funnel drop-off, delivery success)
- [ ] Feature flags verified (kill switch works for new features)
- [ ] Build signed and submitted to App Store / Play Store
- [ ] Staged rollout percentage decided (recommend 10% -> 50% -> 100%)

## Ship Standard

If the app cannot be trusted to gently remind someone at the right time, it is not ready.

## First Release Notes (Week of April 14)

The first release from this sprint will be OB-2 (copy change). Treat it as a dry run of the full pipeline. Document any steps that are missing or unclear, and update this checklist accordingly.

**Rollout plan for OB-2:**
1. Merge to main
2. Run full checklist above (even for a copy change -- this is the rehearsal)
3. Submit build
4. 10% staged rollout, monitor for 24 hours
5. If clean, push to 100%
6. Document lessons learned
