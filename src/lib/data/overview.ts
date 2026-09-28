import { adminApiGet } from "../adminApi";
import type { ResolvedRange } from "../range";
import type { UserSummary } from "./common";
import type { PromptRow } from "./prompts";

export interface SeriesPoint {
  start: string;
  value: number;
}

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

/** Pulled from cellix_backend's GET /admin/overview (AdminOverviewService.getOverview). */
export async function getOverview(range: ResolvedRange): Promise<OverviewData> {
  return adminApiGet<OverviewData>("/admin/overview", { range: range.key });
}
