import type { Document } from "mongodb";
import { adminDb } from "../mongodb";
import { escapeRegex, num, toObjectId, usersById } from "./common";
import { toPromptRow } from "./prompts";

export const USERS_PAGE_SIZE = 25;

export interface CreditBalance {
  planTier: string;
  planCredits: number;
  purchasedCredits: number;
  oneTimeCredits: number;
  total: number;
  currentPeriodEnd: string | null;
}

function toBalance(doc: Document | null | undefined): CreditBalance | null {
  if (!doc) return null;
  const planCredits = num(doc.planCredits);
  const purchasedCredits = num(doc.purchasedCredits);
  const oneTimeCredits = num(doc.oneTimeCredits);
  return {
    planTier: doc.planTier ?? "free",
    planCredits,
    purchasedCredits,
    oneTimeCredits,
    total: planCredits + purchasedCredits + oneTimeCredits,
    currentPeriodEnd: doc.currentPeriodEnd ? new Date(doc.currentPeriodEnd).toISOString() : null,
  };
}

export interface UserRow {
  id: string;
  name: string;
  email: string;
  image: string | null;
  createdAt: string | null;
  lastSeenAt: string | null;
  plan: string;
  subscriptionStatus: string | null;
  credits: number | null;
  prompts: number;
  costUsd: number;
  lastPromptAt: string | null;
}

export async function listUsers({ q, page }: { q?: string; page: number }) {
  const db = await adminDb();
  const where: Document = {};
  if (q) {
    const pattern = { $regex: escapeRegex(q.slice(0, 200)), $options: "i" };
    where.$or = [{ email: pattern }, { name: pattern }];
  }

  const [docs, total] = await Promise.all([
    db
      .collection("user")
      .find(where, { projection: { name: 1, email: 1, image: 1, createdAt: 1 } })
      .sort({ createdAt: -1 })
      .skip((page - 1) * USERS_PAGE_SIZE)
      .limit(USERS_PAGE_SIZE)
      .toArray(),
    db.collection("user").countDocuments(where),
  ]);

  const ids = docs.map((d) => d._id.toHexString());
  const [accounts, subs, usage, sessions] = await Promise.all([
    db.collection("credit_accounts").find({ billingEntityId: { $in: ids } }).toArray(),
    db
      .collection("subscriptions")
      .find({ billingEntityId: { $in: ids } })
      .sort({ updatedAt: -1 })
      .toArray(),
    db
      .collection("ai_prompts")
      .aggregate<{ _id: string; prompts: number; costUsd: number; last: Date }>([
        { $match: { userId: { $in: ids } } },
        { $group: { _id: "$userId", prompts: { $sum: 1 }, costUsd: { $sum: "$costUsd" }, last: { $max: "$createdAt" } } },
      ])
      .toArray(),
    db
      .collection("session")
      .aggregate<{ _id: unknown; last: Date }>([
        { $match: { userId: { $in: docs.map((d) => d._id) } } },
        { $group: { _id: "$userId", last: { $max: "$updatedAt" } } },
      ])
      .toArray(),
  ]);

  const accountBy = new Map(accounts.map((a) => [a.billingEntityId as string, a]));
  const subBy = new Map<string, Document>();
  for (const sub of subs) if (!subBy.has(sub.billingEntityId)) subBy.set(sub.billingEntityId, sub);
  const usageBy = new Map(usage.map((u) => [u._id, u]));
  const seenBy = new Map(sessions.map((s) => [String(s._id), s.last]));

  const rows: UserRow[] = docs.map((doc) => {
    const id = doc._id.toHexString();
    const account = toBalance(accountBy.get(id));
    const sub = subBy.get(id);
    const use = usageBy.get(id);
    const seen = seenBy.get(id);
    return {
      id,
      name: doc.name ?? "",
      email: doc.email ?? "",
      image: doc.image ?? null,
      createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : null,
      lastSeenAt: seen ? new Date(seen).toISOString() : null,
      plan: account?.planTier ?? "free",
      subscriptionStatus: sub?.status ?? null,
      credits: account?.total ?? null,
      prompts: use?.prompts ?? 0,
      costUsd: use?.costUsd ?? 0,
      lastPromptAt: use?.last ? new Date(use.last).toISOString() : null,
    };
  });

  return { rows, total };
}

export async function getUser(id: string) {
  const db = await adminDb();
  const objectId = toObjectId(id);
  if (!objectId) return null;
  const doc = await db.collection("user").findOne({ _id: objectId });
  if (!doc) return null;

  const since30 = new Date(Date.now() - 30 * 86_400_000);
  const [account, subs, ledger, recent, allTime, last30, sessionAgg, conversations, oauth] = await Promise.all([
    db.collection("credit_accounts").findOne({ billingEntityId: id }),
    db.collection("subscriptions").find({ billingEntityId: id }).sort({ createdAt: -1 }).toArray(),
    db.collection("credit_ledger").find({ billingEntityId: id }).sort({ createdAt: -1 }).limit(25).toArray(),
    db.collection("ai_prompts").find({ userId: id }).sort({ createdAt: -1 }).limit(15).toArray(),
    summarize(db, { userId: id }),
    summarize(db, { userId: id, createdAt: { $gte: since30 } }),
    db
      .collection("session")
      .aggregate([
        { $match: { userId: objectId } },
        { $group: { _id: null, count: { $sum: 1 }, last: { $max: "$updatedAt" } } },
      ])
      .toArray(),
    db.collection("conversations").countDocuments({ userId: id }),
    db.collection("account").find({ userId: objectId }, { projection: { providerId: 1 } }).toArray(),
  ]);

  const people = await usersById(db, [id]);
  return {
    user: {
      id,
      name: doc.name ?? "",
      email: doc.email ?? "",
      image: doc.image ?? null,
      emailVerified: Boolean(doc.emailVerified),
      createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : null,
      providers: [...new Set(oauth.map((a) => a.providerId as string))],
    },
    sessions: {
      count: num(sessionAgg[0]?.count),
      lastSeenAt: sessionAgg[0]?.last ? new Date(sessionAgg[0].last).toISOString() : null,
    },
    conversations,
    balance: toBalance(account),
    subscriptions: subs.map((s) => ({
      id: s._id.toHexString(),
      planTier: s.planTier as string,
      status: s.status as string,
      currentPeriodEnd: s.currentPeriodEnd ? new Date(s.currentPeriodEnd).toISOString() : null,
      cancelAtPeriodEnd: Boolean(s.cancelAtPeriodEnd),
      createdAt: s.createdAt ? new Date(s.createdAt).toISOString() : null,
    })),
    ledger: ledger.map(toLedgerRow),
    recentPrompts: recent.map((p) => toPromptRow(p, people)),
    usage: { allTime, last30 },
  };
}

async function summarize(db: Awaited<ReturnType<typeof adminDb>>, match: Document) {
  const [row] = await db
    .collection("ai_prompts")
    .aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          prompts: { $sum: 1 },
          calls: { $sum: "$llmCalls" },
          tokens: { $sum: "$totalTokens" },
          costUsd: { $sum: "$costUsd" },
        },
      },
    ])
    .toArray();
  return {
    prompts: num(row?.prompts),
    calls: num(row?.calls),
    tokens: num(row?.tokens),
    costUsd: num(row?.costUsd),
  };
}

export interface LedgerRow {
  id: string;
  billingEntityId: string;
  entryType: string;
  amount: number;
  bucket: string;
  actionType: string | null;
  conversationId: string | null;
  createdAt: string | null;
}

export function toLedgerRow(doc: Document): LedgerRow {
  return {
    id: doc._id.toHexString(),
    billingEntityId: doc.billingEntityId,
    entryType: doc.entryType,
    amount: num(doc.amount),
    bucket: doc.bucket,
    actionType: doc.actionType ?? null,
    conversationId: doc.conversationId ?? null,
    createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : null,
  };
}
