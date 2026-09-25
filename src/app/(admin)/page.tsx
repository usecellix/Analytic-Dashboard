import Link from "next/link";
import { BarList } from "@/components/charts/BarList";
import { ColumnChart } from "@/components/charts/ColumnChart";
import { PromptsTable } from "@/components/PromptsTable";
import { Card, PageHeader, RangeFilter, StatTile } from "@/components/ui";
import { getOverview } from "@/lib/data/overview";
import { formatCompact, formatInr, formatInt, formatPercent, formatUsd } from "@/lib/format";
import { resolveRange } from "@/lib/range";

export const dynamic = "force-dynamic";

export default async function OverviewPage({ searchParams }: { searchParams: Promise<Record<string, string | string[]>> }) {
  const params = await searchParams;
  const range = resolveRange(params.range);
  const data = await getOverview(range);
  const { totals } = data;
  const q = range.key === "30d" ? "" : `?range=${range.key}`;

  return (
    <>
      <PageHeader
        title="Overview"
        description={`${range.label} · AI usage, cost and growth`}
        actions={<RangeFilter current={range.key} basePath="/" />}
      />

      <div className="mb-6 rounded-2xl border border-line bg-surface p-6 shadow-card">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="text-sm font-medium text-ink-2">AI spend</p>
            <p className="mt-1 text-5xl font-semibold tracking-tight text-ink">{formatUsd(totals.costUsd)}</p>
            <p className="mt-2 text-sm text-ink-2">
              across {formatInt(totals.prompts)} prompts · {formatUsd(totals.prompts ? totals.costUsd / totals.prompts : 0)} per prompt
            </p>
          </div>
          <dl className="grid grid-cols-2 gap-x-10 gap-y-3 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-ink-3">Model calls</dt>
              <dd className="mt-0.5 font-semibold text-ink">{formatCompact(totals.llmCalls)}</dd>
            </div>
            <div>
              <dt className="text-ink-3">Tokens</dt>
              <dd className="mt-0.5 font-semibold text-ink">{formatCompact(totals.totalTokens)}</dd>
            </div>
            <div>
              <dt className="text-ink-3">Calls / prompt</dt>
              <dd className="mt-0.5 font-semibold text-ink">{totals.prompts ? (totals.llmCalls / totals.prompts).toFixed(1) : "—"}</dd>
            </div>
            <div>
              <dt className="text-ink-3">Failed calls</dt>
              <dd className="mt-0.5 font-semibold text-ink">
                {formatInt(totals.failedCalls)}{" "}
                <span className="font-normal text-ink-3">({formatPercent(totals.llmCalls ? totals.failedCalls / totals.llmCalls : 0)})</span>
              </dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label="Active users" value={formatInt(totals.activeUsers)} hint="Sent at least one prompt" href={`/users`} />
        <StatTile label="Total users" value={formatInt(data.users.total)} hint={`+${formatInt(data.users.newInRange)} new in range`} href="/users" />
        <StatTile
          label="Active subscriptions"
          value={formatInt(data.subscriptions.active)}
          hint={Object.entries(data.subscriptions.byPlan).map(([plan, n]) => `${n} ${plan}`).join(" · ") || "None yet"}
          href="/billing"
        />
        <StatTile label="MRR" value={formatInr(data.subscriptions.mrrInr)} hint="Active plans at list price" href="/billing" />
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <Card title="Spend" description={`USD per ${range.bucket}, provider-billed`}>
          <ColumnChart points={data.spendSeries} bucket={range.bucket} format="usd" label="Spend" />
        </Card>
        <Card title="Prompts" description={`Prompts per ${range.bucket}`}>
          <ColumnChart points={data.promptSeries} bucket={range.bucket} format="count" label="Prompts" />
        </Card>
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <Card title="Top users by spend" action={<Link href={`/users`} className="text-xs font-medium text-accent-ink hover:underline">All users</Link>}>
          <BarList
            items={data.topUsers.map((u) => ({
              key: u.userId ?? "anon",
              label: u.user ? u.user.name || u.user.email : "Anonymous",
              href: u.userId ? `/users/${u.userId}` : undefined,
              value: u.costUsd,
              display: formatUsd(u.costUsd),
              sub: `${formatInt(u.prompts)} prompts`,
            }))}
          />
        </Card>
        <Card title="Spend by model" action={<Link href={`/models${q}`} className="text-xs font-medium text-accent-ink hover:underline">Model details</Link>}>
          <BarList
            items={data.topModels.map((m) => ({
              key: m.model,
              label: m.model,
              value: m.costUsd,
              display: formatUsd(m.costUsd),
              sub: `${formatCompact(m.calls)} calls`,
            }))}
          />
        </Card>
      </div>

      <Card
        title="Latest prompts"
        flush
        action={
          <Link href={`/prompts${q}`} className="text-xs font-medium text-accent-ink hover:underline">
            View all
          </Link>
        }
      >
        <PromptsTable rows={data.recentPrompts} compact />
      </Card>
    </>
  );
}
