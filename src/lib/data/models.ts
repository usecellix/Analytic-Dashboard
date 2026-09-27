import { adminDb } from "../mongodb";
import { sinceFilter, type ResolvedRange } from "../range";
import { escapeRegex, num } from "./common";

export const MODELS_PAGE_SIZE = 25;

export const USAGE_SORTS = {
  cost: { label: "Highest cost", field: "costUsd" as const, dir: -1 as const },
  calls: { label: "Most calls", field: "calls" as const, dir: -1 as const },
  errors: { label: "Most errors", field: "failed" as const, dir: -1 as const },
  latency: { label: "Slowest p95", field: "p95LatencyMs" as const, dir: -1 as const },
  name: { label: "Name A–Z", field: "key" as const, dir: 1 as const },
} as const;
export type UsageSort = keyof typeof USAGE_SORTS;

export interface UsageRow {
  key: string;
  calls: number;
  failed: number;
  retries: number;
  promptTokens: number;
  completionTokens: number;
  reasoningTokens: number;
  cachedTokens: number;
  totalTokens: number;
  costUsd: number;
  estimatedCostCalls: number;
  avgLatencyMs: number;
  p50LatencyMs: number | null;
  p95LatencyMs: number | null;
}

function groupStage(key: string) {
  return {
    $group: {
      _id: key,
      calls: { $sum: 1 },
      failed: { $sum: { $cond: ["$success", 0, 1] } },
      retries: { $sum: { $cond: [{ $gt: ["$attempt", 1] }, 1, 0] } },
      promptTokens: { $sum: "$promptTokens" },
      completionTokens: { $sum: "$completionTokens" },
      reasoningTokens: { $sum: "$reasoningTokens" },
      cachedTokens: { $sum: "$cachedTokens" },
      totalTokens: { $sum: "$totalTokens" },
      costUsd: { $sum: "$costUsd" },
      estimatedCostCalls: { $sum: { $cond: ["$costEstimated", 1, 0] } },
      avgLatencyMs: { $avg: "$latencyMs" },
      latency: { $percentile: { input: "$latencyMs", p: [0.5, 0.95], method: "approximate" } },
    },
  };
}

function toUsageRow(doc: Record<string, unknown>): UsageRow {
  const latency = Array.isArray(doc.latency) ? (doc.latency as number[]) : [];
  return {
    key: doc._id == null ? "(none)" : String(doc._id),
    calls: num(doc.calls),
    failed: num(doc.failed),
    retries: num(doc.retries),
    promptTokens: num(doc.promptTokens),
    completionTokens: num(doc.completionTokens),
    reasoningTokens: num(doc.reasoningTokens),
    cachedTokens: num(doc.cachedTokens),
    totalTokens: num(doc.totalTokens),
    costUsd: num(doc.costUsd),
    estimatedCostCalls: num(doc.estimatedCostCalls),
    avgLatencyMs: num(doc.avgLatencyMs),
    p50LatencyMs: latency[0] ?? null,
    p95LatencyMs: latency[1] ?? null,
  };
}

function paginateUsage(rows: UsageRow[], q: string | undefined, sort: UsageSort, page: number) {
  let filtered = rows;
  if (q) {
    const re = new RegExp(escapeRegex(q.slice(0, 200)), "i");
    filtered = rows.filter((r) => re.test(r.key));
  }
  const sortDef = USAGE_SORTS[sort];
  filtered = [...filtered].sort((a, b) => {
    const av = a[sortDef.field];
    const bv = b[sortDef.field];
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    if (typeof av === "number" && typeof bv === "number") return (av - bv) * sortDef.dir;
    return String(av).localeCompare(String(bv)) * sortDef.dir;
  });
  const total = filtered.length;
  const start = (page - 1) * MODELS_PAGE_SIZE;
  return { rows: filtered.slice(start, start + MODELS_PAGE_SIZE), total };
}

export async function getModelUsage(
  range: ResolvedRange,
  opts: { q?: string; sort?: UsageSort; modelPage?: number; callerPage?: number } = {},
) {
  const db = await adminDb();
  const calls = db.collection("llm_calls");
  const match = { $match: sinceFilter("ts", range) };
  const sort = opts.sort ?? "cost";
  const modelPage = opts.modelPage ?? 1;
  const callerPage = opts.callerPage ?? 1;

  const [byModelRaw, byCallerRaw, totals, unattributed] = await Promise.all([
    calls.aggregate([match, groupStage("$model"), { $sort: { costUsd: -1 } }]).toArray(),
    calls.aggregate([match, groupStage("$caller"), { $sort: { costUsd: -1 } }]).toArray(),
    calls.aggregate([match, groupStage("all")]).toArray(),
    calls
      .aggregate([
        { $match: { ...sinceFilter("ts", range), promptId: null } },
        { $group: { _id: null, calls: { $sum: 1 }, costUsd: { $sum: "$costUsd" } } },
      ])
      .toArray(),
  ]);

  const byModelAll = byModelRaw.map(toUsageRow);
  const byCallerAll = byCallerRaw.map(toUsageRow);
  const byModel = paginateUsage(byModelAll, opts.q, sort, modelPage);
  const byCaller = paginateUsage(byCallerAll, opts.q, sort, callerPage);

  return {
    byModel: byModel.rows,
    byModelTotal: byModel.total,
    byCaller: byCaller.rows,
    byCallerTotal: byCaller.total,
    totals: totals[0] ? toUsageRow(totals[0]) : null,
    unattributed: { calls: num(unattributed[0]?.calls), costUsd: num(unattributed[0]?.costUsd) },
  };
}
