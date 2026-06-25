# Cabinet Connectors

Connectors are small, self-contained scripts that pull data from external
services into Cabinet's knowledge base. Each connector writes its output as
markdown to `data/reports/`, so the results show up in the sidebar, are
searchable, and can be read by agents as context.

This folder currently ships one connector:

- **Meta Ads** (`meta-ads.ts`) — pulls the last 14 days of campaign
  performance and saves a daily markdown report.

---

## Meta Ads Connector

### What it does

`meta-ads.ts` connects to the Meta Ads (Facebook Graph) API, queries the last
14 days of campaign performance for a single ad account, aggregates
per-campaign metrics, and writes a markdown report to
`data/reports/meta-ads-YYYY-MM-DD.md`.

Metrics captured per campaign and in totals:

- Impressions
- Clicks
- CTR (click-through rate)
- Spend (in the account's currency)
- Conversions (purchases + leads)
- ROAS (return on ad spend)

The report also includes a short **Insights** section calling out top spender,
highest CTR, most conversions, and best ROAS.

See [`meta-ads-sample-output.md`](./meta-ads-sample-output.md) for what the
report looks like.

### Prerequisites

1. A working Cabinet installation (`npm install` has been run in the repo root).
2. A Meta (Facebook) Ads account with at least one campaign.
3. Access to the [Meta for Developers](https://developers.facebook.com/) platform
   with an app that has the **Ads Management** product added.

---

### Setting up credentials

You need two values. Put them in `.env.local` (copy from `.env.example`):

```bash
META_ADS_ACCESS_TOKEN=
META_ADS_AD_ACCOUNT_ID=
```

Here's how to get each one.

#### 1. Access Token

The easiest way to get a long-lived access token is through the
**Graph API Explorer**:

1. Go to [developers.facebook.com/tools/explorer](https://developers.facebook.com/tools/explorer/).
2. In the top-right dropdown, select your app (or create one at
   [developers.facebook.com/apps](https://developers.facebook.com/apps)).
3. Click **Generate Access Token**.
4. When prompted for permissions, make sure to select **`ads_read`**
   (under the Ads Management section).
5. Click **Generate Token** and accept the permissions dialog.
6. Copy the token shown — this is a short-lived token (valid ~1 hour).

**Exchange for a long-lived token (valid ~60 days):**

Run this in your terminal, replacing the placeholders:

```bash
curl "https://graph.facebook.com/v19.0/oauth/access_token?\
grant_type=fb_exchange_token&\
client_id=YOUR_APP_ID&\
client_secret=YOUR_APP_SECRET&\
fb_exchange_token=SHORT_LIVED_TOKEN"
```

Copy the `access_token` value from the response and paste it into
`META_ADS_ACCESS_TOKEN`.

> **Token renewal:** Long-lived tokens expire after ~60 days. When the
> connector starts failing with an authentication error, repeat this step
> to generate a fresh token.

#### 2. Ad Account ID

Your Ad Account ID is visible in:

- **Meta Ads Manager** — the number shown in the top-left, or in the URL
  (e.g. `https://adsmanager.facebook.com/adsmanager/manage/campaigns?act=10155052076152986`)
- **Graph API Explorer** — run `GET /me/adaccounts` and look for your account
  in the `data` array; the `id` field is formatted as `act_XXXXXXXXXX`.

Strip the `act_` prefix and paste just the digits into `META_ADS_AD_ACCOUNT_ID`.

---

### Running the connector manually

Once `.env.local` is populated, run from the repo root:

```bash
npx tsx server/connectors/meta-ads.ts
```

Successful runs print progress logs and finish with:

```
[meta-ads] Report window: 2026-03-28 → 2026-04-10
[meta-ads] 4 campaign(s) returned.
[meta-ads] Report written to /absolute/path/to/data/reports/meta-ads-YYYY-MM-DD.md
```

Open the report in Cabinet (it appears under the `reports/` folder in the
sidebar) or view it directly on disk.

---

### Customizing the report window

By default the connector pulls the last **14 days** ending yesterday (Meta
data for the current day is often incomplete). Three optional environment
variables let you change that:

| Variable | Purpose | Example |
|---|---|---|
| `META_ADS_LOOKBACK_DAYS` | Rolling window ending yesterday (integer, 1–730) | `META_ADS_LOOKBACK_DAYS=30` |
| `META_ADS_START_DATE` | Explicit start date (`YYYY-MM-DD`) | `META_ADS_START_DATE=2026-03-01` |
| `META_ADS_END_DATE` | Explicit end date (`YYYY-MM-DD`) | `META_ADS_END_DATE=2026-03-31` |

**Precedence:** when `START_DATE` and `END_DATE` are **both** set, they
override `LOOKBACK_DAYS`. Otherwise the connector uses `LOOKBACK_DAYS` (or
the default of 14).

Common patterns:

- **Weekly rolling report:** `META_ADS_LOOKBACK_DAYS=7`
- **Monthly rolling report:** `META_ADS_LOOKBACK_DAYS=30`
- **Specific month (e.g. March 2026):** set `META_ADS_START_DATE=2026-03-01`
  and `META_ADS_END_DATE=2026-03-31`

---

### Running the connector on a schedule

Cabinet ships a **Meta Ads Reporter** agent whose sole purpose is to run this
connector on a daily schedule. Its files live at:

```
data/.agents/meta-ads/
├── persona.md              # Agent definition (name, role, provider)
└── jobs/
    └── daily-report.yaml   # Cron schedule + prompt that runs the connector
```

The job runs every day at 07:00 (local time) via `0 7 * * *`. To change the
schedule, edit the `schedule` field in `jobs/daily-report.yaml`.

You can also trigger a run on-demand from Cabinet's **Jobs** UI by finding
"Meta Ads Daily Report" and clicking **Run now**.

---

### Troubleshooting

| Error | Likely cause | Fix |
|---|---|---|
| `Missing required environment variables` | Token or account ID not set | Check `.env.local` has both `META_ADS_*` values |
| `Error validating access token` | Token expired or revoked | Generate a new long-lived token (see setup above) |
| `(#200) Requires ads_read permission` | Token missing ads_read scope | Re-generate the token and tick the `ads_read` permission |
| `Invalid ad account id` | Account ID format is wrong | Use digits only — no `act_` prefix, no dashes |
| `No campaigns with activity` in report | Account has no spend in the window | Normal for paused accounts — report still writes successfully |
| Report doesn't appear in Cabinet's sidebar | Cabinet is caching the file tree | Refresh the browser; Cabinet will re-scan `data/` |

For deeper Meta API issues, see the official reference:
[Meta Graph API error codes](https://developers.facebook.com/docs/graph-api/guides/error-handling).

---

### How this connector is structured

If you want to add more connectors (Google Ads, Stripe, etc.), `meta-ads.ts`
is designed to be copied and adapted. The file follows a simple layout:

1. **Types** — typed data models for the API response and aggregated rows
2. **`loadCredentials()`** — fail-fast env var validation
3. **`resolveDateRange()`** — rolling window or explicit date range
4. **`fetchCampaignInsights()`** — single Graph API call, returns typed rows
5. **`aggregateTotals()` / `buildInsights()`** — pure aggregation functions
6. **`renderReport()`** — deterministic markdown rendering
7. **`writeReport()`** — writes to `data/reports/` with a path traversal guard
8. **`main()`** — orchestration with console logging
9. **`require.main === module` guard** — so the file can be imported without auto-running
