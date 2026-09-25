import type { Metadata } from "next";
import { Card, EmptyState, PageHeader, RangeFilter, StatTile, Table, Td, Th } from "@/components/ui";
import { getModelUsage, type UsageRow } from "@/lib/data/models";
import { formatCompact, formatInt, formatMs, formatPercent, formatUsd } from "@/lib/format";
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
          <Th align="right">Error rate</Th>
          <Th align="right">Retries</Th>
          <Th align="right">Input</Th>
          <Th align="right">Cache hit</Th>
          <Th align="right">Output</Th>
          <Th align="right">p50</Th>
          <Th align="right">p95</Th>
          <Th align="right">Cost / call</Th>
          <Th align="right">Cost</Th>
          <Th align="right">Share</Th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => {
          const errorRate = row.calls ? row.failed / row.calls : 0;
          return (
            <tr key={row.key}>
              <Td className="max-w-64 truncate font-medium">
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
              <Td align="right" className="text-ink-2">
                {formatUsd(row.calls ? row.costUsd / row.calls : 0)}
              </Td>
              <Td align="right" className="font-medium">
                {formatUsd(row.costUsd)}
              </Td>
              <Td align="right" className="text-ink-2">
                {formatPercent(totalCost ? row.costUsd / totalCost : 0, 0)}
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
  const { byModel, byCaller, totals, unattributed } = await getModelUsage(range);
  const totalCost = totals?.costUsd ?? 0;

  return (
    <>
      <PageHeader
        title="Models & cost"
        description={`${range.label} · every network call to the model provider, retries included`}
        actions={<RangeFilter current={range.key} basePath="/models" />}
      />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label="Spend" value={formatUsd(totalCost)} hint={`${formatUsd(totals?.calls ? totalCost / totals.calls : 0)} per call`} />
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
              {`${callCount(unattributed.calls)} (${formatUsd(unattributed.costUsd)}) ran outside a user prompt, for example web chat, and ${unattributed.calls === 1 ? "is" : "are"} not in any prompt's total.`}
            </p>
          ) : null}
        </div>
      ) : null}

      <Card title="By model" flush className="mb-6">
        <UsageTable rows={byModel} keyLabel="Model" totalCost={totalCost} />
      </Card>

      <Card title="By agent" description="Which part of the pipeline made the calls: router, planner, executor, verifier…" flush>
        <UsageTable rows={byCaller} keyLabel="Agent" totalCost={totalCost} />
      </Card>
    </>
  );
}
