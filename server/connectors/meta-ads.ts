/**
 * Meta Ads Connector
 *
 * Pulls campaign performance from the Meta Ads (Facebook Graph) API and writes
 * a markdown report to `data/reports/meta-ads-YYYY-MM-DD.md`. The report shows
 * up in Cabinet's sidebar, is searchable, and can be read by agents as context.
 *
 * Runs headless, triggered either manually or by the Cabinet job scheduler
 * via `data/.agents/meta-ads/jobs/daily-report.yaml`.
 *
 * Usage: npx tsx server/connectors/meta-ads.ts
 *
 * Required environment variables (see `.env.example`):
 *   META_ADS_ACCESS_TOKEN    — long-lived User Access Token from Graph API Explorer
 *   META_ADS_AD_ACCOUNT_ID   — Ad Account ID, e.g. 10155052076152986
 *
 * Optional environment variables:
 *   META_ADS_LOOKBACK_DAYS   — rolling window ending today (default: 14, max: 730)
 *   META_ADS_START_DATE      — explicit start date (YYYY-MM-DD); requires END_DATE
 *   META_ADS_END_DATE        — explicit end date (YYYY-MM-DD); requires START_DATE
 */

import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { DATA_DIR } from "../../src/lib/storage/path-utils";

// Load .env.local when running headless via npx tsx
dotenv.config({ path: path.resolve(__dirname, "../../.env.local") });

// ===== Types =====

interface CampaignRow {
  id: string;
  name: string;
  impressions: number;
  clicks: number;
  ctr: number;          // 0..100 percentage as returned by Meta
  spend: number;        // in account currency
  conversions: number;
  roas: number | null;  // null when spend is zero or no purchase data
}

interface Totals {
  impressions: number;
  clicks: number;
  spend: number;
  conversions: number;
  avgCtr: number;
  overallRoas: number | null;
}

interface MetaInsightRow {
  campaign_id: string;
  campaign_name: string;
  impressions: string;
  clicks: string;
  ctr: string;
  spend: string;
  actions?: { action_type: string; value: string }[];
  purchase_roas?: { action_type: string; value: string }[];
  date_start: string;
  date_stop: string;
}

interface MetaInsightsResponse {
  data: MetaInsightRow[];
  paging?: { cursors: { before: string; after: string }; next?: string };
  error?: { message: string; type: string; code: number };
}

// ===== Credentials =====

interface Credentials {
  accessToken: string;
  adAccountId: string;
}

function loadCredentials(): Credentials {
  const accessToken = process.env.META_ADS_ACCESS_TOKEN ?? "";
  const adAccountId = process.env.META_ADS_AD_ACCOUNT_ID ?? "";
  const missing: string[] = [];
  if (!accessToken) missing.push("META_ADS_ACCESS_TOKEN");
  if (!adAccountId) missing.push("META_ADS_AD_ACCOUNT_ID");
  if (missing.length) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}\n` +
        "Add them to .env.local and re-run. See server/connectors/README.md for details."
    );
  }
  return { accessToken, adAccountId: adAccountId.replace(/^act_/, "") };
}

// ===== Date range =====

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

interface DateRange {
  startDate: string;
  endDate: string;
}

function resolveDateRange(): DateRange {
  const startEnv = process.env.META_ADS_START_DATE ?? "";
  const endEnv = process.env.META_ADS_END_DATE ?? "";
  const lookbackEnv = process.env.META_ADS_LOOKBACK_DAYS ?? "";

  // Explicit range takes precedence
  if (startEnv || endEnv) {
    if (!startEnv || !endEnv) {
      throw new Error(
        "META_ADS_START_DATE and META_ADS_END_DATE must both be set, or neither."
      );
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startEnv) || !/^\d{4}-\d{2}-\d{2}$/.test(endEnv)) {
      throw new Error("META_ADS_START_DATE and META_ADS_END_DATE must be in YYYY-MM-DD format.");
    }
    if (endEnv > formatDate(new Date())) {
      throw new Error("META_ADS_END_DATE must not be in the future.");
    }
    return { startDate: startEnv, endDate: endEnv };
  }

  // Rolling window
  let lookbackDays = 14;
  if (lookbackEnv) {
    const parsed = parseInt(lookbackEnv, 10);
    if (isNaN(parsed) || parsed < 1 || parsed > 730) {
      throw new Error("META_ADS_LOOKBACK_DAYS must be an integer between 1 and 730.");
    }
    lookbackDays = parsed;
  }

  const end = new Date();
  end.setDate(end.getDate() - 1); // yesterday — Meta data for today may be incomplete
  const start = new Date(end);
  start.setDate(start.getDate() - (lookbackDays - 1));

  return { startDate: formatDate(start), endDate: formatDate(end) };
}

// ===== Meta Ads API =====

const GRAPH_API_VERSION = "v19.0";
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

async function fetchCampaignInsights(
  accessToken: string,
  adAccountId: string,
  startDate: string,
  endDate: string
): Promise<CampaignRow[]> {
  const fields = [
    "campaign_id",
    "campaign_name",
    "impressions",
    "clicks",
    "ctr",
    "spend",
    "actions",
    "purchase_roas",
  ].join(",");

  const params = new URLSearchParams({
    fields,
    level: "campaign",
    time_range: JSON.stringify({ since: startDate, until: endDate }),
    access_token: accessToken,
    limit: "500",
  });

  const url = `${GRAPH_BASE}/act_${adAccountId}/insights?${params.toString()}`;
  const res = await fetch(url);
  const json = (await res.json()) as MetaInsightsResponse;

  if (json.error) {
    throw new Error(`Meta API error (${json.error.code}): ${json.error.message}`);
  }

  const rows = json.data ?? [];

  return rows.map((row): CampaignRow => {
    // Sum all purchase/lead conversion actions
    const conversions = (row.actions ?? [])
      .filter((a) =>
        ["purchase", "offsite_conversion.fb_pixel_purchase", "lead"].includes(a.action_type)
      )
      .reduce((sum, a) => sum + parseFloat(a.value), 0);

    // purchase_roas is an array; take the first value if present
    const roasEntry = (row.purchase_roas ?? []).find(
      (r) => r.action_type === "omni_purchase" || r.action_type === "purchase"
    );
    const roas = roasEntry ? parseFloat(roasEntry.value) : null;

    return {
      id: row.campaign_id,
      name: row.campaign_name,
      impressions: parseInt(row.impressions, 10),
      clicks: parseInt(row.clicks, 10),
      ctr: parseFloat(row.ctr),
      spend: parseFloat(row.spend),
      conversions: Math.round(conversions),
      roas,
    };
  });
}

// ===== Aggregation =====

function aggregateTotals(rows: CampaignRow[]): Totals {
  const impressions = rows.reduce((s, r) => s + r.impressions, 0);
  const clicks = rows.reduce((s, r) => s + r.clicks, 0);
  const spend = rows.reduce((s, r) => s + r.spend, 0);
  const conversions = rows.reduce((s, r) => s + r.conversions, 0);
  const avgCtr = impressions > 0 ? (clicks / impressions) * 100 : 0;

  // Weighted ROAS: total conversion value / total spend
  const roasRows = rows.filter((r) => r.roas !== null && r.spend > 0);
  let overallRoas: number | null = null;
  if (roasRows.length > 0 && spend > 0) {
    const totalConvValue = roasRows.reduce((s, r) => s + r.roas! * r.spend, 0);
    overallRoas = totalConvValue / spend;
  }

  return { impressions, clicks, spend, conversions, avgCtr, overallRoas };
}

// ===== Insights =====

interface Insights {
  topSpender: string;
  highestCtr: string;
  mostConversions: string;
  bestRoas: string | null;
}

function buildInsights(rows: CampaignRow[]): Insights {
  const topSpender = rows.reduce((a, b) => (b.spend > a.spend ? b : a));
  const highestCtr = rows.reduce((a, b) => (b.ctr > a.ctr ? b : a));
  const mostConversions = rows.reduce((a, b) =>
    b.conversions > a.conversions ? b : a
  );
  const roasRows = rows.filter((r) => r.roas !== null);
  const bestRoasRow =
    roasRows.length > 0
      ? roasRows.reduce((a, b) => (b.roas! > a.roas! ? b : a))
      : null;

  return {
    topSpender: topSpender.name,
    highestCtr: highestCtr.name,
    mostConversions: mostConversions.name,
    bestRoas: bestRoasRow ? bestRoasRow.name : null,
  };
}

// ===== Formatting =====

function formatMoney(amount: number): string {
  return amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatRoas(roas: number | null): string {
  if (roas === null) return "N/A";
  return `${roas.toFixed(1)}x`;
}

function formatCtr(ctr: number): string {
  return `${ctr.toFixed(2)}%`;
}

// ===== Markdown rendering =====

function renderReport(
  rows: CampaignRow[],
  totals: Totals,
  insights: Insights,
  startDate: string,
  endDate: string,
  runDate: string,
  adAccountId: string
): string {
  const lines: string[] = [];

  lines.push("# Meta Ads Performance Report");
  lines.push(`**Period:** ${startDate} → ${endDate}`);
  lines.push(`**Generated:** ${new Date().toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" })}, ${new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }).toLowerCase()}`);
  lines.push(`**Account:** ${adAccountId}`);
  lines.push("");
  lines.push("---");
  lines.push("");

  if (rows.length === 0) {
    lines.push(
      "_No campaigns with activity in this period._"
    );
    return lines.join("\n");
  }

  // Campaign summary table
  lines.push("## Campaign Summary");
  lines.push("");
  lines.push("| Campaign | Impressions | Clicks | CTR | Spend | Conversions | ROAS |");
  lines.push("|---|---|---|---|---|---|---|");
  for (const row of rows) {
    const safeName = row.name.replace(/\|/g, "\\|");
    lines.push(
      `| ${safeName} | ${row.impressions.toLocaleString()} | ${row.clicks.toLocaleString()} | ${formatCtr(row.ctr)} | USD ${formatMoney(row.spend)} | ${row.conversions.toLocaleString()} | ${formatRoas(row.roas)} |`
    );
  }
  lines.push("");
  lines.push("---");
  lines.push("");

  // Totals table
  lines.push("## Totals");
  lines.push("");
  lines.push("| Metric | Value |");
  lines.push("|---|---|");
  lines.push(`| Total Spend | USD ${formatMoney(totals.spend)} |`);
  lines.push(`| Total Clicks | ${totals.clicks.toLocaleString()} |`);
  lines.push(`| Total Impressions | ${totals.impressions.toLocaleString()} |`);
  lines.push(`| Total Conversions | ${totals.conversions.toLocaleString()} |`);
  lines.push(`| Avg CTR | ${formatCtr(totals.avgCtr)} |`);
  lines.push(`| Overall ROAS | ${formatRoas(totals.overallRoas)} |`);
  lines.push("");
  lines.push("---");
  lines.push("");

  // Insights
  lines.push("## Insights");
  lines.push("");
  const esc = (s: string) => s.replace(/\|/g, "\\|");
  lines.push(`- Top spender: **${esc(insights.topSpender)}**`);
  lines.push(`- Highest CTR: **${esc(insights.highestCtr)}** (${formatCtr(rows.find(r => r.name === insights.highestCtr)!.ctr)})`);
  lines.push(`- Most conversions: **${esc(insights.mostConversions)}** (${rows.find(r => r.name === insights.mostConversions)!.conversions.toLocaleString()})`);
  if (insights.bestRoas) {
    const bestRow = rows.find(r => r.name === insights.bestRoas)!;
    lines.push(`- Best ROAS: **${esc(insights.bestRoas)}** (${formatRoas(bestRow.roas)})`);
  }
  lines.push("");

  return lines.join("\n");
}

// ===== Write report =====

function writeReport(content: string, runDate: string): string {
  const reportsDir = path.join(DATA_DIR, "reports");
  const fileName = `meta-ads-${runDate}.md`;
  const filePath = path.join(reportsDir, fileName);

  // Path traversal guard
  const resolved = path.resolve(filePath);
  if (!resolved.startsWith(path.resolve(DATA_DIR))) {
    throw new Error(`Path traversal detected: ${filePath}`);
  }

  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  fs.writeFileSync(filePath, content, "utf-8");
  return filePath;
}

// ===== Main =====

async function main(): Promise<void> {
  console.log("[meta-ads] Starting Meta Ads connector...");

  const creds = loadCredentials();
  const { startDate, endDate } = resolveDateRange();
  const runDate = formatDate(new Date());

  console.log(`[meta-ads] Report window: ${startDate} → ${endDate}`);
  console.log(`[meta-ads] Fetching campaign insights for account ${creds.adAccountId}...`);

  const rows = await fetchCampaignInsights(
    creds.accessToken,
    creds.adAccountId,
    startDate,
    endDate
  );

  console.log(`[meta-ads] ${rows.length} campaign(s) returned.`);

  const totals = aggregateTotals(rows);
  const insights = rows.length > 0 ? buildInsights(rows) : null;

  const report = renderReport(
    rows,
    totals,
    insights ?? { topSpender: "", highestCtr: "", mostConversions: "", bestRoas: null },
    startDate,
    endDate,
    runDate,
    creds.adAccountId
  );

  const filePath = writeReport(report, runDate);
  console.log(`[meta-ads] Report written to ${filePath}`);
}

if (require.main === module) {
  main().catch((err) => {
    console.error("[meta-ads] Error:", err.message ?? err);
    process.exit(1);
  });
}
