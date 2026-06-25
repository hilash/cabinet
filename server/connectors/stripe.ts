/**
 * Stripe Connector
 *
 * Pulls revenue, subscription health, and payment operations metrics from the
 * Stripe REST API and writes a comprehensive markdown report to
 * `data/reports/stripe-YYYY-MM-DD.md`. The report shows up in Cabinet's
 * sidebar, is searchable, and can be read by agents as context.
 *
 * Runs headless, triggered either manually or by the Cabinet job scheduler
 * via `data/.agents/stripe/jobs/daily-report.yaml`.
 *
 * Usage: npx tsx server/connectors/stripe.ts
 *
 * Required environment variables (see `.env.example`):
 *   STRIPE_SECRET_KEY        — Restricted read-only key, test or live mode
 *
 * Optional environment variables:
 *   STRIPE_LOOKBACK_DAYS     — rolling window ending yesterday (default: 14, max: 730)
 *   STRIPE_START_DATE        — explicit start date (YYYY-MM-DD); requires END_DATE
 *   STRIPE_END_DATE          — explicit end date (YYYY-MM-DD); requires START_DATE
 */

import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { DATA_DIR } from "../../src/lib/storage/path-utils";

dotenv.config({ path: path.resolve(__dirname, "../../.env.local") });

// ===== Types =====

interface Credentials {
  secretKey: string;
}

interface DateRange {
  startDate: string; // YYYY-MM-DD inclusive
  endDate: string;   // YYYY-MM-DD inclusive
  startTs: number;   // unix seconds (for Stripe created[gte])
  endTs: number;     // unix seconds (for Stripe created[lte])
}

// Raw Stripe API shapes (only fields we use)
interface StripeCharge {
  id: string;
  amount: number;           // in cents
  status: "succeeded" | "failed" | "pending";
  created: number;          // unix seconds
  failure_code: string | null;
  payment_method_details?: { type: string };
  customer?: { id: string; name: string | null; email: string | null } | string | null;
}

interface StripeRefund {
  id: string;
  amount: number;
  status: string;
  created: number;
}

interface StripeBalanceTransaction {
  id: string;
  fee: number;
  created: number;
  type: string;
}

interface StripePrice {
  id: string;
  unit_amount: number | null;
  recurring: { interval: "day" | "week" | "month" | "year"; interval_count: number } | null;
  product: { id: string; name: string } | string;
}

interface StripeSubscriptionItem {
  id: string;
  price: StripePrice;
  quantity: number;
}

interface StripeSubscription {
  id: string;
  status: "active" | "trialing" | "canceled" | "past_due" | "incomplete" | "incomplete_expired" | "unpaid" | "paused";
  created: number;
  canceled_at: number | null;
  trial_end: number | null;
  items: { data: StripeSubscriptionItem[] };
}

interface StripeDispute {
  id: string;
  amount: number;
  status: "warning_needs_response" | "warning_under_review" | "warning_closed" | "needs_response" | "under_review" | "won" | "lost";
  created: number;
}

interface StripePayout {
  id: string;
  amount: number;
  status: "pending" | "paid" | "failed" | "canceled" | "in_transit";
  arrival_date: number;
}

interface StripeListResponse<T> {
  object: "list";
  data: T[];
  has_more: boolean;
  url: string;
}

interface StripeErrorResponse {
  error: { type: string; code?: string; message: string };
}

// Aggregated types rendered in report

interface DailyRevenueRow {
  date: string;
  chargeCount: number;
  gross: number;
  refunds: number;
  net: number;
}

interface RevenueAggregate {
  days: DailyRevenueRow[];
  grossRevenue: number;
  refunds: number;
  fees: number;
  netRevenue: number;
  successfulCount: number;
  failedCount: number;
  successRate: number;
  aov: number;
}

interface PlanRow {
  planName: string;
  activeCount: number;
  newCount: number;
  churnedCount: number;
  mrrContribution: number;
}

interface SubscriptionAggregate {
  mrr: number;
  arr: number;
  activeSubscribers: number;
  newSubscriptions: number;
  churnedSubscriptions: number;
  netMrrChange: number;
  trialSubscribers: number;
  trialConversions: number;
  churnRate: number;
  plans: PlanRow[];
  hasSubscriptions: boolean;
}

interface DeclineReasonRow {
  code: string;
  count: number;
}

interface OperationsAggregate {
  failedCount: number;
  failedTotal: number;
  declineReasons: DeclineReasonRow[];
  activeDisputeCount: number;
  activeDisputeTotal: number;
  disputesWon: number;
  disputesLost: number;
  paymentMethodMix: Array<{ type: string; count: number; pct: number }>;
  nextPayout: { amount: number; arrivalDate: string } | null;
  lastPayout: { amount: number; arrivalDate: string; status: string } | null;
}

interface Insights {
  biggestRevenueDay: { date: string; gross: number } | null;
  biggestCharge: { customerLabel: string; amount: number } | null;
  topChurnPlan: { planName: string; count: number } | null;
  disputesNeedingAttention: { count: number; total: number } | null;
  failureSpike: { date: string; count: number; baselineMean: number } | null;
}

// ===== Credentials =====

function loadCredentials(): Credentials {
  const secretKey = process.env.STRIPE_SECRET_KEY ?? "";
  if (!secretKey) {
    throw new Error(
      "Missing required environment variable: STRIPE_SECRET_KEY\n" +
        "Add it to .env.local and re-run. See server/connectors/README.md for details."
    );
  }
  if (!secretKey.startsWith("sk_") && !secretKey.startsWith("rk_")) {
    throw new Error(
      `STRIPE_SECRET_KEY must start with sk_ or rk_ (got "${secretKey.slice(0, 6)}...").`
    );
  }
  return { secretKey };
}

// ===== Date range =====

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function toUnixSeconds(date: string, endOfDay: boolean): number {
  const [y, m, d] = date.split("-").map(Number);
  const ts = Date.UTC(y, m - 1, d, endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0);
  return Math.floor(ts / 1000);
}

function resolveDateRange(): DateRange {
  const startEnv = process.env.STRIPE_START_DATE ?? "";
  const endEnv = process.env.STRIPE_END_DATE ?? "";
  const lookbackEnv = process.env.STRIPE_LOOKBACK_DAYS ?? "";

  let startDate: string;
  let endDate: string;

  if (startEnv || endEnv) {
    if (!startEnv || !endEnv) {
      throw new Error("STRIPE_START_DATE and STRIPE_END_DATE must both be set, or neither.");
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startEnv) || !/^\d{4}-\d{2}-\d{2}$/.test(endEnv)) {
      throw new Error("STRIPE_START_DATE and STRIPE_END_DATE must be in YYYY-MM-DD format.");
    }
    if (endEnv > formatDate(new Date())) {
      throw new Error("STRIPE_END_DATE must not be in the future.");
    }
    if (startEnv > endEnv) {
      throw new Error("STRIPE_START_DATE must be on or before STRIPE_END_DATE.");
    }
    startDate = startEnv;
    endDate = endEnv;
  } else {
    let lookbackDays = 14;
    if (lookbackEnv) {
      const parsed = parseInt(lookbackEnv, 10);
      if (isNaN(parsed) || parsed < 1 || parsed > 730) {
        throw new Error("STRIPE_LOOKBACK_DAYS must be an integer between 1 and 730.");
      }
      lookbackDays = parsed;
    }
    const end = new Date();
    end.setUTCDate(end.getUTCDate() - 1);
    const start = new Date(end);
    start.setUTCDate(start.getUTCDate() - (lookbackDays - 1));
    startDate = formatDate(start);
    endDate = formatDate(end);
  }

  return {
    startDate,
    endDate,
    startTs: toUnixSeconds(startDate, false),
    endTs: toUnixSeconds(endDate, true),
  };
}

// ===== Stripe API =====

const STRIPE_API_BASE = "https://api.stripe.com/v1";

function stripeAuthHeader(secretKey: string): string {
  const token = Buffer.from(`${secretKey}:`).toString("base64");
  return `Basic ${token}`;
}

async function fetchStripe<T>(
  secretKey: string,
  endpoint: string,
  params: Record<string, string>,
  attempt = 1
): Promise<StripeListResponse<T>> {
  const url = new URL(`${STRIPE_API_BASE}${endpoint}`);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30_000);

  try {
    const res = await fetch(url.toString(), {
      headers: { Authorization: stripeAuthHeader(secretKey) },
      signal: controller.signal,
    });

    if (res.status === 429 && attempt <= 3) {
      const delayMs = 1000 * Math.pow(2, attempt - 1);
      console.warn(`[stripe] 429 rate limited, retrying in ${delayMs}ms (attempt ${attempt}/3)`);
      await new Promise((r) => setTimeout(r, delayMs));
      return fetchStripe<T>(secretKey, endpoint, params, attempt + 1);
    }

    const json = (await res.json()) as StripeListResponse<T> | StripeErrorResponse;
    if (!res.ok || "error" in json) {
      const err = "error" in json ? json.error : { message: `HTTP ${res.status}`, type: "unknown" };
      throw new Error(`Stripe API error (${res.status}, ${err.type}): ${err.message}`);
    }
    return json as StripeListResponse<T>;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function fetchAllPages<T extends { id: string }>(
  secretKey: string,
  endpoint: string,
  baseParams: Record<string, string>
): Promise<T[]> {
  const results: T[] = [];
  let startingAfter: string | null = null;
  let pageCount = 0;

  while (true) {
    const params: Record<string, string> = { ...baseParams, limit: "100" };
    if (startingAfter) params.starting_after = startingAfter;

    const page = await fetchStripe<T>(secretKey, endpoint, params);
    results.push(...page.data);
    pageCount++;

    if (!page.has_more || page.data.length === 0) break;
    startingAfter = page.data[page.data.length - 1].id;

    if (pageCount > 200) {
      throw new Error(
        `[stripe] Runaway pagination on ${endpoint} (>200 pages, >20000 results). ` +
          "Aborting to prevent infinite loop."
      );
    }
  }

  return results;
}

// ===== Revenue pipeline =====

async function fetchCharges(secretKey: string, range: DateRange): Promise<StripeCharge[]> {
  return fetchAllPages<StripeCharge>(secretKey, "/charges", {
    "created[gte]": String(range.startTs),
    "created[lte]": String(range.endTs),
    "expand[]": "data.customer",
  });
}

async function fetchRefunds(secretKey: string, range: DateRange): Promise<StripeRefund[]> {
  return fetchAllPages<StripeRefund>(secretKey, "/refunds", {
    "created[gte]": String(range.startTs),
    "created[lte]": String(range.endTs),
  });
}

async function fetchBalanceTransactions(
  secretKey: string,
  range: DateRange
): Promise<StripeBalanceTransaction[]> {
  return fetchAllPages<StripeBalanceTransaction>(secretKey, "/balance_transactions", {
    "created[gte]": String(range.startTs),
    "created[lte]": String(range.endTs),
    type: "charge",
  });
}

function unixToDate(ts: number): string {
  return new Date(ts * 1000).toISOString().slice(0, 10);
}

function eachDateInRange(range: DateRange): string[] {
  const days: string[] = [];
  const start = new Date(range.startDate + "T00:00:00Z");
  const end = new Date(range.endDate + "T00:00:00Z");
  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    days.push(formatDate(d));
  }
  return days;
}

function aggregateRevenue(
  charges: StripeCharge[],
  refunds: StripeRefund[],
  balanceTxns: StripeBalanceTransaction[],
  range: DateRange
): RevenueAggregate {
  const succeeded = charges.filter((c) => c.status === "succeeded");
  const failed = charges.filter((c) => c.status === "failed");

  const grossRevenue = succeeded.reduce((s, c) => s + c.amount, 0);
  const refundsTotal = refunds.reduce((s, r) => s + r.amount, 0);
  const fees = balanceTxns.reduce((s, t) => s + t.fee, 0);
  const netRevenue = grossRevenue - refundsTotal - fees;

  const successfulCount = succeeded.length;
  const failedCount = failed.length;
  const successRate =
    successfulCount + failedCount > 0
      ? (successfulCount / (successfulCount + failedCount)) * 100
      : 0;
  const aov = successfulCount > 0 ? grossRevenue / successfulCount : 0;

  const dayMap = new Map<string, DailyRevenueRow>();
  for (const date of eachDateInRange(range)) {
    dayMap.set(date, { date, chargeCount: 0, gross: 0, refunds: 0, net: 0 });
  }
  for (const c of succeeded) {
    const d = unixToDate(c.created);
    const row = dayMap.get(d);
    if (row) {
      row.chargeCount++;
      row.gross += c.amount;
    }
  }
  for (const r of refunds) {
    const d = unixToDate(r.created);
    const row = dayMap.get(d);
    if (row) row.refunds += r.amount;
  }
  for (const row of dayMap.values()) {
    row.net = row.gross - row.refunds;
  }

  return {
    days: Array.from(dayMap.values()),
    grossRevenue,
    refunds: refundsTotal,
    fees,
    netRevenue,
    successfulCount,
    failedCount,
    successRate,
    aov,
  };
}

// ===== Subscription pipeline =====

interface StripeProduct {
  id: string;
  name: string;
}

async function fetchSubscriptions(secretKey: string): Promise<StripeSubscription[]> {
  // expand depth maxes out at 4: data → items → data → price (cannot also expand .product)
  return fetchAllPages<StripeSubscription>(secretKey, "/subscriptions", {
    status: "all",
    "expand[]": "data.items.data.price",
  });
}

async function fetchProducts(secretKey: string): Promise<StripeProduct[]> {
  return fetchAllPages<StripeProduct>(secretKey, "/products", {});
}

// Walk subscriptions and replace any string-id product references with {id, name}
// objects looked up from the products map. Mutates in place for simplicity.
function enrichSubscriptionsWithProducts(
  subs: StripeSubscription[],
  products: StripeProduct[]
): void {
  const productMap = new Map<string, StripeProduct>();
  for (const p of products) productMap.set(p.id, p);
  for (const sub of subs) {
    for (const item of sub.items.data) {
      const product = item.price.product;
      if (typeof product === "string") {
        const found = productMap.get(product);
        item.price.product = found ?? { id: product, name: product };
      }
    }
  }
}

function normalizeToMonthly(
  unitAmount: number,
  quantity: number,
  interval: "day" | "week" | "month" | "year",
  intervalCount: number
): number {
  const gross = unitAmount * quantity;
  switch (interval) {
    case "month":
      return gross / intervalCount;
    case "year":
      return gross / (12 * intervalCount);
    case "week":
      // 52 weeks ÷ 12 months ≈ 4.33 weeks per month
      return (gross * 4.33) / intervalCount;
    case "day":
      // ~30 days per month (average; matches Baremetrics/ProfitWell convention)
      return (gross * 30) / intervalCount;
  }
}

function subscriptionMonthlyRevenue(sub: StripeSubscription): number {
  let total = 0;
  for (const item of sub.items.data) {
    const price = item.price;
    if (price.unit_amount == null || price.recurring == null) continue;
    total += normalizeToMonthly(
      price.unit_amount,
      item.quantity,
      price.recurring.interval,
      price.recurring.interval_count
    );
  }
  return total;
}

function primaryPlanName(sub: StripeSubscription): string {
  const firstItem = sub.items.data[0];
  if (!firstItem) return "Unknown";
  const product = firstItem.price.product;
  if (typeof product === "string") return product;
  return product.name || "Unknown";
}

function aggregateSubscriptions(
  subs: StripeSubscription[],
  range: DateRange
): SubscriptionAggregate {
  if (subs.length === 0) {
    return {
      mrr: 0,
      arr: 0,
      activeSubscribers: 0,
      newSubscriptions: 0,
      churnedSubscriptions: 0,
      netMrrChange: 0,
      trialSubscribers: 0,
      trialConversions: 0,
      churnRate: 0,
      plans: [],
      hasSubscriptions: false,
    };
  }

  const active = subs.filter((s) => s.status === "active" || s.status === "trialing");
  const trialing = subs.filter((s) => s.status === "trialing");

  const inWindow = (ts: number | null): boolean =>
    ts !== null && ts >= range.startTs && ts <= range.endTs;

  const newSubs = subs.filter((s) => inWindow(s.created));
  const churnedSubs = subs.filter((s) => inWindow(s.canceled_at));

  const mrr = active.reduce((sum, s) => sum + subscriptionMonthlyRevenue(s), 0);
  const newMrr = newSubs.reduce((sum, s) => sum + subscriptionMonthlyRevenue(s), 0);
  const churnedMrr = churnedSubs.reduce((sum, s) => sum + subscriptionMonthlyRevenue(s), 0);
  const netMrrChange = newMrr - churnedMrr;

  const trialConversions = subs.filter(
    (s) => inWindow(s.trial_end) && s.status === "active"
  ).length;

  const activeAtStart = subs.filter(
    (s) =>
      s.created < range.startTs &&
      (s.canceled_at === null || s.canceled_at >= range.startTs)
  ).length;
  const churnRate = activeAtStart > 0 ? (churnedSubs.length / activeAtStart) * 100 : 0;

  const planMap = new Map<string, PlanRow>();
  const ensure = (name: string): PlanRow => {
    let row = planMap.get(name);
    if (!row) {
      row = { planName: name, activeCount: 0, newCount: 0, churnedCount: 0, mrrContribution: 0 };
      planMap.set(name, row);
    }
    return row;
  };
  for (const s of active) {
    const row = ensure(primaryPlanName(s));
    row.activeCount++;
    row.mrrContribution += subscriptionMonthlyRevenue(s);
  }
  for (const s of newSubs) ensure(primaryPlanName(s)).newCount++;
  for (const s of churnedSubs) ensure(primaryPlanName(s)).churnedCount++;

  return {
    mrr,
    arr: mrr * 12,
    activeSubscribers: active.length,
    newSubscriptions: newSubs.length,
    churnedSubscriptions: churnedSubs.length,
    netMrrChange,
    trialSubscribers: trialing.length,
    trialConversions,
    churnRate,
    plans: Array.from(planMap.values()).sort((a, b) => b.mrrContribution - a.mrrContribution),
    hasSubscriptions: true,
  };
}

// ===== Operations pipeline =====

async function fetchDisputesInWindow(secretKey: string, range: DateRange): Promise<StripeDispute[]> {
  return fetchAllPages<StripeDispute>(secretKey, "/disputes", {
    "created[gte]": String(range.startTs),
    "created[lte]": String(range.endTs),
  });
}

async function fetchAllOpenDisputes(secretKey: string): Promise<StripeDispute[]> {
  const all = await fetchAllPages<StripeDispute>(secretKey, "/disputes", {});
  const openStatuses = new Set([
    "needs_response",
    "warning_needs_response",
    "under_review",
    "warning_under_review",
  ]);
  return all.filter((d) => openStatuses.has(d.status));
}

async function fetchPayouts(secretKey: string): Promise<StripePayout[]> {
  const page = await fetchStripe<StripePayout>(secretKey, "/payouts", { limit: "30" });
  return page.data;
}

function aggregateOperations(
  charges: StripeCharge[],
  windowDisputes: StripeDispute[],
  openDisputes: StripeDispute[],
  payouts: StripePayout[]
): OperationsAggregate {
  const failed = charges.filter((c) => c.status === "failed");
  const failedTotal = failed.reduce((s, c) => s + c.amount, 0);

  const reasonMap = new Map<string, number>();
  for (const c of failed) {
    const code = c.failure_code ?? "unknown";
    reasonMap.set(code, (reasonMap.get(code) ?? 0) + 1);
  }
  const declineReasons: DeclineReasonRow[] = Array.from(reasonMap.entries())
    .map(([code, count]) => ({ code, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const activeDisputeCount = openDisputes.length;
  const activeDisputeTotal = openDisputes.reduce((s, d) => s + d.amount, 0);
  const disputesWon = windowDisputes.filter((d) => d.status === "won").length;
  const disputesLost = windowDisputes.filter((d) => d.status === "lost").length;

  const succeeded = charges.filter((c) => c.status === "succeeded");
  const pmMap = new Map<string, number>();
  for (const c of succeeded) {
    const type = c.payment_method_details?.type ?? "unknown";
    pmMap.set(type, (pmMap.get(type) ?? 0) + 1);
  }
  const pmTotal = succeeded.length || 1;
  const paymentMethodMix = Array.from(pmMap.entries())
    .map(([type, count]) => ({ type, count, pct: (count / pmTotal) * 100 }))
    .sort((a, b) => b.count - a.count);

  const pending = payouts.filter((p) => p.status === "pending" || p.status === "in_transit");
  const paid = payouts.filter((p) => p.status === "paid");
  const nextPayoutRow = pending.sort((a, b) => a.arrival_date - b.arrival_date)[0] ?? null;
  const lastPayoutRow = paid.sort((a, b) => b.arrival_date - a.arrival_date)[0] ?? null;

  return {
    failedCount: failed.length,
    failedTotal,
    declineReasons,
    activeDisputeCount,
    activeDisputeTotal,
    disputesWon,
    disputesLost,
    paymentMethodMix,
    nextPayout: nextPayoutRow
      ? { amount: nextPayoutRow.amount, arrivalDate: unixToDate(nextPayoutRow.arrival_date) }
      : null,
    lastPayout: lastPayoutRow
      ? {
          amount: lastPayoutRow.amount,
          arrivalDate: unixToDate(lastPayoutRow.arrival_date),
          status: lastPayoutRow.status,
        }
      : null,
  };
}

// ===== Insights =====

function buildInsights(
  charges: StripeCharge[],
  revenue: RevenueAggregate,
  subs: SubscriptionAggregate,
  ops: OperationsAggregate,
  openDisputes: StripeDispute[]
): Insights {
  const biggestRevenueDay =
    revenue.days.length > 0 ? revenue.days.reduce((a, b) => (b.gross > a.gross ? b : a)) : null;

  const succeeded = charges.filter((c) => c.status === "succeeded");
  let biggestCharge: Insights["biggestCharge"] = null;
  if (succeeded.length > 0) {
    const top = succeeded.reduce((a, b) => (b.amount > a.amount ? b : a));
    let label = "Unknown customer";
    if (top.customer && typeof top.customer === "object") {
      label = top.customer.name ?? top.customer.email ?? top.customer.id;
    } else if (typeof top.customer === "string") {
      label = top.customer;
    }
    biggestCharge = { customerLabel: label, amount: top.amount };
  }

  let topChurnPlan: Insights["topChurnPlan"] = null;
  if (subs.plans.length > 0) {
    const withChurn = subs.plans.filter((p) => p.churnedCount > 0);
    if (withChurn.length > 0) {
      const top = withChurn.reduce((a, b) => (b.churnedCount > a.churnedCount ? b : a));
      topChurnPlan = { planName: top.planName, count: top.churnedCount };
    }
  }

  // Stripe issues both `needs_response` (regular dispute) and `warning_needs_response`
  // (early-warning dispute / inquiry). Both require merchant action — surface them together.
  const needsResponse = openDisputes.filter(
    (d) => d.status === "needs_response" || d.status === "warning_needs_response"
  );
  const disputesNeedingAttention =
    needsResponse.length > 0
      ? {
          count: needsResponse.length,
          total: needsResponse.reduce((s, d) => s + d.amount, 0),
        }
      : null;

  const dailyFailureMap = new Map<string, number>();
  for (const date of revenue.days.map((d) => d.date)) dailyFailureMap.set(date, 0);
  for (const c of charges.filter((c) => c.status === "failed")) {
    const d = unixToDate(c.created);
    if (dailyFailureMap.has(d)) dailyFailureMap.set(d, dailyFailureMap.get(d)! + 1);
  }
  const counts = Array.from(dailyFailureMap.values());
  let failureSpike: Insights["failureSpike"] = null;
  if (counts.length > 1) {
    const mean = counts.reduce((s, n) => s + n, 0) / counts.length;
    const variance = counts.reduce((s, n) => s + (n - mean) ** 2, 0) / counts.length;
    const stddev = Math.sqrt(variance);
    const threshold = mean + 2 * stddev;
    for (const [date, count] of dailyFailureMap.entries()) {
      if (count > threshold && count > 0) {
        failureSpike = { date, count, baselineMean: mean };
        break;
      }
    }
  }

  return {
    biggestRevenueDay: biggestRevenueDay
      ? { date: biggestRevenueDay.date, gross: biggestRevenueDay.gross }
      : null,
    biggestCharge,
    topChurnPlan,
    disputesNeedingAttention,
    failureSpike,
  };
}

// ===== Formatting =====

function centsToDollars(amount: number): string {
  return (amount / 100).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatPct(pct: number): string {
  return `${pct.toFixed(2)}%`;
}

function escapeCell(s: string): string {
  return s.replace(/\|/g, "\\|");
}

// ===== Markdown rendering =====

function renderReport(
  revenue: RevenueAggregate,
  subs: SubscriptionAggregate,
  ops: OperationsAggregate,
  insights: Insights,
  range: DateRange
): string {
  const lines: string[] = [];

  lines.push("# Stripe Daily Report");
  lines.push(`**Period:** ${range.startDate} → ${range.endDate}`);
  lines.push(
    `**Generated:** ${new Date().toLocaleDateString("en-US", {
      day: "numeric",
      month: "long",
      year: "numeric",
    })}, ${new Date()
      .toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })
      .toLowerCase()}`
  );
  lines.push("");
  lines.push("---");
  lines.push("");

  lines.push("## Revenue Snapshot");
  lines.push("");
  lines.push("| Metric | Value |");
  lines.push("|---|---|");
  lines.push(`| Gross revenue | USD ${centsToDollars(revenue.grossRevenue)} |`);
  lines.push(`| Refunds | USD ${centsToDollars(revenue.refunds)} |`);
  lines.push(`| Stripe fees | USD ${centsToDollars(revenue.fees)} |`);
  lines.push(`| **Net revenue** | **USD ${centsToDollars(revenue.netRevenue)}** |`);
  lines.push(`| Successful charges | ${revenue.successfulCount.toLocaleString()} |`);
  lines.push(`| Failed charges | ${revenue.failedCount.toLocaleString()} |`);
  lines.push(`| Success rate | ${formatPct(revenue.successRate)} |`);
  lines.push(`| Average order value | USD ${centsToDollars(revenue.aov)} |`);
  lines.push("");

  lines.push("### Day-by-day");
  lines.push("");
  lines.push("| Date | Charges | Gross | Refunds | Net |");
  lines.push("|---|---|---|---|---|");
  for (const row of revenue.days) {
    lines.push(
      `| ${row.date} | ${row.chargeCount} | USD ${centsToDollars(row.gross)} | USD ${centsToDollars(row.refunds)} | USD ${centsToDollars(row.net)} |`
    );
  }
  lines.push("");
  lines.push("---");
  lines.push("");

  lines.push("## Subscription Health");
  lines.push("");
  if (!subs.hasSubscriptions) {
    lines.push("_No subscription data — skipping._");
    lines.push("");
  } else {
    lines.push("| Metric | Value |");
    lines.push("|---|---|");
    lines.push(`| **MRR** | **USD ${centsToDollars(subs.mrr)}** |`);
    lines.push(`| ARR | USD ${centsToDollars(subs.arr)} |`);
    lines.push(`| Active subscribers | ${subs.activeSubscribers.toLocaleString()} |`);
    lines.push(`| New subscriptions | ${subs.newSubscriptions.toLocaleString()} |`);
    lines.push(`| Churned subscriptions | ${subs.churnedSubscriptions.toLocaleString()} |`);
    lines.push(
      `| Net MRR change | USD ${centsToDollars(Math.abs(subs.netMrrChange))}${subs.netMrrChange < 0 ? " (negative)" : ""} |`
    );
    lines.push(`| Trial subscribers | ${subs.trialSubscribers.toLocaleString()} |`);
    lines.push(`| Trial → paid conversions | ${subs.trialConversions.toLocaleString()} |`);
    lines.push(`| Churn rate | ${formatPct(subs.churnRate)} |`);
    lines.push("");
    if (subs.plans.length > 0) {
      lines.push("### By plan");
      lines.push("");
      lines.push("| Plan | Active | New | Churned | MRR |");
      lines.push("|---|---|---|---|---|");
      for (const p of subs.plans) {
        lines.push(
          `| ${escapeCell(p.planName)} | ${p.activeCount} | ${p.newCount} | ${p.churnedCount} | USD ${centsToDollars(p.mrrContribution)} |`
        );
      }
      lines.push("");
    }
  }
  lines.push("---");
  lines.push("");

  lines.push("## Payment Operations");
  lines.push("");
  lines.push("### Failures");
  lines.push("");
  lines.push(
    `Failed charges: **${ops.failedCount}** totaling **USD ${centsToDollars(ops.failedTotal)}**`
  );
  lines.push("");
  if (ops.declineReasons.length > 0) {
    lines.push("| Decline reason | Count |");
    lines.push("|---|---|");
    for (const r of ops.declineReasons) {
      lines.push(`| ${escapeCell(r.code)} | ${r.count} |`);
    }
  } else {
    lines.push("_No failed charges in window._");
  }
  lines.push("");

  lines.push("### Disputes");
  lines.push("");
  lines.push(
    `Active disputes: **${ops.activeDisputeCount}** totaling **USD ${centsToDollars(ops.activeDisputeTotal)}**`
  );
  lines.push(`Resolved in window: ${ops.disputesWon} won, ${ops.disputesLost} lost`);
  lines.push("");

  if (ops.paymentMethodMix.length > 0) {
    lines.push("### Payment method mix");
    lines.push("");
    lines.push("| Method | Share | Count |");
    lines.push("|---|---|---|");
    for (const p of ops.paymentMethodMix) {
      lines.push(`| ${escapeCell(p.type)} | ${formatPct(p.pct)} | ${p.count} |`);
    }
    lines.push("");
  }

  lines.push("### Payouts");
  lines.push("");
  if (ops.nextPayout) {
    lines.push(
      `Next payout: **USD ${centsToDollars(ops.nextPayout.amount)}** arriving ${ops.nextPayout.arrivalDate}`
    );
  } else {
    lines.push("Next payout: _none pending_");
  }
  if (ops.lastPayout) {
    lines.push(
      `Last payout: USD ${centsToDollars(ops.lastPayout.amount)} on ${ops.lastPayout.arrivalDate} (${ops.lastPayout.status})`
    );
  } else {
    lines.push("Last payout: _none on record_");
  }
  lines.push("");
  lines.push("---");
  lines.push("");

  lines.push("## Insights");
  lines.push("");
  const bullets: string[] = [];
  if (insights.biggestRevenueDay) {
    bullets.push(
      `Biggest revenue day: **${insights.biggestRevenueDay.date}** (USD ${centsToDollars(insights.biggestRevenueDay.gross)})`
    );
  }
  if (insights.biggestCharge) {
    bullets.push(
      `Biggest single charge: **USD ${centsToDollars(insights.biggestCharge.amount)}** — ${escapeCell(insights.biggestCharge.customerLabel)}`
    );
  }
  if (insights.topChurnPlan) {
    bullets.push(
      `Plan with most churn: **${escapeCell(insights.topChurnPlan.planName)}** (${insights.topChurnPlan.count} churned)`
    );
  }
  if (insights.disputesNeedingAttention) {
    bullets.push(
      `⚠️ **${insights.disputesNeedingAttention.count} dispute(s) need response** — total USD ${centsToDollars(insights.disputesNeedingAttention.total)}`
    );
  }
  if (insights.failureSpike) {
    bullets.push(
      `Failure spike: **${insights.failureSpike.date}** had ${insights.failureSpike.count} failures (baseline mean ${insights.failureSpike.baselineMean.toFixed(1)})`
    );
  }
  if (bullets.length === 0) {
    lines.push("_No notable insights for this period._");
  } else {
    for (const b of bullets) lines.push(`- ${b}`);
  }
  lines.push("");

  return lines.join("\n");
}

// ===== Write report =====

function writeReport(content: string, runDate: string): string {
  const reportsDir = path.join(DATA_DIR, "reports");
  const fileName = `stripe-${runDate}.md`;
  const filePath = path.join(reportsDir, fileName);

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
  console.log("[stripe] Starting Stripe connector...");

  const creds = loadCredentials();
  const range = resolveDateRange();
  const runDate = formatDate(new Date());

  console.log(`[stripe] Report window: ${range.startDate} → ${range.endDate}`);

  console.log("[stripe] Fetching charges, refunds, and balance transactions...");
  const [charges, refunds, balanceTxns] = await Promise.all([
    fetchCharges(creds.secretKey, range),
    fetchRefunds(creds.secretKey, range),
    fetchBalanceTransactions(creds.secretKey, range),
  ]);
  console.log(
    `[stripe] ${charges.length} charge(s), ${refunds.length} refund(s), ${balanceTxns.length} balance txn(s)`
  );

  console.log("[stripe] Fetching subscriptions and products...");
  const [subs, products] = await Promise.all([
    fetchSubscriptions(creds.secretKey),
    fetchProducts(creds.secretKey),
  ]);
  enrichSubscriptionsWithProducts(subs, products);
  console.log(`[stripe] ${subs.length} subscription(s), ${products.length} product(s)`);

  console.log("[stripe] Fetching disputes and payouts...");
  const [windowDisputes, openDisputes, payouts] = await Promise.all([
    fetchDisputesInWindow(creds.secretKey, range),
    fetchAllOpenDisputes(creds.secretKey),
    fetchPayouts(creds.secretKey),
  ]);
  console.log(
    `[stripe] ${windowDisputes.length} window dispute(s), ${openDisputes.length} open dispute(s), ${payouts.length} payout(s)`
  );

  console.log("[stripe] Aggregating...");
  const revenue = aggregateRevenue(charges, refunds, balanceTxns, range);
  const subAgg = aggregateSubscriptions(subs, range);
  const ops = aggregateOperations(charges, windowDisputes, openDisputes, payouts);
  const insights = buildInsights(charges, revenue, subAgg, ops, openDisputes);

  console.log("[stripe] Rendering report...");
  const report = renderReport(revenue, subAgg, ops, insights, range);

  const filePath = writeReport(report, runDate);
  console.log(`[stripe] Report written to ${filePath}`);
}

if (require.main === module) {
  main().catch((err) => {
    console.error("[stripe] Error:", err.message ?? err);
    process.exit(1);
  });
}
