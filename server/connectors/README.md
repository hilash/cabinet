# Cabinet Connectors

Connectors are standalone Node scripts that pull data from external services (ads platforms, payments, analytics, CRMs) and write daily markdown reports to `data/reports/`. Reports show up in Cabinet's sidebar, are searchable via Cmd+K, and can be read by other agents as `@`-mentioned context.

## How a connector works

Each connector follows the same four-piece pattern:

1. **Connector script** at `server/connectors/<service>.ts` — a single TypeScript file that runs headless via `npx tsx`. Reads credentials from environment variables, fetches data from an external API, aggregates and renders a markdown report, writes to `data/reports/<service>-YYYY-MM-DD.md`.
2. **Agent persona** at `data/.agents/<service>/persona.md` — a markdown file with YAML frontmatter that defines the agent (name, role, department).
3. **Scheduled job** at `data/.agents/<service>/jobs/<name>.yaml` — a cron-scheduled job that tells the Cabinet job scheduler when to run the connector and what command to execute.
4. **Environment variables** in `.env.local` (gitignored) for credentials and runtime config. Mirrored as documented placeholders in `.env.example`.

The connector itself has **zero frontend code**. The job scheduler invokes an agent session, the agent runs `npx tsx` against the connector script, the connector writes a markdown file to `data/reports/`, and Cabinet's tree builder picks it up automatically. Reports inherit search, version history, `@`-mention support, agent context, and notification toasts for free — none of that needs to be wired up by the connector author.

## Adding a new connector

Use an existing connector as the template (`stripe.ts` is the most complete reference):

1. **Create `server/connectors/<service>.ts`** following the structural layout: `loadCredentials → resolveDateRange → fetch<Resource> → aggregate<Section> → buildInsights → renderReport → writeReport → main`.
2. **Create `data/.agents/<service>/persona.md`** with minimal frontmatter (`name`, `slug`, `role`, `provider: claude-code`, `department`). Cabinet's persona-manager auto-fills the rest on first load.
3. **Create `data/.agents/<service>/jobs/<job-name>.yaml`** with the cron schedule and a prompt that tells the agent to `npx tsx server/connectors/<service>.ts`.
4. **Add a `data/.agents/<service>/` whitelist line to `.gitignore`** so the agent files aren't excluded by the `data/**` rule.
5. **Add the env vars to `.env.example`** (with empty values) and document them in this README.
6. **Add a top entry to `PROGRESS.md`**.
7. **Create `<service>-sample-output.md`** with sanitized example output.

The connector should:

- Use plain `fetch()` (no SDK dependency) unless the SDK is already in `package.json`
- Handle pagination explicitly with cursor-based loops and a runaway-pagination guard
- Convert all currency amounts to display units in the renderer, not in the aggregator
- Render sensible empty-state placeholders rather than empty tables
- Fail loud and early on missing credentials, with errors that print to stderr so the agent's run history surfaces them

---

# Stripe Connector

Pulls revenue, subscription health, and payment operations metrics from the Stripe REST API and writes a daily markdown report to `data/reports/stripe-YYYY-MM-DD.md`.

## Quick start

```bash
# 1. Create a Stripe restricted key (read-only) in test mode:
#    https://dashboard.stripe.com/test/apikeys → Create restricted key
#    Read access on: Charges, Refunds, Balance transactions, Subscriptions,
#    Invoices, Prices, Products, Disputes, Payouts, Customers

# 2. Add it to .env.local at the repo root (NEVER commit this file):
echo "STRIPE_SECRET_KEY=rk_test_..." >> .env.local

# 3. Run the connector manually to verify:
npx tsx server/connectors/stripe.ts

# 4. Open the generated report:
#    data/reports/stripe-YYYY-MM-DD.md
```

That's the entire setup. From step 2, the daily 07:00 cron job will fire automatically through the Cabinet job scheduler — no further configuration required.

## What's in the report

- **Revenue Snapshot** — gross/net revenue, fees, success rate, average order value, plus a day-by-day breakdown across the window
- **Subscription Health** — MRR/ARR (with monthly normalization for yearly/weekly/daily plans), active/new/churned counts, trial conversions, churn rate, per-plan breakdown
- **Payment Operations** — failed charges with top decline reasons, open/won/lost disputes, payment method mix, next and last payouts
- **Insights** — biggest revenue day, biggest single charge with customer label, plan with most churn, disputes needing response, failure-spike detection (any day >2σ above the window's failure baseline)

See [`stripe-sample-output.md`](./stripe-sample-output.md) for an example of how the rendered report looks.

## Credentials setup

Stripe has two key types — **secret keys** (full access, prefix `sk_`) and **restricted keys** (scoped access, prefix `rk_`). **Always use a restricted key with read-only permissions.** A restricted key for this connector is enough; a full secret key gives the connector permissions it does not need.

To create one:

1. Open the Stripe Dashboard → Developers → API keys
   - **Test mode:** https://dashboard.stripe.com/test/apikeys (recommended for first-time setup)
   - **Live mode:** https://dashboard.stripe.com/apikeys
2. Click **Create restricted key**
3. Give it a name (e.g. `Cabinet Stripe Reporter`)
4. Set **Read** permission on each of these resources (leave everything else as **None**):
   - Charges
   - Refunds
   - Balance transactions
   - Subscriptions
   - Invoices
   - Prices
   - Products
   - Disputes
   - Payouts
   - Customers
5. Click **Create key** → reveal the secret value
6. Add it to `.env.local` at the repository root:
   ```bash
   STRIPE_SECRET_KEY=rk_test_...   # or rk_live_... for production
   ```

> **Test mode is strongly recommended** for development. Stripe's test mode is a parallel-universe view of your account with fake money and test customers — completely isolated from live data. You can build and validate the connector without risk, then swap to a `rk_live_` key once ready for production.
>
> **Never commit `.env.local`.** It's gitignored by default, but always double-check before pushing — `git status` should never show it.

## Environment variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `STRIPE_SECRET_KEY` | yes | — | Stripe restricted key (read-only). Prefix `rk_test_` or `rk_live_`. |
| `STRIPE_LOOKBACK_DAYS` | no | `14` | Rolling window size in days, 1–730. The window ends yesterday because today's data is still accumulating in Stripe. |
| `STRIPE_START_DATE` | no | — | Explicit start date (`YYYY-MM-DD`). Requires `STRIPE_END_DATE`. Overrides the rolling window. |
| `STRIPE_END_DATE` | no | — | Explicit end date (`YYYY-MM-DD`). Requires `STRIPE_START_DATE`. Must not be in the future. |

If both `STRIPE_START_DATE` and `STRIPE_END_DATE` are set, they override `STRIPE_LOOKBACK_DAYS`.

## Running manually

From the repository root:

```bash
npx tsx server/connectors/stripe.ts
```

Output goes to `data/reports/stripe-YYYY-MM-DD.md` (filename based on the run date, not the report window). The script reads `.env.local` automatically via dotenv.

## Scheduled reports

The `data/.agents/stripe/jobs/daily-report.yaml` job runs the connector every day at **07:00 server time** via the Cabinet job scheduler. The schedule lands the report in your knowledge base before the start of the workday.

To change the schedule:

- **Via the Cabinet UI:** Open the Jobs Manager, find "Stripe Daily Report" under the Stripe Reporter agent, edit the schedule field. Standard cron syntax.
- **Via the file:** Edit the `schedule` field in `data/.agents/stripe/jobs/daily-report.yaml`.

To trigger an immediate run, click **Run Now** on the job in the Jobs Manager.

## Troubleshooting

| Error | Meaning | Fix |
|---|---|---|
| `Missing required environment variable: STRIPE_SECRET_KEY` | `.env.local` not loaded or var not set | Add `STRIPE_SECRET_KEY=...` to `.env.local` at the repo root, then re-run |
| `STRIPE_SECRET_KEY must start with sk_ or rk_` | Wrong key format | Use a Stripe secret or restricted key (prefix `sk_` or `rk_`), not a publishable key (`pk_`) |
| `Stripe API error (401, ...)` | Invalid, deleted, or rolled key | Create a new restricted key in the Stripe Dashboard and update `.env.local` |
| `Stripe API error (403, ...)` | Key lacks required read permissions | Recreate the key with read-only access on all 10 resources listed in Credentials setup |
| `STRIPE_START_DATE and STRIPE_END_DATE must both be set, or neither.` | Half a date range provided | Set both or unset both |
| `STRIPE_END_DATE must not be in the future.` | End date is later than today | Use a date no later than today |
| `STRIPE_START_DATE must be on or before STRIPE_END_DATE.` | Reversed date range | Swap the dates |
| `STRIPE_LOOKBACK_DAYS must be an integer between 1 and 730.` | Invalid lookback value | Use a number between 1 and 730 |
| `Runaway pagination on <endpoint> (>200 pages, >20000 results)` | More than ~20,000 results in window | Shorten `STRIPE_LOOKBACK_DAYS` |
| Report is empty (zeros everywhere) | No activity in the window, or wrong account | Verify the key belongs to the expected Stripe account, then widen the window with a longer `STRIPE_LOOKBACK_DAYS` |

## Limitations and caveats

- **Single-currency only.** If your account processes in multiple currencies (USD + EUR + GBP, etc.), the connector aggregates everything as a single number with no FX conversion. Multi-currency rollups are out of scope for the MVP and could be added in a follow-up.
- **Trial → paid conversions are approximate.** They're inferred from `trial_end + current status`, not from historical state transitions. Stripe's basic Subscriptions API doesn't expose status-transition history without using the Events API. The metric is stable enough for daily reporting but won't perfectly match Stripe's own conversion analytics.
- **Disputes don't expose `resolved_at`.** "Resolved in window" is approximated using `created`, which is good enough for the standard 14-day window but imperfect for longer windows.
- **No Stripe SDK.** The connector uses plain `fetch()` against the REST API directly to keep `package.json` minimal. If a future connector needs heavy Stripe usage, adding the SDK would be a reasonable trade.
- **Pagination is automatic** via a generic `fetchAllPages()` helper using cursor-based pagination. A safety guard aborts at 200 pages (~20,000 results) to prevent runaway queries.
- **The customer name on the "biggest single charge" insight comes from `customer.name` directly.** If a customer's name field contains additional info (e.g. a full address), that text shows up in the report. This is a function of how the data was entered in Stripe, not a connector bug.
