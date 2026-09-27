import type { ReactNode } from "react";

export const controlCls =
  "rounded-lg border border-line bg-surface px-2.5 py-1.5 text-sm text-ink shadow-card outline-none focus:border-accent focus:ring-3 focus:ring-accent/20";

export function TableFilters({ children }: { children: ReactNode }) {
  return <form method="get" className="mb-4 flex flex-wrap items-center gap-2">{children}</form>;
}

export function FilterSearch({
  name = "q",
  defaultValue,
  placeholder,
  className = "w-full sm:w-72",
}: {
  name?: string;
  defaultValue?: string;
  placeholder: string;
  className?: string;
}) {
  return (
    <input
      type="search"
      name={name}
      defaultValue={defaultValue}
      placeholder={placeholder}
      className={`${controlCls} ${className}`}
    />
  );
}

export function FilterSelect({
  name,
  defaultValue,
  label,
  options,
  emptyLabel,
}: {
  name: string;
  defaultValue?: string;
  label: string;
  options: Record<string, string> | Array<{ value: string; label: string }>;
  emptyLabel?: string;
}) {
  const entries = Array.isArray(options)
    ? options
    : Object.entries(options).map(([value, label]) => ({ value, label }));
  return (
    <select name={name} defaultValue={defaultValue ?? ""} className={controlCls} aria-label={label}>
      {emptyLabel != null ? <option value="">{emptyLabel}</option> : null}
      {entries.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function FilterSubmit({ children = "Apply" }: { children?: ReactNode }) {
  return (
    <button type="submit" className="rounded-lg bg-ink px-3 py-1.5 text-sm font-medium text-surface hover:opacity-90">
      {children}
    </button>
  );
}

export function HiddenFilters(props: Record<string, string | undefined | null>) {
  return (
    <>
      {Object.entries(props).map(([key, value]) =>
        value ? <input key={key} type="hidden" name={key} value={value} /> : null,
      )}
    </>
  );
}
