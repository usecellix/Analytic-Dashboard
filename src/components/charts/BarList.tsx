import Link from "next/link";
import type { ReactNode } from "react";

export interface BarListItem {
  key: string;
  label: ReactNode;
  href?: string;
  value: number;
  display: string;
  sub?: ReactNode;
}

/** Ranked horizontal bars, one series: every row is directly labeled, so no tooltip is needed. */
export function BarList({ items, empty = "Nothing to show yet" }: { items: BarListItem[]; empty?: string }) {
  if (items.length === 0) return <p className="py-6 text-center text-sm text-ink-3">{empty}</p>;
  const max = Math.max(...items.map((i) => i.value), 0) || 1;
  return (
    <ul className="space-y-3">
      {items.map((item) => {
        const pct = Math.max(item.value > 0 ? 1.5 : 0, (item.value / max) * 100);
        const label = item.href ? (
          <Link href={item.href} className="truncate font-medium text-ink hover:underline">
            {item.label}
          </Link>
        ) : (
          <span className="truncate font-medium text-ink">{item.label}</span>
        );
        return (
          <li key={item.key} className="min-w-0">
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="flex min-w-0 items-baseline gap-2">
                {label}
                {item.sub ? <span className="shrink-0 text-xs text-ink-3">{item.sub}</span> : null}
              </span>
              <span className="num shrink-0 text-ink">{item.display}</span>
            </div>
            <div className="mt-1.5 h-1.5 rounded-full bg-surface-2">
              <div className="h-1.5 rounded-full bg-[var(--series-1)]" style={{ width: `${pct}%` }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
