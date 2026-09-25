import { adminDb } from "../mongodb";
import { sinceFilter, type ResolvedRange } from "../range";
import { fillBuckets, num, PLAN_PRICE_INR, TZ, usersById, type SeriesPoint, type UserSummary } from "./common";
import { toPromptRow, type PromptRow } from "./prompts";

export interface OverviewData {
  totals: {
    prompts: number;
    llmCalls: number;
    failedCalls: number;
    totalTokens: number;
    costUsd: number;
    erroredPrompts: number;
    activeUsers: number;
  };
  spendSeries: SeriesPoint[];
  promptSeries: SeriesPoint[];
  topUsers: { user: UserSummary | null; userId: string | null; prompts: number; costUsd: number; tokens: number }[];
  topModels: { model: string; calls: number; costUsd: number; tokens: number }[];
  users: { total: number; newInRange: number };
  subscriptions: { active: number; mrrInr: number; byPlan: Record<string, number> };
  recentPrompts: PromptRow[];
}

export async function getOverview(range: ResolvedRange): Promise<OverviewData> {
  const db = await adminDb();
  const prompts = db.collection("ai_prompts");
  const match = sinceFilter("createdAt", range);

  const seriesFrom =
    range.from ??
    (await prompts.find({}, { projection: { createdAt: 1 } }).sort({ createdAt: 1 }).limit(1).next())?.createdAt ??
    new Date(range.to.getTime() - 30 * 86_400_000);

  const [totalsAgg, seriesAgg, topUsersAgg, modelAgg, recent, usersTotal, usersNew, activeSubs] = await Promise.all([
    prompts
      .aggregate([
        { $match: match },
        {
          $group: {
            _id: null,
            prompts: { $sum: 1 },
            llmCalls: { $sum: "$llmCalls" },
            failedCalls: { $sum: "$failedCalls" },
            totalTokens: { $sum: "$totalTokens" },
            costUsd: { $sum: "$costUsd" },
            erroredPrompts: { $sum: { $cond: [{ $eq: ["$lastOutcome", "error"] }, 1, 0] } },
            users: { $addToSet: "$userId" },
          },
        },
      ])
      .toArray(),
    prompts
      .aggregate<{ _id: Date; cost: number; count: number }>([
        { $match: { createdAt: { $gte: seriesFrom } } },
        {
          $group: {
            _id: { $dateTrunc: { date: "$createdAt", unit: range.bucket, timezone: TZ } },
            cost: { $sum: "$costUsd" },
            count: { $sum: 1 },
          },
        },
      ])
      .toArray(),
    prompts
      .aggregate<{ _id: string | null; prompts: number; costUsd: number; tokens: number }>([
        { $match: match },
        { $group: { _id: "$userId", prompts: { $sum: 1 }, costUsd: { $sum: "$costUsd" }, tokens: { $sum: "$totalTokens" } } },
        { $sort: { costUsd: -1 } },
        { $limit: 6 },
      ])
      .toArray(),
    db
      .collection("llm_calls")
      .aggregate<{ _id: string; calls: number; costUsd: number; tokens: number }>([
        { $match: sinceFilter("ts", range) },
        { $group: { _id: "$model", calls: { $sum: 1 }, costUsd: { $sum: "$costUsd" }, tokens: { $sum: "$totalTokens" } } },
        { $sort: { costUsd: -1 } },
        { $limit: 6 },
      ])
      .toArray(),
    prompts.find(match).sort({ createdAt: -1 }).limit(8).toArray(),
    db.collection("user").countDocuments(),
    db.collection("user").countDocuments(sinceFilter("createdAt", range)),
    db
      .collection("subscriptions")
      .aggregate<{ _id: string; count: number }>([
        { $match: { status: "active" } },
        { $group: { _id: "$planTier", count: { $sum: 1 } } },
      ])
      .toArray(),
  ]);

  const t = totalsAgg[0] ?? {};
  const people = await usersById(db, [
    ...topUsersAgg.map((u) => u._id),
    ...recent.map((p) => p.userId as string | undefined),
  ]);

  const byPlan: Record<string, number> = {};
  let mrrInr = 0;
  for (const row of activeSubs) {
    byPlan[row._id] = row.count;
    mrrInr += (PLAN_PRICE_INR[row._id] ?? 0) * row.count;
  }

  return {
    totals: {
      prompts: num(t.prompts),
      llmCalls: num(t.llmCalls),
      failedCalls: num(t.failedCalls),
      totalTokens: num(t.totalTokens),
      costUsd: num(t.costUsd),
      erroredPrompts: num(t.erroredPrompts),
      activeUsers: Array.isArray(t.users) ? t.users.filter(Boolean).length : 0,
    },
    spendSeries: fillBuckets(range, seriesFrom, seriesAgg.map((r) => ({ _id: r._id, value: r.cost }))),
    promptSeries: fillBuckets(range, seriesFrom, seriesAgg.map((r) => ({ _id: r._id, value: r.count }))),
    topUsers: topUsersAgg.map((row) => ({
      userId: row._id,
      user: row._id ? (people.get(row._id) ?? null) : null,
      prompts: row.prompts,
      costUsd: row.costUsd,
      tokens: row.tokens,
    })),
    topModels: modelAgg.map((row) => ({ model: row._id, calls: row.calls, costUsd: row.costUsd, tokens: row.tokens })),
    users: { total: usersTotal, newInRange: usersNew },
    subscriptions: {
      active: activeSubs.reduce((sum, r) => sum + r.count, 0),
      mrrInr,
      byPlan,
    },
    recentPrompts: recent.map((doc) => toPromptRow(doc, people)),
  };
}
