import type { Metadata } from "next";
import Link from "next/link";
import { PromptsTable } from "@/components/PromptsTable";
import { FilterSearch, FilterSelect, FilterSubmit, HiddenFilters, TableFilters } from "@/components/TableControls";
import { Card, PageHeader, Pagination, pageParam, RangeFilter, stringParam } from "@/components/ui";
import { usersById } from "@/lib/data/common";
import { listPrompts, PROMPT_SORTS, PROMPTS_PAGE_SIZE, type PromptSort } from "@/lib/data/prompts";
import { formatCompact, formatInt, formatMoney } from "@/lib/format";
import { adminDb } from "@/lib/mongodb";
import { resolveRange } from "@/lib/range";

export const metadata: Metadata = { title: "Prompts" };
export const dynamic = "force-dynamic";

const STATUSES = { error: "Errors", ok: "OK", running: "Running" } as const;

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

      <TableFilters>
        <HiddenFilters range={range.key} user={userId} />
        <FilterSearch defaultValue={q} placeholder="Search prompt text…" />
        <FilterSelect name="status" defaultValue={status} label="Status" options={STATUSES} emptyLabel="All statuses" />
        <FilterSelect
          name="sort"
          defaultValue={sort}
          label="Sort"
          options={Object.entries(PROMPT_SORTS).map(([value, def]) => ({ value, label: def.label }))}
        />
        <FilterSubmit />
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
      </TableFilters>

      <Card
        flush
        title={`${formatInt(total)} prompts`}
        description={`${formatMoney(sums.costUsd)} spend · ${formatInt(sums.credits)} credits charged · ${formatCompact(sums.calls)} model calls · ${formatCompact(sums.tokens)} tokens`}
      >
        <PromptsTable rows={rows} />
        {total > PROMPTS_PAGE_SIZE ? (
          <Pagination page={page} pageSize={PROMPTS_PAGE_SIZE} total={total} basePath="/prompts" params={keep} />
        ) : null}
      </Card>
    </>
  );
}
