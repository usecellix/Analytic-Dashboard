export const RANGES = [
  { key: "24h", label: "Last 24 hours", short: "24h", ms: 24 * 3600_000 },
  { key: "7d", label: "Last 7 days", short: "7d", ms: 7 * 86_400_000 },
  { key: "30d", label: "Last 30 days", short: "30d", ms: 30 * 86_400_000 },
  { key: "90d", label: "Last 90 days", short: "90d", ms: 90 * 86_400_000 },
  { key: "all", label: "All time", short: "All", ms: null },
] as const;

export type RangeKey = (typeof RANGES)[number]["key"];

export interface ResolvedRange {
  key: RangeKey;
  label: string;
  from: Date | null;
  to: Date;
  /** Bucket size for time series: hourly for 24h, daily otherwise. */
  bucket: "hour" | "day";
}

export const DEFAULT_RANGE: RangeKey = "30d";

export function resolveRange(value: string | string[] | undefined, now = new Date()): ResolvedRange {
  const key = (Array.isArray(value) ? value[0] : value) ?? DEFAULT_RANGE;
  const range = RANGES.find((r) => r.key === key) ?? RANGES.find((r) => r.key === DEFAULT_RANGE)!;
  return {
    key: range.key,
    label: range.label,
    from: range.ms === null ? null : new Date(now.getTime() - range.ms),
    to: now,
    bucket: range.key === "24h" ? "hour" : "day",
  };
}

export function sinceFilter(field: string, range: ResolvedRange): Record<string, unknown> {
  return range.from ? { [field]: { $gte: range.from } } : {};
}
