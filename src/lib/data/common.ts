import { ObjectId, type Db } from "mongodb";
import type { ResolvedRange } from "../range";

/** Monthly list prices (cellix_backend razorpay-checkout.service.ts). */
export const PLAN_PRICE_INR: Record<string, number> = { beta: 899, solo: 1299, firm: 5999 };

/** Buckets are aligned to India time; IST has no DST, so a fixed offset is exact. */
export const TZ = "+05:30";
const TZ_OFFSET_MS = 330 * 60_000;

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

export function toObjectId(id: string): ObjectId | null {
  return ObjectId.isValid(id) && /^[0-9a-f]{24}$/i.test(id) ? new ObjectId(id) : null;
}

export async function usersById(db: Db, ids: Iterable<string | null | undefined>): Promise<Map<string, UserSummary>> {
  const objectIds = [...new Set([...ids].filter((id): id is string => Boolean(id)))]
    .map(toObjectId)
    .filter((id): id is ObjectId => id !== null);
  const map = new Map<string, UserSummary>();
  if (objectIds.length === 0) return map;
  const docs = await db
    .collection("user")
    .find({ _id: { $in: objectIds } }, { projection: { name: 1, email: 1, image: 1 } })
    .toArray();
  for (const doc of docs) {
    const id = doc._id.toHexString();
    map.set(id, { id, name: doc.name ?? "", email: doc.email ?? "", image: doc.image ?? null });
  }
  return map;
}

/** billingEntityId is a user id for signed-in checkouts and a bare email for guest checkouts. */
export async function resolveOwners(db: Db, keys: Iterable<string>): Promise<Map<string, OwnerSummary>> {
  const unique = [...new Set(keys)];
  const byId = await usersById(db, unique);
  const emails = unique.filter((k) => k.includes("@"));
  const byEmail = new Map<string, UserSummary>();
  if (emails.length) {
    const docs = await db
      .collection("user")
      .find({ email: { $in: emails } }, { projection: { name: 1, email: 1 } })
      .toArray();
    for (const doc of docs) {
      byEmail.set(String(doc.email).toLowerCase(), { id: doc._id.toHexString(), name: doc.name ?? "", email: doc.email });
    }
  }

  const owners = new Map<string, OwnerSummary>();
  for (const key of unique) {
    const user = byId.get(key);
    if (user) {
      owners.set(key, { key, label: user.name || user.email, email: user.email, userId: user.id, guest: false });
      continue;
    }
    if (key.includes("@")) {
      const match = byEmail.get(key.toLowerCase());
      owners.set(key, { key, label: key, email: key, userId: match?.id, guest: true });
      continue;
    }
    owners.set(key, { key, label: `Unknown (${key.slice(0, 8)}…)`, guest: false });
  }
  return owners;
}

export interface SeriesPoint {
  start: string;
  value: number;
}

/** Every bucket in the range, zero-filled, so gaps read as zero instead of vanishing. */
export function fillBuckets(
  range: ResolvedRange,
  from: Date,
  rows: { _id: Date; value: number }[],
): SeriesPoint[] {
  const size = range.bucket === "hour" ? 3600_000 : 86_400_000;
  const align = (t: number) => Math.floor((t + TZ_OFFSET_MS) / size) * size - TZ_OFFSET_MS;
  const values = new Map(rows.map((r) => [new Date(r._id).getTime(), r.value]));
  const points: SeriesPoint[] = [];
  for (let t = align(from.getTime()); t <= range.to.getTime(); t += size) {
    points.push({ start: new Date(t).toISOString(), value: values.get(t) ?? 0 });
  }
  return points;
}

export function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function num(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}
