import type { Metadata } from "next";
import Link from "next/link";
import { BarList } from "@/components/charts/BarList";
import { LedgerTable } from "@/components/LedgerTable";
import { FilterSearch, FilterSelect, FilterSubmit, HiddenFilters, TableFilters } from "@/components/TableControls";
import { ViewSheet } from "@/components/Sheet";
import {
  Badge,
  Card,
  EmptyState,
  PageHeader,
  Pagination,
  pageParam,
  PlanBadge,
  RangeFilter,
  StatTile,
  stringParam,
  SubscriptionStatusBadge,
  Table,
  Td,
  Th,
} from "@/components/ui";
import {
  getBillingSummary,
  LEDGER_PAGE_SIZE,
  LEDGER_SORTS,
  listLedger,
  listSubscriptions,
  SUB_SORTS,
  SUBS_PAGE_SIZE,
  type LedgerSort,
  type SubSort,
} from "@/lib/data/billing";
import { formatDate, formatInr, formatInt } from "@/lib/format";
import { resolveRange } from "@/lib/range";

export const metadata: Metadata = { title: "Billing" };
export const dynamic = "force-dynamic";

const ENTRY_TYPES = {
  grant: "Plan grant",
  purchase: "Top-up",
  debit: "Usage",
  one_time_grant: "Free credits",
  expire: "Expired",
};

const SUB_STATUSES = {
  active: "Active",
  pending: "Pending",
  halted: "Halted",
  cancelled: "Cancelled",
  expired: "Expired",
};

const PLANS = { free: "Free", beta: "Beta", solo: "Solo", firm: "Firm" };

export default async function BillingPage({ searchParams }: { searchParams: Promise<Record<string, string | string[]>> }) {
  const params = await searchParams;
  const range = resolveRange(params.range);

  const subQ = stringParam(params.sq);
  const subStatus = stringParam(params.sstatus);
  const subPlan = stringParam(params.splan);
  const subSortParam = stringParam(params.ssort);
  const subSort: SubSort = subSortParam && subSortParam in SUB_SORTS ? (subSortParam as SubSort) : "recent";
  const subPage = pageParam(params.spage);

  const ledgerQ = stringParam(params.lq);
  const entryType = stringParam(params.entry);
  const ledgerSortParam = stringParam(params.lsort);
  const ledgerSort: LedgerSort = ledgerSortParam && ledgerSortParam in LEDGER_SORTS ? (ledgerSortParam as LedgerSort) : "recent";
  const ledgerPage = pageParam(params.lpage);

  const [data, subs, ledger] = await Promise.all([
    getBillingSummary(range),
    listSubscriptions({ range, q: subQ, status: subStatus, plan: subPlan, sort: subSort, page: subPage }),
    listLedger({ range, q: ledgerQ, entryType, sort: ledgerSort, page: ledgerPage }),
  ]);

  const debited = Math.abs(data.flows.debit?.amount ?? 0);
  const granted = (data.flows.grant?.amount ?? 0) + (data.flows.purchase?.amount ?? 0) + (data.flows.one_time_grant?.amount ?? 0);
  const outstanding = data.accounts.credits.plan + data.accounts.credits.purchased + data.accounts.credits.oneTime;

  const subKeep = {
    range: range.key,
    sq: subQ,
    sstatus: subStatus,
    splan: subPlan,
    ssort: subSort === "recent" ? undefined : subSort,
    lq: ledgerQ,
    entry: entryType,
    lsort: ledgerSort === "recent" ? undefined : ledgerSort,
    lpage: ledgerPage > 1 ? String(ledgerPage) : undefined,
  };
  const ledgerKeep = {
    range: range.key,
    lq: ledgerQ,
    entry: entryType,
    lsort: ledgerSort === "recent" ? undefined : ledgerSort,
    sq: subQ,
    sstatus: subStatus,
    splan: subPlan,
    ssort: subSort === "recent" ? undefined : subSort,
    spage: subPage > 1 ? String(subPage) : undefined,
  };

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

      <Card title={`Subscriptions · ${formatInt(subs.total)}`} flush className="mb-6">
        <div className="border-b border-line px-5 py-3">
          <TableFilters>
            <HiddenFilters
              range={range.key}
              lq={ledgerQ}
              entry={entryType}
              lsort={ledgerSort === "recent" ? undefined : ledgerSort}
              lpage={ledgerPage > 1 ? String(ledgerPage) : undefined}
            />
            <FilterSearch name="sq" defaultValue={subQ} placeholder="Search customer…" className="w-full sm:w-56" />
            <FilterSelect name="sstatus" defaultValue={subStatus} label="Status" options={SUB_STATUSES} emptyLabel="All statuses" />
            <FilterSelect name="splan" defaultValue={subPlan} label="Plan" options={PLANS} emptyLabel="All plans" />
            <FilterSelect
              name="ssort"
              defaultValue={subSort}
              label="Sort"
              options={Object.entries(SUB_SORTS).map(([value, def]) => ({ value, label: def.label }))}
            />
            <FilterSubmit />
          </TableFilters>
        </div>
        {subs.rows.length === 0 ? (
          <EmptyState title="No subscriptions match" />
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
                <Th align="right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {subs.rows.map((s) => (
                <tr key={s.id}>
                  <Td className="max-w-64 truncate whitespace-nowrap">
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
                  <Td className="whitespace-nowrap">
                    <SubscriptionStatusBadge status={s.status} />
                    {s.cancelAtPeriodEnd ? (
                      <span className="ml-1.5">
                        <Badge tone="warning">cancels</Badge>
                      </span>
                    ) : null}
                  </Td>
                  <Td align="right" className="whitespace-nowrap">
                    {formatInr(s.priceInr)}/mo
                  </Td>
                  <Td align="right" className="text-ink-2 whitespace-nowrap">
                    {formatDate(s.currentPeriodEnd)}
                  </Td>
                  <Td align="right" className="text-ink-2 whitespace-nowrap">
                    {formatDate(s.createdAt)}
                  </Td>
                  <Td align="right">
                    <ViewSheet
                      title="Subscription"
                      fields={[
                        { label: "Customer", value: s.owner.label },
                        { label: "Email", value: s.owner.email || "—" },
                        { label: "Plan", value: s.planTier },
                        { label: "Status", value: s.status },
                        { label: "Cancels", value: s.cancelAtPeriodEnd ? "At period end" : "No" },
                        { label: "Price", value: `${formatInr(s.priceInr)}/mo` },
                        { label: "Period ends", value: s.currentPeriodEnd ? new Date(s.currentPeriodEnd).toLocaleString() : "—" },
                        { label: "Started", value: s.createdAt ? new Date(s.createdAt).toLocaleString() : "—" },
                        { label: "ID", value: s.id },
                      ]}
                      footer={
                        s.owner.userId ? (
                          <Link href={`/users/${s.owner.userId}`} className="text-sm font-medium text-accent-ink hover:underline">
                            Open account →
                          </Link>
                        ) : undefined
                      }
                    />
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
        {subs.total > SUBS_PAGE_SIZE ? (
          <Pagination
            page={subPage}
            pageSize={SUBS_PAGE_SIZE}
            total={subs.total}
            basePath="/billing"
            pageKey="spage"
            params={{ ...subKeep, spage: undefined }}
          />
        ) : null}
      </Card>

      <Card title={`Credit activity · ${formatInt(ledger.total)}`} description={range.label} flush>
        <div className="border-b border-line px-5 py-3">
          <TableFilters>
            <HiddenFilters
              range={range.key}
              sq={subQ}
              sstatus={subStatus}
              splan={subPlan}
              ssort={subSort === "recent" ? undefined : subSort}
              spage={subPage > 1 ? String(subPage) : undefined}
            />
            <FilterSearch name="lq" defaultValue={ledgerQ} placeholder="Search account / action…" className="w-full sm:w-56" />
            <FilterSelect name="entry" defaultValue={entryType} label="Entry type" options={ENTRY_TYPES} emptyLabel="All entries" />
            <FilterSelect
              name="lsort"
              defaultValue={ledgerSort}
              label="Sort"
              options={Object.entries(LEDGER_SORTS).map(([value, def]) => ({ value, label: def.label }))}
            />
            <FilterSubmit />
          </TableFilters>
        </div>
        <LedgerTable rows={ledger.rows} />
        {ledger.total > LEDGER_PAGE_SIZE ? (
          <Pagination
            page={ledgerPage}
            pageSize={LEDGER_PAGE_SIZE}
            total={ledger.total}
            basePath="/billing"
            pageKey="lpage"
            params={{ ...ledgerKeep, lpage: undefined }}
          />
        ) : null}
      </Card>
    </>
  );
}
