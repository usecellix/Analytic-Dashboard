import { adminApiGet } from "../adminApi";
import type { ResolvedRange } from "../range";

export const MODELS_PAGE_SIZE = 25;

export const USAGE_SORTS = {
  cost: { label: "Highest cost" },
  calls: { label: "Most calls" },
  errors: { label: "Most errors" },
  latency: { label: "Slowest p95" },
  name: { label: "Name A–Z" },
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

export interface ModelUsage {
  byModel: UsageRow[];
  byModelTotal: number;
  byCaller: UsageRow[];
  byCallerTotal: number;
  totals: UsageRow | null;
  unattributed: { calls: number; costUsd: number };
}

/** Pulled from cellix_backend's GET /admin/models (AdminModelsService.getModelUsage). */
export async function getModelUsage(
  range: ResolvedRange,
  opts: { q?: string; sort?: UsageSort; modelPage?: number; callerPage?: number } = {},
): Promise<ModelUsage> {
  return adminApiGet<ModelUsage>("/admin/models", {
    range: range.key,
    q: opts.q,
    sort: opts.sort,
    modelPage: opts.modelPage,
    callerPage: opts.callerPage,
  });
}
