import type { Metadata } from "next";
import Link from "next/link";
import { BarList } from "@/components/charts/BarList";
import { LedgerTable } from "@/components/LedgerTable";
import { Badge, Card, EmptyState, PageHeader, PlanBadge, RangeFilter, StatTile, SubscriptionStatusBadge, Table, Td, Th } from "@/components/ui";
import { getBilling } from "@/lib/data/billing";
import { formatDate, formatInr, formatInt } from "@/lib/format";
import { resolveRange } from "@/lib/range";

export const metadata: Metadata = { title: "Billing" };
export const dynamic = "force-dynamic";

export default async function BillingPage({ searchParams }: { searchParams: Promise<Record<string, string | string[]>> }) {
  const params = await searchParams;
  const range = resolveRange(params.range);
  const data = await getBilling(range);
  const debited = Math.abs(data.flows.debit?.amount ?? 0);
  const granted = (data.flows.grant?.amount ?? 0) + (data.flows.purchase?.amount ?? 0) + (data.flows.one_time_grant?.amount ?? 0);
  const outstanding = data.accounts.credits.plan + data.accounts.credits.purchased + data.accounts.credits.oneTime;

  return (
    <>
      <PageHeader
        title="Billing"
        description="Razorpay subscriptions and the credit ledger."
        actions={<RangeFilter current={range.key} basePath="/billing" />}
      />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label="MRR" value={formatInr(data.mrrInr)} hint="Active subscriptions at list price" />
        <StatTile
          label="Active subscriptions"
          value={formatInt(data.activeCount)}
          hint={data.cancelling ? `${data.cancelling} set to cancel at period end` : "None cancelling"}
        />
        <StatTile label="Credits used" value={formatInt(debited)} hint={`${range.label} · ${formatInt(data.flows.debit?.count ?? 0)} debits`} />
        <StatTile label="Credits outstanding" value={formatInt(outstanding)} hint={`${formatInt(granted)} granted or bought in range`} />
      </div>

      {data.accounts.guest > 0 ? (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-warning/40 bg-warning-soft px-4 py-3 text-sm text-warning-ink">
          <span aria-hidden className="mt-1.5 size-2 shrink-0 rounded-full bg-warning" />
          <p>
            <strong className="font-semibold">{data.accounts.guest} credit account(s) are keyed by email</strong>, from the marketing-site checkout. They are not linked to a
            signed-in user, so that person&apos;s product account has a separate balance. Rows marked <em>guest</em> below.
          </p>
        </div>
      ) : null}

      <div className="mb-6 grid gap-6 lg:grid-cols-3">
        <Card title="Accounts by plan" description={`${formatInt(data.accounts.total)} credit accounts`}>
          <BarList
            items={Object.entries(data.accounts.planDistribution)
              .sort((a, b) => b[1] - a[1])
              .map(([plan, count]) => ({ key: plan, label: plan, value: count, display: formatInt(count) }))}
          />
        </Card>
        <Card title="Subscription status">
          <BarList
            items={Object.entries(data.statusCounts)
              .sort((a, b) => b[1] - a[1])
              .map(([status, count]) => ({ key: status, label: status, value: count, display: formatInt(count) }))}
            empty="No subscriptions yet"
          />
        </Card>
        <Card title="Credit balances" description="Across all accounts">
          <BarList
            items={[
              { key: "plan", label: "Plan credits", value: data.accounts.credits.plan, display: formatInt(data.accounts.credits.plan) },
              { key: "purchased", label: "Bought (top-ups)", value: data.accounts.credits.purchased, display: formatInt(data.accounts.credits.purchased) },
              { key: "oneTime", label: "One-time / free", value: data.accounts.credits.oneTime, display: formatInt(data.accounts.credits.oneTime) },
            ]}
          />
        </Card>
      </div>

      <Card title="Subscriptions" flush className="mb-6">
        {data.subscriptions.length === 0 ? (
          <EmptyState title="No subscriptions yet" />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Customer</Th>
                <Th>Plan</Th>
                <Th>Status</Th>
                <Th align="right">Price</Th>
                <Th align="right">Period ends</Th>
                <Th align="right">Started</Th>
              </tr>
            </thead>
            <tbody>
              {data.subscriptions.map((s) => (
                <tr key={s.id}>
                  <Td className="max-w-64 truncate">
                    {s.owner.userId ? (
                      <Link href={`/users/${s.owner.userId}`} className="font-medium hover:underline">
                        {s.owner.label}
                      </Link>
                    ) : (
                      <span className="font-medium">{s.owner.label}</span>
                    )}
                    {s.owner.guest ? (
                      <span className="ml-1.5">
                        <Badge tone="warning">guest</Badge>
                      </span>
                    ) : null}
                  </Td>
                  <Td>
                    <PlanBadge plan={s.planTier} />
                  </Td>
                  <Td>
                    <span className="flex items-center gap-1.5">
                      <SubscriptionStatusBadge status={s.status} />
                      {s.cancelAtPeriodEnd ? <Badge tone="warning">cancels</Badge> : null}
                    </span>
                  </Td>
                  <Td align="right">{formatInr(s.priceInr)}/mo</Td>
                  <Td align="right" className="text-ink-2">
                    {formatDate(s.currentPeriodEnd)}
                  </Td>
                  <Td align="right" className="text-ink-2">
                    {formatDate(s.createdAt)}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      <Card title="Credit activity" description={`${range.label} · latest 30 entries`} flush>
        <LedgerTable rows={data.ledger} />
      </Card>
    </>
  );
}
