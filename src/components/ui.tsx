import Link from "next/link";
import type { ReactNode } from "react";
import { RANGES, type RangeKey } from "@/lib/range";

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-tight text-ink">{title}</h1>
        {description ? <p className="mt-1 text-sm text-ink-2">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function Card({
  title,
  description,
  action,
  children,
  className = "",
  flush = false,
}: {
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Let a table run edge to edge. */
  flush?: boolean;
}) {
  return (
    <section className={`min-w-0 rounded-xl border border-line bg-surface shadow-card ${className}`}>
      {title ? (
        <header className="flex items-start justify-between gap-3 border-b border-line px-5 py-3.5">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-ink">{title}</h2>
            {description ? <p className="mt-0.5 text-xs text-ink-3">{description}</p> : null}
          </div>
          {action}
        </header>
      ) : null}
      <div className={flush ? "" : "p-5"}>{children}</div>
    </section>
  );
}

export function StatTile({
  label,
  value,
  hint,
  href,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  href?: string;
}) {
  const body = (
    <>
      <p className="text-xs font-medium text-ink-2">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-ink">{value}</p>
      {hint ? <p className="mt-1 text-xs text-ink-3">{hint}</p> : null}
    </>
  );
  const cls = "block min-w-0 rounded-xl border border-line bg-surface px-5 py-4 shadow-card";
  return href ? (
    <Link href={href} className={`${cls} transition hover:border-line-strong`}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

type Tone = "neutral" | "good" | "warning" | "critical" | "accent";

const TONES: Record<Tone, { box: string; dot: string }> = {
  neutral: { box: "bg-surface-2 text-ink-2 ring-line", dot: "bg-ink-3" },
  good: { box: "bg-good-soft text-good-ink ring-good/20", dot: "bg-good" },
  warning: { box: "bg-warning-soft text-warning-ink ring-warning/30", dot: "bg-warning" },
  critical: { box: "bg-critical-soft text-critical-ink ring-critical/20", dot: "bg-critical" },
  accent: { box: "bg-accent-soft text-accent-ink ring-accent/20", dot: "bg-accent" },
};

/** Status always pairs color with a text label, never color alone. */
export function Badge({ tone = "neutral", children, dot = false }: { tone?: Tone; children: ReactNode; dot?: boolean }) {
  const t = TONES[tone];
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-1.5 py-0.5 text-xs font-medium ring-1 ring-inset ${t.box}`}>
      {dot ? <span aria-hidden className={`size-1.5 rounded-full ${t.dot}`} /> : null}
      {children}
    </span>
  );
}

export function OutcomeBadge({ outcome }: { outcome: "running" | "ok" | "error" }) {
  if (outcome === "error") return <Badge tone="critical" dot>Error</Badge>;
  if (outcome === "running") return <Badge tone="warning" dot>Running</Badge>;
  return <Badge tone="good" dot>OK</Badge>;
}

export function SubscriptionStatusBadge({ status }: { status: string }) {
  const tone: Tone =
    status === "active" ? "good" : status === "halted" || status === "pending" ? "warning" : status === "cancelled" || status === "expired" ? "critical" : "neutral";
  return <Badge tone={tone} dot>{status}</Badge>;
}

export function PlanBadge({ plan }: { plan: string }) {
  return <Badge tone={plan === "free" ? "neutral" : "accent"}>{plan}</Badge>;
}

export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">{children}</table>
    </div>
  );
}

export function Th({ children, align = "left", className = "" }: { children?: ReactNode; align?: "left" | "right"; className?: string }) {
  return (
    <th
      scope="col"
      className={`whitespace-nowrap border-b border-line bg-surface-2 px-4 py-2.5 text-xs font-medium text-ink-2 first:pl-5 last:pr-5 ${align === "right" ? "text-right" : ""} ${className}`}
    >
      {children}
    </th>
  );
}

export function Td({ children, align = "left", className = "" }: { children?: ReactNode; align?: "left" | "right"; className?: string }) {
  return (
    <td
      className={`border-b border-line px-4 py-3 align-middle text-ink first:pl-5 last:pr-5 ${align === "right" ? "num whitespace-nowrap text-right" : ""} ${className}`}
    >
      {children}
    </td>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="px-6 py-12 text-center">
      <p className="text-sm font-medium text-ink">{title}</p>
      {children ? <p className="mx-auto mt-1 max-w-md text-sm text-ink-3">{children}</p> : null}
    </div>
  );
}

export function Avatar({ name, email, image, size = 28 }: { name?: string; email?: string; image?: string | null; size?: number }) {
  const initials = (name || email || "?")
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
  if (image) {
    // eslint-disable-next-line @next/next/no-img-element -- remote OAuth avatars; no loader configured
    return <img src={image} alt="" width={size} height={size} referrerPolicy="no-referrer" className="shrink-0 rounded-full" style={{ width: size, height: size }} />;
  }
  return (
    <span
      aria-hidden
      className="inline-flex shrink-0 items-center justify-center rounded-full bg-accent-soft text-[11px] font-semibold text-accent-ink"
      style={{ width: size, height: size }}
    >
      {initials}
    </span>
  );
}

export function UserCell({ user, fallback }: { user: { id: string; name: string; email: string; image?: string | null } | null; fallback?: string }) {
  if (!user) return <span className="text-ink-3">{fallback ?? "Anonymous"}</span>;
  return (
    <Link href={`/users/${user.id}`} className="group flex min-w-0 items-center gap-2.5">
      <Avatar name={user.name} email={user.email} image={user.image} size={24} />
      <span className="min-w-0">
        <span className="block truncate font-medium text-ink group-hover:underline">{user.name || user.email}</span>
        {user.name ? <span className="block truncate text-xs text-ink-3">{user.email}</span> : null}
      </span>
    </Link>
  );
}

export function withParams(base: string, params: Record<string, string | number | undefined | null>): string {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") qs.set(key, String(value));
  }
  const s = qs.toString();
  return s ? `${base}?${s}` : base;
}

/** Date range is the one filter every page shares; it sits alone at the top of the content it scopes. */
export function RangeFilter({
  current,
  basePath,
  params = {},
}: {
  current: RangeKey;
  basePath: string;
  params?: Record<string, string | undefined>;
}) {
  return (
    <nav aria-label="Date range" className="inline-flex rounded-lg border border-line bg-surface p-0.5 shadow-card">
      {RANGES.map((r) => {
        const active = r.key === current;
        return (
          <Link
            key={r.key}
            href={withParams(basePath, { ...params, range: r.key, page: undefined })}
            aria-current={active ? "true" : undefined}
            title={r.label}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
              active ? "bg-ink text-surface" : "text-ink-2 hover:bg-surface-hover hover:text-ink"
            }`}
          >
            {r.short}
          </Link>
        );
      })}
    </nav>
  );
}

export function Pagination({
  page,
  pageSize,
  total,
  basePath,
  params,
}: {
  page: number;
  pageSize: number;
  total: number;
  basePath: string;
  params: Record<string, string | undefined>;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  const link = (p: number, label: string, disabled: boolean) =>
    disabled ? (
      <span className="rounded-md border border-line px-2.5 py-1 text-xs text-ink-3 opacity-50">{label}</span>
    ) : (
      <Link href={withParams(basePath, { ...params, page: p })} className="rounded-md border border-line bg-surface px-2.5 py-1 text-xs font-medium text-ink hover:bg-surface-hover">
        {label}
      </Link>
    );
  return (
    <div className="flex items-center justify-between gap-3 px-5 py-3 text-xs text-ink-2">
      <span className="num">
        {from}–{to} of {total.toLocaleString()}
      </span>
      <div className="flex gap-2">
        {link(page - 1, "Previous", page <= 1)}
        {link(page + 1, "Next", page >= pages)}
      </div>
    </div>
  );
}

export function pageParam(value: string | string[] | undefined): number {
  const n = Number(Array.isArray(value) ? value[0] : value);
  return Number.isInteger(n) && n > 0 ? Math.min(n, 10_000) : 1;
}

export function stringParam(value: string | string[] | undefined): string | undefined {
  const v = Array.isArray(value) ? value[0] : value;
  return v?.trim() ? v.trim() : undefined;
}
