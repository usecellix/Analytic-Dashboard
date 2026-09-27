import type { Document } from "mongodb";
import { adminDb } from "../mongodb";
import { sinceFilter, type ResolvedRange } from "../range";
import { escapeRegex, num, PLAN_PRICE_INR, resolveOwners, type OwnerSummary } from "./common";
import { toLedgerRow, type LedgerRow } from "./users";

export const SUBS_PAGE_SIZE = 25;
export const LEDGER_PAGE_SIZE = 25;

export const SUB_SORTS = {
  recent: { label: "Newest", field: "createdAt" as const, dir: -1 as const },
  price: { label: "Highest price", field: "priceInr" as const, dir: -1 as const },
  period: { label: "Period end", field: "currentPeriodEnd" as const, dir: 1 as const },
} as const;
export type SubSort = keyof typeof SUB_SORTS;

export const LEDGER_SORTS = {
  recent: { label: "Newest", field: "createdAt" as const, dir: -1 as const },
  amount: { label: "Largest amount", field: "amountAbs" as const, dir: -1 as const },
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

export async function getBillingSummary(range: ResolvedRange): Promise<BillingSummary> {
  const db = await adminDb();
  const [subs, accounts, ledgerSums] = await Promise.all([
    db.collection("subscriptions").find({}).toArray(),
    db.collection("credit_accounts").find({}).toArray(),
    db
      .collection("credit_ledger")
      .aggregate<{ _id: string; amount: number; count: number }>([
        { $match: sinceFilter("createdAt", range) },
        { $group: { _id: "$entryType", amount: { $sum: "$amount" }, count: { $sum: 1 } } },
      ])
      .toArray(),
  ]);

  const owners = await resolveOwners(db, [
    ...subs.map((s) => s.billingEntityId as string),
    ...accounts.map((a) => a.billingEntityId as string),
  ]);

  const statusCounts: Record<string, number> = {};
  const activeByPlan: Record<string, number> = {};
  let mrrInr = 0;
  let activeCount = 0;
  let cancelling = 0;
  for (const s of subs) {
    statusCounts[s.status] = (statusCounts[s.status] ?? 0) + 1;
    if (s.status === "active") {
      activeCount += 1;
      const price = PLAN_PRICE_INR[s.planTier] ?? 0;
      activeByPlan[s.planTier] = (activeByPlan[s.planTier] ?? 0) + 1;
      mrrInr += price;
      if (s.cancelAtPeriodEnd) cancelling += 1;
    }
  }

  const planDistribution: Record<string, number> = {};
  const credits = { plan: 0, purchased: 0, oneTime: 0 };
  for (const a of accounts) {
    planDistribution[a.planTier] = (planDistribution[a.planTier] ?? 0) + 1;
    credits.plan += num(a.planCredits);
    credits.purchased += num(a.purchasedCredits);
    credits.oneTime += num(a.oneTimeCredits);
  }

  const flows: Record<string, { amount: number; count: number }> = {};
  for (const row of ledgerSums) flows[row._id] = { amount: row.amount, count: row.count };

  return {
    statusCounts,
    activeByPlan,
    mrrInr,
    activeCount,
    cancelling,
    accounts: {
      total: accounts.length,
      guest: accounts.filter((a) => owners.get(a.billingEntityId)?.guest).length,
      planDistribution,
      credits,
    },
    flows,
  };
}

export async function listSubscriptions(filters: {
  range: ResolvedRange;
  q?: string;
  status?: string;
  plan?: string;
  sort: SubSort;
  page: number;
}) {
  const db = await adminDb();
  const where: Document = { ...sinceFilter("createdAt", filters.range) };
  if (filters.status) where.status = filters.status;
  if (filters.plan) where.planTier = filters.plan;

  const docs = await db.collection("subscriptions").find(where).sort({ createdAt: -1 }).toArray();
  const owners = await resolveOwners(
    db,
    docs.map((s) => s.billingEntityId as string),
  );

  let rows: SubscriptionRow[] = docs.map((s) => ({
    id: s._id.toHexString(),
    billingEntityId: s.billingEntityId,
    owner: owners.get(s.billingEntityId)!,
    planTier: s.planTier,
    status: s.status,
    priceInr: PLAN_PRICE_INR[s.planTier] ?? 0,
    currentPeriodEnd: s.currentPeriodEnd ? new Date(s.currentPeriodEnd).toISOString() : null,
    cancelAtPeriodEnd: Boolean(s.cancelAtPeriodEnd),
    createdAt: s.createdAt ? new Date(s.createdAt).toISOString() : null,
  }));

  if (filters.q) {
    const q = filters.q.toLowerCase();
    rows = rows.filter(
      (r) =>
        r.owner.label.toLowerCase().includes(q) ||
        (r.owner.email?.toLowerCase().includes(q) ?? false) ||
        r.billingEntityId.toLowerCase().includes(q),
    );
  }

  const sortDef = SUB_SORTS[filters.sort];
  rows.sort((a, b) => {
    const av = a[sortDef.field];
    const bv = b[sortDef.field];
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    if (typeof av === "number" && typeof bv === "number") return (av - bv) * sortDef.dir;
    return String(av).localeCompare(String(bv)) * sortDef.dir;
  });

  const total = rows.length;
  const start = (filters.page - 1) * SUBS_PAGE_SIZE;
  return { rows: rows.slice(start, start + SUBS_PAGE_SIZE), total };
}

export async function listLedger(filters: {
  range: ResolvedRange;
  q?: string;
  entryType?: string;
  sort: LedgerSort;
  page: number;
}) {
  const db = await adminDb();
  const where: Document = { ...sinceFilter("createdAt", filters.range) };
  if (filters.entryType) where.entryType = filters.entryType;
  if (filters.q) {
    const pattern = { $regex: escapeRegex(filters.q.slice(0, 200)), $options: "i" };
    where.$or = [{ billingEntityId: pattern }, { actionType: pattern }, { conversationId: pattern }];
  }

  const sortField = filters.sort === "amount" ? "amount" : "createdAt";
  const sortDir = filters.sort === "amount" ? -1 : -1;

  const [docs, total] = await Promise.all([
    db
      .collection("credit_ledger")
      .find(where)
      .sort({ [sortField]: sortDir, _id: -1 })
      .skip((filters.page - 1) * LEDGER_PAGE_SIZE)
      .limit(LEDGER_PAGE_SIZE)
      .toArray(),
    db.collection("credit_ledger").countDocuments(where),
  ]);

  const owners = await resolveOwners(
    db,
    docs.map((l) => l.billingEntityId as string),
  );

  const rows = docs.map((doc) => ({ ...toLedgerRow(doc), owner: owners.get(doc.billingEntityId)! })) as (LedgerRow & {
    owner: OwnerSummary;
  })[];

  return { rows, total };
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
