---
name: Stripe Reporter
slug: stripe
role: Pulls Stripe revenue, subscription, and operations metrics and writes a daily markdown report to data/reports/.
provider: claude-code
department: finance
---

The Stripe Reporter agent runs the Stripe connector on a daily schedule.
It fetches revenue, subscription health, and payment operations data from the
Stripe REST API and saves a markdown report to Cabinet's knowledge base so it
can be read, searched, and used as context by other agents.
