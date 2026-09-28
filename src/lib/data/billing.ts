import { adminApiGet } from "../adminApi";
import type { ResolvedRange } from "../range";
import type { OwnerSummary } from "./common";
import type { LedgerRow } from "./users";

export const SUBS_PAGE_SIZE = 25;
export const LEDGER_PAGE_SIZE = 25;

export const SUB_SORTS = {
  recent: { label: "Newest" },
  price: { label: "Highest price" },
  period: { label: "Period end" },
} as const;
export type SubSort = keyof typeof SUB_SORTS;

export const LEDGER_SORTS = {
  recent: { label: "Newest" },
  amount: { label: "Largest amount" },
} as const;
export type LedgerSort = keyof typeof LEDGER_SORTS;

export interface SubscriptionRow {
  id: string;
  billingEntityId: string;
  owner: OwnerSummary;
  planTier: string;
  status: string;
  priceInr: number;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  createdAt: string | null;
}

export interface BillingSummary {
  statusCounts: Record<string, number>;
  activeByPlan: Record<string, number>;
  mrrInr: number;
  activeCount: number;
  cancelling: number;
  accounts: {
    total: number;
    guest: number;
    planDistribution: Record<string, number>;
    credits: { plan: number; purchased: number; oneTime: number };
  };
  flows: Record<string, { amount: number; count: number }>;
}

/** Pulled from cellix_backend's GET /admin/billing/summary (AdminBillingService.getBillingSummary). */
export async function getBillingSummary(range: ResolvedRange): Promise<BillingSummary> {
  return adminApiGet<BillingSummary>("/admin/billing/summary", { range: range.key });
}

/** Pulled from cellix_backend's GET /admin/billing/subscriptions (AdminBillingService.listSubscriptions). */
export async function listSubscriptions(filters: {
  range: ResolvedRange;
  q?: string;
  status?: string;
  plan?: string;
  sort: SubSort;
  page: number;
}): Promise<{ rows: SubscriptionRow[]; total: number }> {
  return adminApiGet("/admin/billing/subscriptions", {
    range: filters.range.key,
    q: filters.q,
    status: filters.status,
    plan: filters.plan,
    sort: filters.sort,
    page: filters.page,
  });
}

/** Pulled from cellix_backend's GET /admin/billing/ledger (AdminBillingService.listLedger). */
export async function listLedger(filters: {
  range: ResolvedRange;
  q?: string;
  entryType?: string;
  sort: LedgerSort;
  page: number;
}): Promise<{ rows: (LedgerRow & { owner: OwnerSummary })[]; total: number }> {
  return adminApiGet("/admin/billing/ledger", {
    range: filters.range.key,
    q: filters.q,
    entryType: filters.entryType,
    sort: filters.sort,
    page: filters.page,
  });
}

/** @deprecated Prefer getBillingSummary + listSubscriptions + listLedger */
export async function getBilling(range: ResolvedRange) {
  const [summary, subs, ledger] = await Promise.all([
    getBillingSummary(range),
    listSubscriptions({ range, sort: "recent", page: 1 }),
    listLedger({ range, sort: "recent", page: 1 }),
  ]);
  return {
    subscriptions: subs.rows,
    ...summary,
    ledger: ledger.rows,
  };
}
