import type { Document, WithId } from "mongodb";
import { adminDb } from "../mongodb";
import { sinceFilter, type ResolvedRange } from "../range";
import { escapeRegex, num, usersById, type UserSummary } from "./common";

export interface PromptRow {
  promptId: string;
  prompt: string;
  userId: string | null;
  user: UserSummary | null;
  conversationId: string | null;
  mode: string | null;
  route: string | null;
  tier: number | null;
  createdAt: string;
  lastActivityAt: string;
  requestCount: number;
  llmCalls: number;
  failedCalls: number;
  promptTokens: number;
  completionTokens: number;
  reasoningTokens: number;
  cachedTokens: number;
  totalTokens: number;
  costUsd: number;
  llmLatencyMs: number;
  requestDurationMs: number;
  models: string[];
  outcome: "running" | "ok" | "error";
  lastError: string | null;
}

export function toPromptRow(doc: WithId<Document>, people: Map<string, UserSummary>): PromptRow {
  const userId = (doc.userId as string | undefined) ?? null;
  return {
    promptId: doc.promptId,
    prompt: doc.prompt ?? "",
    userId,
    user: userId ? (people.get(userId) ?? null) : null,
    conversationId: doc.conversationId ?? null,
    mode: doc.mode ?? null,
    route: doc.route ?? null,
    tier: typeof doc.tier === "number" ? doc.tier : null,
    createdAt: new Date(doc.createdAt).toISOString(),
    lastActivityAt: new Date(doc.lastActivityAt ?? doc.createdAt).toISOString(),
    requestCount: num(doc.requestCount),
    llmCalls: num(doc.llmCalls),
    failedCalls: num(doc.failedCalls),
    promptTokens: num(doc.promptTokens),
    completionTokens: num(doc.completionTokens),
    reasoningTokens: num(doc.reasoningTokens),
    cachedTokens: num(doc.cachedTokens),
    totalTokens: num(doc.totalTokens),
    costUsd: num(doc.costUsd),
    llmLatencyMs: num(doc.llmLatencyMs),
    requestDurationMs: num(doc.requestDurationMs),
    models: Array.isArray(doc.models) ? doc.models : [],
    outcome: doc.lastOutcome === "error" ? "error" : doc.lastOutcome === "ok" ? "ok" : "running",
    lastError: doc.lastError ?? null,
  };
}

export const PROMPT_SORTS = {
  recent: { label: "Newest", sort: { createdAt: -1 } },
  cost: { label: "Highest cost", sort: { costUsd: -1 } },
  tokens: { label: "Most tokens", sort: { totalTokens: -1 } },
  calls: { label: "Most calls", sort: { llmCalls: -1 } },
} as const;
export type PromptSort = keyof typeof PROMPT_SORTS;

export interface PromptFilters {
  range: ResolvedRange;
  userId?: string;
  status?: "error" | "ok" | "running";
  q?: string;
  sort: PromptSort;
  page: number;
}

export const PROMPTS_PAGE_SIZE = 25;

export async function listPrompts(filters: PromptFilters) {
  const db = await adminDb();
  const where: Document = { ...sinceFilter("createdAt", filters.range) };
  if (filters.userId) where.userId = filters.userId;
  if (filters.status) where.lastOutcome = filters.status;
  if (filters.q) where.prompt = { $regex: escapeRegex(filters.q.slice(0, 200)), $options: "i" };

  const prompts = db.collection("ai_prompts");
  const [docs, total, sums] = await Promise.all([
    prompts
      .find(where)
      .sort({ ...PROMPT_SORTS[filters.sort].sort, _id: -1 })
      .skip((filters.page - 1) * PROMPTS_PAGE_SIZE)
      .limit(PROMPTS_PAGE_SIZE)
      .toArray(),
    prompts.countDocuments(where),
    prompts
      .aggregate([
        { $match: where },
        { $group: { _id: null, costUsd: { $sum: "$costUsd" }, tokens: { $sum: "$totalTokens" }, calls: { $sum: "$llmCalls" } } },
      ])
      .toArray(),
  ]);

  const people = await usersById(db, docs.map((d) => d.userId as string | undefined));
  const s = sums[0] ?? {};
  return {
    rows: docs.map((d) => toPromptRow(d, people)),
    total,
    sums: { costUsd: num(s.costUsd), tokens: num(s.tokens), calls: num(s.calls) },
  };
}

export interface CallRow {
  id: string;
  ts: string;
  startedAt: string;
  model: string;
  servedModel: string | null;
  caller: string;
  attempt: number;
  streaming: boolean;
  promptTokens: number;
  completionTokens: number;
  reasoningTokens: number;
  cachedTokens: number;
  totalTokens: number;
  costUsd: number;
  costEstimated: boolean;
  latencyMs: number;
  success: boolean;
  finishReason: string | null;
  errorStatus: number | null;
  errorMessage: string | null;
}

export interface Breakdown {
  key: string;
  calls: number;
  failed: number;
  tokens: number;
  costUsd: number;
  latencyMs: number;
}

function breakdown(calls: CallRow[], keyOf: (c: CallRow) => string): Breakdown[] {
  const map = new Map<string, Breakdown>();
  for (const call of calls) {
    const key = keyOf(call);
    const row = map.get(key) ?? { key, calls: 0, failed: 0, tokens: 0, costUsd: 0, latencyMs: 0 };
    row.calls += 1;
    row.failed += call.success ? 0 : 1;
    row.tokens += call.totalTokens;
    row.costUsd += call.costUsd;
    row.latencyMs += call.latencyMs;
    map.set(key, row);
  }
  return [...map.values()].sort((a, b) => b.costUsd - a.costUsd || b.calls - a.calls);
}

export async function getPrompt(promptId: string) {
  const db = await adminDb();
  const doc = await db.collection("ai_prompts").findOne({ promptId });
  if (!doc) return null;

  const callDocs = await db.collection("llm_calls").find({ promptId }).sort({ ts: 1 }).limit(2000).toArray();
  const people = await usersById(db, [doc.userId as string | undefined]);
  const calls: CallRow[] = callDocs.map((c) => {
    const ts = new Date(c.ts);
    const latencyMs = num(c.latencyMs);
    return {
      id: c._id.toHexString(),
      ts: ts.toISOString(),
      // Rows are written when a call finishes, so the start is derived.
      startedAt: new Date(ts.getTime() - latencyMs).toISOString(),
      model: c.model,
      servedModel: c.servedModel ?? null,
      caller: c.caller ?? "unknown",
      attempt: num(c.attempt) || 1,
      streaming: Boolean(c.streaming),
      promptTokens: num(c.promptTokens),
      completionTokens: num(c.completionTokens),
      reasoningTokens: num(c.reasoningTokens),
      cachedTokens: num(c.cachedTokens),
      totalTokens: num(c.totalTokens),
      costUsd: num(c.costUsd),
      costEstimated: Boolean(c.costEstimated),
      latencyMs,
      success: Boolean(c.success),
      finishReason: c.finishReason ?? null,
      errorStatus: typeof c.errorStatus === "number" ? c.errorStatus : null,
      errorMessage: c.errorMessage ?? null,
    };
  });
  // Stored order is completion order; a timeline reads in start order.
  calls.sort((a, b) => a.startedAt.localeCompare(b.startedAt));

  return {
    prompt: toPromptRow(doc, people),
    calls,
    byCaller: breakdown(calls, (c) => c.caller),
    byModel: breakdown(calls, (c) => c.servedModel ?? c.model),
    retries: calls.filter((c) => c.attempt > 1).length,
    estimatedCostCalls: calls.filter((c) => c.costEstimated).length,
  };
}

export type PromptDetail = NonNullable<Awaited<ReturnType<typeof getPrompt>>>;
