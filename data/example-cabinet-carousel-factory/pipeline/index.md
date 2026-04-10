---
title: Content Pipeline
created: '2026-04-10T00:00:00.000Z'
modified: '2026-04-10T00:00:00.000Z'
tags:
  - pipeline
  - workflow
  - production
order: 4
---

# Content Pipeline

The 5-stage process for turning a trending topic into a published Cabinet carousel.

---

## The Pipeline

```
 RESEARCH → COPYWRITE → GENERATE → OPTIMIZE → PUBLISH
   🔍          ✍️          🎨         📈         🚀
Trend Scout  Script Writer  Image Creator  Post Optimizer  Manual/Scheduled
```

### Stage 1: Research (Trend Scout — daily 8am)

The Trend Scout agent scans for content opportunities:
- Trending topics in dev tools, AI, and productivity spaces
- Competitor moves (from `competitors.csv`) that create content angles
- Formats and hooks that are performing well in the niche
- Gaps in what competitors are talking about

**Output:** New rows in `content-ideas.csv` with status "Idea"

### Stage 2: Copywrite (Script Writer — daily 9am)

The Script Writer picks ideas from the backlog and writes carousel scripts:
- Selects a hook formula from [[Script Library]]
- Writes slide-by-slide copy following the [[Brand Guide]] voice
- Targets the right platform and slide count for the format
- Updates content-ideas.csv status to "Script Ready"

**Output:** Full carousel script with slide text, notes, and platform target

### Stage 3: Generate (Image Creator — daily 10am)

The Image Creator produces branded slide images:
- Generates backgrounds using AI image tools (Gemini, FLUX)
- Applies the Cabinet visual identity (parchment tones, serif headers, terminal chrome)
- Overlays the script text onto slides
- Updates status to "Designed"

**Output:** Numbered slide images ready for assembly

### Stage 4: Optimize (Post Optimizer — MWF 10am)

The Post Optimizer prepares the carousel for each platform:
- Writes platform-specific captions with hooks and CTAs
- Researches and selects hashtag sets
- Recommends optimal posting time based on day/platform
- Adapts slides for platform requirements (aspect ratio, slide limits)
- Updates status to "Ready to Publish"

**Output:** Final carousel package with captions and hashtags per platform

### Stage 5: Publish

Currently manual — founder reviews and publishes. Future: automated via scheduling API.

**Posting order:**
1. TikTok first (always)
2. Instagram 24 hours later
3. LinkedIn 48 hours later

After publishing, update status to "Published" in content-ideas.csv.

---

## Daily Workflow

| Time | Action | Owner |
|------|--------|-------|
| 6:00 AM | Competitor scan runs (cron) | competitor-scan job |
| 8:00 AM | Morning briefing + trend research | Trend Scout agent |
| 9:00 AM | Script writing for queued ideas | Script Writer agent |
| 10:00 AM | Image generation for scripted carousels | Image Creator agent |
| 10:00 AM | Caption optimization (MWF) | Post Optimizer agent |
| 12:00 PM | Review and publish today's carousel | Founder |
| 9:00 AM Mon | Weekly performance digest | weekly-performance-digest job |

---

## Status Flow

```
Idea → Script Ready → Designed → Ready to Publish → Published
```

| Status | Meaning | Next Action |
|--------|---------|-------------|
| Idea | Raw concept logged | Script Writer picks it up |
| Script Ready | Copy written, needs images | Image Creator picks it up |
| Designed | Slides created, needs optimization | Post Optimizer picks it up |
| Ready to Publish | Fully packaged with captions | Founder reviews and publishes |
| Published | Live on platform | Track performance |

---

## Posting Schedule

| Day | TikTok | Instagram | LinkedIn | Content Type |
|-----|--------|-----------|----------|--------------|
| Monday | 1 carousel | — | 1 carousel | Hot Take |
| Tuesday | — | 1 carousel | — | Tutorial |
| Wednesday | 1 carousel | — | — | Product Demo |
| Thursday | — | 1 carousel | 1 carousel | Comparison |
| Friday | 1 carousel | — | — | Behind the Scenes |
| Saturday | — | 1 carousel | — | Listicle |
| Sunday | — | — | — | Plan next week |

**Weekly target:** 8 carousels (3 TikTok, 3 Instagram, 2 LinkedIn)

---

## Automation

Three cron jobs keep the factory running:

| Job | Schedule | What it does |
|-----|----------|--------------|
| Competitor Scan | Daily 6 AM | Updates competitors.csv with pricing/feature changes |
| Morning Briefing | Weekdays 8 AM | Summarizes what to publish, script, and generate today |
| Weekly Digest | Mondays 9 AM | Performance analysis vs quarterly targets |

---

Last Updated: 2026-04-10
