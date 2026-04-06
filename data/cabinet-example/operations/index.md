---
title: "Operations"
created: 2026-04-06T00:00:00.000Z
modified: 2026-04-06T18:10:00.000Z
tags: [operations, logistics, shipping]
order: 1
---

![Operations headquarters](./operations-hero.webp)

# Operations

**"If it's not on fire, we're ahead of schedule."**

Welcome to the nerve centre of Weasleys' Wizard Wheezes. This is where the magic meets the mundane — inventory counts, shipping manifests, and the eternal question of why the Portable Swamps keep leaking in transit.

George runs point on ops, but honestly? Verity is the reason anything actually ships on time. We just take the credit.

---

## Morning Priorities (Daily)

1. **Check overnight orders** — owl post arrives by 6am, Floo orders queue by 7am
2. **Inventory pulse** — open [[candy-counter]] and flag anything below 50 units
3. **Shipping board** — confirm all outbound parcels for [[Shipping Routes]]
4. **Incident report** — did anything explode overnight? (Check the back room. Then check again.)
5. **Restock triggers** — if Canary Creams drop below 100, ping [[Product]] immediately

## Hogsmeade Rush Protocol

Hogsmeade weekends are our Super Bowl. Student traffic triples, and we need all hands on deck:

- **Pre-rush (Friday):** Pre-pack bestseller bundles, restock front displays, test all demo units
- **During rush (Saturday):** Two registers minimum, one dedicated "try before you buy" station, Fred on the floor doing demos
- **Post-rush (Sunday):** Full inventory reconciliation, restock, damage assessment

## Shipment Status

Current shipment data lives in `orders.csv` — it tracks every outbound order with status, destination, and delivery method.

Key routes:
- [[Shipping Routes]] — full breakdown of our three delivery networks
- Floo Network (fastest, most expensive)
- Owl Post (reliable, weather-dependent)
- Knight Bus (bulk only, things arrive... shaken)

## Key Partnerships

- **Honeydukes** — wholesale partner, they move 200+ units/week of our candy line
- **Zonko's (RIP)** — we bought their customer list. Their loss, our gain.
- **Hogwarts Owlery** — bulk owl rental for back-to-school season

## Cross-References

- [[Product]] — what we're shipping and what's coming next
- [[Research]] — what's in testing (and therefore NOT ready to ship, Fred)
- [[candy-counter]] — live inventory dashboard
- [[Finance]] — cost tracking and margin analysis

---

## AI Agent Prompts

Use these prompts with the AI panel to automate ops tasks:

> **Inventory Alert Draft**
> "Review the candy-counter data and draft a restock alert for any product below 50 units. Include product name, current stock, and suggested reorder quantity."

> **Shipping Delay Report**
> "Scan orders.csv for any orders older than 3 days with status 'pending'. Summarize by destination and suggest priority actions."

> **Hogsmeade Prep Checklist**
> "Generate a pre-rush checklist for this weekend's Hogsmeade visit. Include inventory targets, staffing needs, and demo station setup."
