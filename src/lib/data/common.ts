/**
 * Pure types/constants shared across `data/*.ts`. The functions this file
 * used to hold (usersById, resolveOwners, creditsDebitedBy, fillBuckets,
 * escapeRegex, num, toObjectId) queried Mongo directly and moved to
 * `cellix_backend/src/admin/admin-common.ts` when the Dashboard's data
 * layer was migrated to call the backend instead of holding its own
 * MongoClient — see TASKS.md admin-api-migration. Nothing here reaches
 * Mongo any more.
 */

/** Monthly list prices (cellix_backend razorpay-checkout.service.ts). */
export const PLAN_PRICE_INR: Record<string, number> = { beta: 899, solo: 1299, firm: 5999 };

/** Buckets are aligned to India time; IST has no DST, so a fixed offset is exact. */
export const TZ = "+05:30";

export interface UserSummary {
  id: string;
  name: string;
  email: string;
  image?: string | null;
}

export interface OwnerSummary {
  key: string;
  label: string;
  email?: string;
  userId?: string;
  /** Paid through the public checkout with an email that maps to no signed-in account. */
  guest: boolean;
}
