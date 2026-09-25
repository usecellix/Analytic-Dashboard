import type { Metadata } from "next";
import Link from "next/link";
import { PromptsTable } from "@/components/PromptsTable";
import { Card, PageHeader, Pagination, pageParam, RangeFilter, stringParam } from "@/components/ui";
import { usersById } from "@/lib/data/common";
import { listPrompts, PROMPT_SORTS, PROMPTS_PAGE_SIZE, type PromptSort } from "@/lib/data/prompts";
import { formatCompact, formatInt, formatUsd } from "@/lib/format";
import { adminDb } from "@/lib/mongodb";
import { resolveRange } from "@/lib/range";

export const metadata: Metadata = { title: "Prompts" };
export const dynamic = "force-dynamic";

const STATUSES = { error: "Errors", ok: "OK", running: "Running" } as const;

const selectCls =
  "rounded-lg border border-line bg-surface px-2.5 py-1.5 text-sm text-ink shadow-card outline-none focus:border-accent focus:ring-3 focus:ring-accent/20";

export default async function PromptsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[]>> }) {
  const params = await searchParams;
  const range = resolveRange(params.range);
  const q = stringParam(params.q);
  const userId = stringParam(params.user);
  const statusParam = stringParam(params.status);
  const status = statusParam && statusParam in STATUSES ? (statusParam as keyof typeof STATUSES) : undefined;
  const sortParam = stringParam(params.sort);
  const sort: PromptSort = sortParam && sortParam in PROMPT_SORTS ? (sortParam as PromptSort) : "recent";
  const page = pageParam(params.page);

  const { rows, total, sums } = await listPrompts({ range, q, userId, status, sort, page });
  const filterUser = userId ? (await usersById(await adminDb(), [userId])).get(userId) : undefined;
  const keep = { range: range.key, q, user: userId, status, sort: sort === "recent" ? undefined : sort };

  return (
    <>
      <PageHeader
        title="Prompts"
        description="Every user prompt with the model calls, tokens and cost it took."
        actions={<RangeFilter current={range.key} basePath="/prompts" params={{ q, user: userId, status, sort: keep.sort }} />}
      />

      <form method="get" className="mb-4 flex flex-wrap items-center gap-2">
        <input type="hidden" name="range" value={range.key} />
        {userId ? <input type="hidden" name="user" value={userId} /> : null}
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search prompt text…"
          className={`${selectCls} w-full sm:w-72`}
        />
        <select name="status" defaultValue={status ?? ""} className={selectCls} aria-label="Status">
          <option value="">All statuses</option>
          {Object.entries(STATUSES).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
        <select name="sort" defaultValue={sort} className={selectCls} aria-label="Sort">
          {Object.entries(PROMPT_SORTS).map(([key, def]) => (
            <option key={key} value={key}>
              {def.label}
            </option>
          ))}
        </select>
        <button type="submit" className="rounded-lg bg-ink px-3 py-1.5 text-sm font-medium text-surface hover:opacity-90">
          Apply
        </button>
        {filterUser ? (
          <Link
            href={`/prompts?range=${range.key}`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-accent-soft px-2.5 py-1.5 text-sm text-accent-ink"
          >
            User: {filterUser.email}
            <span aria-hidden>×</span>
            <span className="sr-only">Clear user filter</span>
          </Link>
        ) : null}
      </form>

      <Card
        flush
        title={`${formatInt(total)} prompts`}
        description={`${formatUsd(sums.costUsd)} spend · ${formatCompact(sums.calls)} model calls · ${formatCompact(sums.tokens)} tokens`}
      >
        <PromptsTable rows={rows} />
        {total > PROMPTS_PAGE_SIZE ? (
          <Pagination page={page} pageSize={PROMPTS_PAGE_SIZE} total={total} basePath="/prompts" params={keep} />
        ) : null}
      </Card>
    </>
  );
}
