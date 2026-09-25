import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LedgerTable } from "@/components/LedgerTable";
import { PromptsTable } from "@/components/PromptsTable";
import { Avatar, Badge, Card, EmptyState, PlanBadge, StatTile, SubscriptionStatusBadge, Table, Td, Th } from "@/components/ui";
import { PLAN_PRICE_INR } from "@/lib/data/common";
import { getUser } from "@/lib/data/users";
import { formatCompact, formatDate, formatInr, formatInt, formatRelative, formatUsd } from "@/lib/format";

export const metadata: Metadata = { title: "User" };
export const dynamic = "force-dynamic";

export default async function UserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getUser(id);
  if (!data) notFound();
  const { user, balance, usage } = data;

  return (
    <>
      <nav className="mb-4 text-sm">
        <Link href="/users" className="text-ink-2 hover:text-ink">
          ← Users
        </Link>
      </nav>

      <div className="mb-6 flex flex-wrap items-center gap-4 rounded-2xl border border-line bg-surface p-6 shadow-card">
        <Avatar name={user.name} email={user.email} image={user.image} size={56} />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-semibold tracking-tight text-ink">{user.name || user.email}</h1>
          <p className="truncate text-sm text-ink-2">{user.email}</p>
          <p className="mt-2 flex flex-wrap items-center gap-2 text-xs text-ink-3">
            <PlanBadge plan={balance?.planTier ?? "free"} />
            {user.emailVerified ? <Badge tone="good">verified</Badge> : <Badge>unverified</Badge>}
            {user.providers.map((p) => (
              <Badge key={p}>{p}</Badge>
            ))}
            <span>Joined {formatDate(user.createdAt)}</span>
            <span>· Last seen {formatRelative(data.sessions.lastSeenAt)}</span>
            <span>· {formatInt(data.conversations)} conversations</span>
          </p>
        </div>
        <Link
          href={`/prompts?user=${user.id}&range=all`}
          className="rounded-lg border border-line bg-surface px-3 py-1.5 text-sm font-medium text-ink hover:bg-surface-hover"
        >
          All prompts
        </Link>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label="AI spend, all time" value={formatUsd(usage.allTime.costUsd)} hint={`${formatUsd(usage.last30.costUsd)} in the last 30 days`} />
        <StatTile label="Prompts" value={formatInt(usage.allTime.prompts)} hint={`${formatInt(usage.last30.prompts)} in the last 30 days`} />
        <StatTile
          label="Model calls"
          value={formatCompact(usage.allTime.calls)}
          hint={`${formatCompact(usage.allTime.tokens)} tokens`}
        />
        <StatTile
          label="Credit balance"
          value={balance ? formatInt(balance.total) : "—"}
          hint={balance ? `${formatInt(balance.planCredits)} plan · ${formatInt(balance.purchasedCredits)} bought · ${formatInt(balance.oneTimeCredits)} one-time` : "No credit account yet"}
        />
      </div>

      <Card title="Recent prompts" flush className="mb-6">
        <PromptsTable rows={data.recentPrompts} compact hideUser />
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Subscriptions" flush>
          {data.subscriptions.length === 0 ? (
            <EmptyState title="No subscriptions" />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Plan</Th>
                  <Th>Status</Th>
                  <Th align="right">Price</Th>
                  <Th align="right">Renews / ends</Th>
                </tr>
              </thead>
              <tbody>
                {data.subscriptions.map((s) => (
                  <tr key={s.id}>
                    <Td>
                      <PlanBadge plan={s.planTier} />
                    </Td>
                    <Td>
                      <span className="flex items-center gap-1.5">
                        <SubscriptionStatusBadge status={s.status} />
                        {s.cancelAtPeriodEnd ? <Badge tone="warning">cancels</Badge> : null}
                      </span>
                    </Td>
                    <Td align="right">{formatInr(PLAN_PRICE_INR[s.planTier] ?? null)}/mo</Td>
                    <Td align="right" className="text-ink-2">
                      {formatDate(s.currentPeriodEnd)}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
        <Card title="Credit ledger" description="Latest 25 entries" flush>
          <LedgerTable rows={data.ledger} />
        </Card>
      </div>
    </>
  );
}
