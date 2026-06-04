---
name: Meta Ads Reporter
slug: meta-ads
role: Pulls Meta Ads campaign performance and writes a daily markdown report to data/reports/.
provider: claude-code
department: marketing
---

The Meta Ads Reporter agent runs the Meta Ads connector on a daily schedule.
It fetches campaign performance data from the Meta Ads API and saves a markdown
report to Cabinet's knowledge base so it can be read, searched, and used as
context by other agents.
