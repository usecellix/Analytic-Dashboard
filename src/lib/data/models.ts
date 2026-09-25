import { adminDb } from "../mongodb";
import { sinceFilter, type ResolvedRange } from "../range";
import { num } from "./common";

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

export async function getModelUsage(range: ResolvedRange) {
  const db = await adminDb();
  const calls = db.collection("llm_calls");
  const match = { $match: sinceFilter("ts", range) };
  const [byModel, byCaller, totals, unattributed] = await Promise.all([
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

  return {
    byModel: byModel.map(toUsageRow),
    byCaller: byCaller.map(toUsageRow),
    totals: totals[0] ? toUsageRow(totals[0]) : null,
    unattributed: { calls: num(unattributed[0]?.calls), costUsd: num(unattributed[0]?.costUsd) },
  };
}
