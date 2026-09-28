import { adminApiGet, adminApiGetOrNull } from "../adminApi";
import type { ResolvedRange } from "../range";
import type { UserSummary } from "./common";

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
  /** Credits debited for this prompt (credit_ledger). 0 for unbilled/anonymous prompts. */
  creditsCharged: number;
  llmLatencyMs: number;
  requestDurationMs: number;
  models: string[];
  outcome: "running" | "ok" | "error";
  lastError: string | null;
}

export const PROMPT_SORTS = {
  recent: { label: "Newest" },
  cost: { label: "Highest cost" },
  tokens: { label: "Most tokens" },
  calls: { label: "Most calls" },
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

/** Pulled from cellix_backend's GET /admin/prompts (AdminPromptsService.listPrompts). */
export async function listPrompts(filters: PromptFilters): Promise<{
  rows: PromptRow[];
  total: number;
  sums: { costUsd: number; tokens: number; calls: number; credits: number };
}> {
  return adminApiGet("/admin/prompts", {
    range: filters.range.key,
    userId: filters.userId,
    status: filters.status,
    q: filters.q,
    sort: filters.sort,
    page: filters.page,
  });
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
  /** costUsd × CREDITS_PER_USD — an equivalent, not a debit: billing is per request. */
  creditsEquivalent: number;
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

export interface PromptDetail {
  prompt: PromptRow;
  calls: CallRow[];
  byCaller: Breakdown[];
  byModel: Breakdown[];
  retries: number;
  estimatedCostCalls: number;
}

/** Pulled from cellix_backend's GET /admin/prompts/:promptId (AdminPromptsService.getPrompt). */
export async function getPrompt(promptId: string): Promise<PromptDetail | null> {
  return adminApiGetOrNull<PromptDetail>(`/admin/prompts/${encodeURIComponent(promptId)}`);
}
