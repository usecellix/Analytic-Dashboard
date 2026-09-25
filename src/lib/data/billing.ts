import { adminDb } from "../mongodb";
import { sinceFilter, type ResolvedRange } from "../range";
import { num, PLAN_PRICE_INR, resolveOwners, type OwnerSummary } from "./common";
import { toLedgerRow, type LedgerRow } from "./users";

export interface SubscriptionRow {
  id: string;
  owner: OwnerSummary;
  planTier: string;
  status: string;
  priceInr: number;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  createdAt: string | null;
}

export async function getBilling(range: ResolvedRange) {
  const db = await adminDb();
  const [subs, accounts, ledgerSums, ledger] = await Promise.all([
    db.collection("subscriptions").find({}).sort({ createdAt: -1 }).toArray(),
    db.collection("credit_accounts").find({}).toArray(),
    db
      .collection("credit_ledger")
      .aggregate<{ _id: string; amount: number; count: number }>([
        { $match: sinceFilter("createdAt", range) },
        { $group: { _id: "$entryType", amount: { $sum: "$amount" }, count: { $sum: 1 } } },
      ])
      .toArray(),
    db.collection("credit_ledger").find(sinceFilter("createdAt", range)).sort({ createdAt: -1 }).limit(30).toArray(),
  ]);

  const owners = await resolveOwners(db, [
    ...subs.map((s) => s.billingEntityId as string),
    ...accounts.map((a) => a.billingEntityId as string),
    ...ledger.map((l) => l.billingEntityId as string),
  ]);

  const rows: SubscriptionRow[] = subs.map((s) => ({
    id: s._id.toHexString(),
    owner: owners.get(s.billingEntityId)!,
    planTier: s.planTier,
    status: s.status,
    priceInr: PLAN_PRICE_INR[s.planTier] ?? 0,
    currentPeriodEnd: s.currentPeriodEnd ? new Date(s.currentPeriodEnd).toISOString() : null,
    cancelAtPeriodEnd: Boolean(s.cancelAtPeriodEnd),
    createdAt: s.createdAt ? new Date(s.createdAt).toISOString() : null,
  }));

  const statusCounts: Record<string, number> = {};
  const activeByPlan: Record<string, number> = {};
  let mrrInr = 0;
  for (const row of rows) {
    statusCounts[row.status] = (statusCounts[row.status] ?? 0) + 1;
    if (row.status === "active") {
      activeByPlan[row.planTier] = (activeByPlan[row.planTier] ?? 0) + 1;
      mrrInr += row.priceInr;
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
    subscriptions: rows,
    statusCounts,
    activeByPlan,
    mrrInr,
    activeCount: rows.filter((r) => r.status === "active").length,
    cancelling: rows.filter((r) => r.status === "active" && r.cancelAtPeriodEnd).length,
    accounts: {
      total: accounts.length,
      guest: accounts.filter((a) => owners.get(a.billingEntityId)?.guest).length,
      planDistribution,
      credits,
    },
    flows,
    ledger: ledger.map((doc) => ({ ...toLedgerRow(doc), owner: owners.get(doc.billingEntityId)! })) as (LedgerRow & {
      owner: OwnerSummary;
    })[],
  };
}
