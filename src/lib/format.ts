const compactFmt = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });
const intFmt = new Intl.NumberFormat("en-US");

/** Approximate USD→INR for display. Override with USD_TO_INR env if needed. */
export const USD_TO_INR = Number(process.env.USD_TO_INR) || 86;

export function formatInt(value: number | null | undefined): string {
  return value == null ? "—" : intFmt.format(Math.round(value));
}

/** Credits, keeping one or two decimals for the sub-credit amounts a single model call often costs. */
export function formatCredits(value: number | null | undefined): string {
  if (value == null) return "—";
  const abs = Math.abs(value);
  const digits = abs >= 100 || abs === 0 ? 0 : abs >= 1 ? 1 : 2;
  return value.toLocaleString("en-US", { maximumFractionDigits: digits });
}

export function formatCompact(value: number | null | undefined): string {
  if (value == null) return "—";
  return Math.abs(value) < 10_000 ? intFmt.format(Math.round(value)) : compactFmt.format(value);
}

/** LLM costs are often fractions of a cent, so small values keep more precision. */
export function formatUsd(value: number | null | undefined): string {
  if (value == null) return "—";
  if (value === 0) return "$0.00";
  const abs = Math.abs(value);
  const digits = abs >= 100 ? 0 : abs >= 1 ? 2 : abs >= 0.01 ? 3 : 4;
  return `$${value.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
}

export function formatInr(value: number | null | undefined): string {
  if (value == null) return "—";
  return `₹${value.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

export function usdToInr(usd: number | null | undefined): number | null {
  if (usd == null) return null;
  return usd * USD_TO_INR;
}

/** Single-line USD with INR equivalent: `$1.23 · ₹106`. */
export function formatMoney(usd: number | null | undefined): string {
  if (usd == null) return "—";
  const inr = usdToInr(usd)!;
  const inrDigits = Math.abs(inr) >= 1 ? 0 : Math.abs(inr) >= 0.01 ? 2 : 4;
  const inrStr = `₹${inr.toLocaleString("en-IN", { minimumFractionDigits: inrDigits, maximumFractionDigits: inrDigits })}`;
  return `${formatUsd(usd)} · ${inrStr}`;
}

export function formatMs(ms: number | null | undefined): string {
  if (ms == null || Number.isNaN(ms)) return "—";
  if (ms < 1000) return `${Math.round(ms)} ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)} s`;
  const minutes = Math.floor(ms / 60_000);
  const seconds = Math.round((ms % 60_000) / 1000);
  return `${minutes}m ${seconds}s`;
}

export function formatPercent(ratio: number | null | undefined, digits = 1): string {
  if (ratio == null || Number.isNaN(ratio)) return "—";
  return `${(ratio * 100).toFixed(digits)}%`;
}

export function formatDateTime(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatDate(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function formatRelative(value: Date | string | null | undefined, now = Date.now()): string {
  if (!value) return "—";
  const diff = now - new Date(value).getTime();
  if (Number.isNaN(diff)) return "—";
  const minutes = Math.round(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(value);
}

export function truncate(text: string | null | undefined, max: number): string {
  if (!text) return "";
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
}
