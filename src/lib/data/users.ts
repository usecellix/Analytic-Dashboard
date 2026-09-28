import { adminApiGetOrNull, adminApiGet } from "../adminApi";
import type { ResolvedRange } from "../range";
import type { PromptRow } from "./prompts";

export const USERS_PAGE_SIZE = 25;

export const USER_SORTS = {
  recent: { label: "Newest", field: "createdAt" as const, dir: -1 as const },
  spend: { label: "Highest spend", field: "costUsd" as const, dir: -1 as const },
  prompts: { label: "Most prompts", field: "prompts" as const, dir: -1 as const },
  credits: { label: "Most credits", field: "credits" as const, dir: -1 as const },
  creditsUsed: { label: "Most credits used", field: "creditsUsed" as const, dir: -1 as const },
  seen: { label: "Last seen", field: "lastSeenAt" as const, dir: -1 as const },
} as const;
export type UserSort = keyof typeof USER_SORTS;

export interface CreditBalance {
  planTier: string;
  planCredits: number;
  purchasedCredits: number;
  oneTimeCredits: number;
  total: number;
  currentPeriodEnd: string | null;
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
  /** All-time credits debited (credit_ledger). */
  creditsUsed: number;
  prompts: number;
  costUsd: number;
  lastPromptAt: string | null;
}

export interface UserFilters {
  q?: string;
  page: number;
  sort: UserSort;
  plan?: string;
  range: ResolvedRange;
}

/** Pulled from cellix_backend's GET /admin/users (AdminUsersService.listUsers — the same shape/sort this used to compute directly against Mongo). */
export async function listUsers(filters: UserFilters): Promise<{ rows: UserRow[]; total: number }> {
  return adminApiGet<{ rows: UserRow[]; total: number }>("/admin/users", {
    q: filters.q,
    page: filters.page,
    sort: filters.sort,
    plan: filters.plan,
    range: filters.range.key,
  });
}

export interface UserDetail {
  user: {
    id: string;
    name: string;
    email: string;
    image: string | null;
    emailVerified: boolean;
    createdAt: string | null;
    providers: string[];
  };
  sessions: { count: number; lastSeenAt: string | null };
  conversations: number;
  balance: CreditBalance | null;
  subscriptions: {
    id: string;
    planTier: string;
    status: string;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
    createdAt: string | null;
  }[];
  ledger: LedgerRow[];
  recentPrompts: PromptRow[];
  usage: {
    allTime: { prompts: number; calls: number; tokens: number; costUsd: number; creditsUsed: number };
    last30: { prompts: number; calls: number; tokens: number; costUsd: number; creditsUsed: number };
  };
}

/** Pulled from cellix_backend's GET /admin/users/:id (AdminUsersService.getUser). */
export async function getUser(id: string): Promise<UserDetail | null> {
  return adminApiGetOrNull<UserDetail>(`/admin/users/${encodeURIComponent(id)}`);
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
