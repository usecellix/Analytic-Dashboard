import type { Metadata } from "next";
import { FilterSearch, FilterSelect, FilterSubmit, HiddenFilters, TableFilters } from "@/components/TableControls";
import { ViewSheet } from "@/components/Sheet";
import { Card, EmptyState, PageHeader, Pagination, pageParam, RangeFilter, StatTile, stringParam, Table, Td, Th } from "@/components/ui";
import { getModelUsage, MODELS_PAGE_SIZE, USAGE_SORTS, type UsageRow, type UsageSort } from "@/lib/data/models";
import { formatCompact, formatInt, formatMoney, formatMs, formatPercent, formatUsd } from "@/lib/format";
import { resolveRange } from "@/lib/range";

export const metadata: Metadata = { title: "Models & cost" };
export const dynamic = "force-dynamic";

const callCount = (n: number) => `${formatInt(n)} ${n === 1 ? "call" : "calls"}`;

function UsageTable({ rows, keyLabel, totalCost }: { rows: UsageRow[]; keyLabel: string; totalCost: number }) {
  if (rows.length === 0) return <EmptyState title="No model calls in this range" />;
  return (
    <Table>
      <thead>
        <tr>
          <Th>{keyLabel}</Th>
          <Th align="right">Calls</Th>
          <Th align="right">Error %</Th>
          <Th align="right">Retries</Th>
          <Th align="right">Input</Th>
          <Th align="right">Cache</Th>
          <Th align="right">Output</Th>
          <Th align="right">p50</Th>
          <Th align="right">p95</Th>
          <Th align="right">$/call</Th>
          <Th align="right">Cost</Th>
          <Th align="right">Share</Th>
          <Th align="right">Actions</Th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => {
          const errorRate = row.calls ? row.failed / row.calls : 0;
          const costPerCall = row.calls ? row.costUsd / row.calls : 0;
          return (
            <tr key={row.key}>
              <Td className="max-w-48 truncate font-medium whitespace-nowrap">
                <span title={row.key}>{row.key}</span>
              </Td>
              <Td align="right">{formatInt(row.calls)}</Td>
              <Td align="right" className={errorRate >= 0.05 ? "text-critical-ink" : "text-ink-2"}>
                {formatPercent(errorRate)}
              </Td>
              <Td align="right" className="text-ink-2">
                {formatInt(row.retries)}
              </Td>
              <Td align="right">{formatCompact(row.promptTokens)}</Td>
              <Td align="right" className="text-ink-2">
                {formatPercent(row.promptTokens ? row.cachedTokens / row.promptTokens : 0, 0)}
              </Td>
              <Td align="right">{formatCompact(row.completionTokens)}</Td>
              <Td align="right">{formatMs(row.p50LatencyMs)}</Td>
              <Td align="right">{formatMs(row.p95LatencyMs)}</Td>
              <Td align="right" className="text-ink-2 whitespace-nowrap">
                {formatUsd(costPerCall)}
              </Td>
              <Td align="right" className="font-medium whitespace-nowrap">
                {formatMoney(row.costUsd)}
              </Td>
              <Td align="right" className="text-ink-2">
                {formatPercent(totalCost ? row.costUsd / totalCost : 0, 0)}
              </Td>
              <Td align="right">
                <ViewSheet
                  title={row.key}
                  fields={[
                    { label: keyLabel, value: row.key },
                    { label: "Calls", value: formatInt(row.calls) },
                    { label: "Failed", value: formatInt(row.failed) },
                    { label: "Error rate", value: formatPercent(errorRate) },
                    { label: "Retries", value: formatInt(row.retries) },
                    { label: "Input tokens", value: formatCompact(row.promptTokens) },
                    { label: "Cached", value: formatCompact(row.cachedTokens) },
                    { label: "Output tokens", value: formatCompact(row.completionTokens) },
                    { label: "Reasoning", value: formatCompact(row.reasoningTokens) },
                    { label: "p50 latency", value: formatMs(row.p50LatencyMs) },
                    { label: "p95 latency", value: formatMs(row.p95LatencyMs) },
                    { label: "Cost / call", value: formatMoney(costPerCall) },
                    { label: "Total cost", value: formatMoney(row.costUsd) },
                    { label: "Share", value: formatPercent(totalCost ? row.costUsd / totalCost : 0, 0) },
                    { label: "Estimated costs", value: formatInt(row.estimatedCostCalls) },
                  ]}
                />
              </Td>
            </tr>
          );
        })}
      </tbody>
    </Table>
  );
}

export default async function ModelsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[]>> }) {
  const params = await searchParams;
  const range = resolveRange(params.range);
  const q = stringParam(params.q);
  const sortParam = stringParam(params.sort);
  const sort: UsageSort = sortParam && sortParam in USAGE_SORTS ? (sortParam as UsageSort) : "cost";
  const modelPage = pageParam(params.mpage);
  const callerPage = pageParam(params.cpage);

  const { byModel, byModelTotal, byCaller, byCallerTotal, totals, unattributed } = await getModelUsage(range, {
    q,
    sort,
    modelPage,
    callerPage,
  });
  const totalCost = totals?.costUsd ?? 0;
  const keepBase = {
    range: range.key,
    q,
    sort: sort === "cost" ? undefined : sort,
  };

  return (
    <>
      <PageHeader
        title="Models & cost"
        description={`${range.label} · every network call to the model provider, retries included`}
        actions={<RangeFilter current={range.key} basePath="/models" params={{ q, sort: keepBase.sort }} />}
      />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label="Spend" value={formatMoney(totalCost)} hint={`${formatUsd(totals?.calls ? totalCost / totals.calls : 0)} per call`} />
        <StatTile
          label="Model calls"
          value={formatCompact(totals?.calls ?? 0)}
          hint={`${formatInt(totals?.failed ?? 0)} failed · ${formatInt(totals?.retries ?? 0)} retries`}
        />
        <StatTile
          label="p95 latency"
          value={formatMs(totals?.p95LatencyMs ?? null)}
          hint={`p50 ${formatMs(totals?.p50LatencyMs ?? null)}`}
        />
        <StatTile
          label="Prompt cache hit"
          value={formatPercent(totals?.promptTokens ? totals.cachedTokens / totals.promptTokens : 0)}
          hint={`${formatCompact(totals?.cachedTokens ?? 0)} of ${formatCompact(totals?.promptTokens ?? 0)} input tokens`}
        />
      </div>

      {(totals?.estimatedCostCalls ?? 0) > 0 || unattributed.calls > 0 ? (
        <div className="mb-6 space-y-1 rounded-xl border border-line bg-surface-2 px-4 py-3 text-sm text-ink-2">
          {(totals?.estimatedCostCalls ?? 0) > 0 ? (
            <p>
              {`${callCount(totals!.estimatedCostCalls)} had no provider cost and ${totals!.estimatedCostCalls === 1 ? "was" : "were"} priced from the backend's model table, so those amounts are estimates.`}
            </p>
          ) : null}
          {unattributed.calls > 0 ? (
            <p>
              {`${callCount(unattributed.calls)} (${formatMoney(unattributed.costUsd)}) ran outside a user prompt, for example web chat, and ${unattributed.calls === 1 ? "is" : "are"} not in any prompt's total.`}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="mb-4">
        <TableFilters>
          <HiddenFilters range={range.key} />
          <FilterSearch defaultValue={q} placeholder="Search model or agent…" />
          <FilterSelect
            name="sort"
            defaultValue={sort}
            label="Sort"
            options={Object.entries(USAGE_SORTS).map(([value, def]) => ({ value, label: def.label }))}
          />
          <FilterSubmit />
        </TableFilters>
      </div>

      <Card title={`By model · ${formatInt(byModelTotal)}`} flush className="mb-6">
        <UsageTable rows={byModel} keyLabel="Model" totalCost={totalCost} />
        {byModelTotal > MODELS_PAGE_SIZE ? (
          <Pagination
            page={modelPage}
            pageSize={MODELS_PAGE_SIZE}
            total={byModelTotal}
            basePath="/models"
            pageKey="mpage"
            params={{ ...keepBase, cpage: callerPage > 1 ? String(callerPage) : undefined }}
          />
        ) : null}
      </Card>

      <Card title={`By agent · ${formatInt(byCallerTotal)}`} description="Which part of the pipeline made the calls: router, planner, executor, verifier…" flush>
        <UsageTable rows={byCaller} keyLabel="Agent" totalCost={totalCost} />
        {byCallerTotal > MODELS_PAGE_SIZE ? (
          <Pagination
            page={callerPage}
            pageSize={MODELS_PAGE_SIZE}
            total={byCallerTotal}
            basePath="/models"
            pageKey="cpage"
            params={{ ...keepBase, mpage: modelPage > 1 ? String(modelPage) : undefined }}
          />
        ) : null}
      </Card>
    </>
  );
}
