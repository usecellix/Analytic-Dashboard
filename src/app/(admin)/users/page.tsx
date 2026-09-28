import type { Metadata } from "next";
import Link from "next/link";
import { FilterSearch, FilterSelect, FilterSubmit, HiddenFilters, TableFilters } from "@/components/TableControls";
import { ViewSheet } from "@/components/Sheet";
import {
  Avatar,
  Card,
  EmptyState,
  PageHeader,
  Pagination,
  pageParam,
  PlanBadge,
  RangeFilter,
  stringParam,
  SubscriptionStatusBadge,
  Table,
  Td,
  Th,
} from "@/components/ui";
import { listUsers, USER_SORTS, USERS_PAGE_SIZE, type UserSort } from "@/lib/data/users";
import { formatDate, formatInt, formatMoney, formatRelative } from "@/lib/format";
import { resolveRange } from "@/lib/range";

export const metadata: Metadata = { title: "Users" };
export const dynamic = "force-dynamic";

const PLANS = { free: "Free", beta: "Beta", solo: "Solo", firm: "Firm" };

export default async function UsersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[]>> }) {
  const params = await searchParams;
  const range = resolveRange(params.range);
  const q = stringParam(params.q);
  const plan = stringParam(params.plan);
  const sortParam = stringParam(params.sort);
  const sort: UserSort = sortParam && sortParam in USER_SORTS ? (sortParam as UserSort) : "recent";
  const page = pageParam(params.page);
  const { rows, total } = await listUsers({ q, page, sort, plan, range });
  const keep = {
    range: range.key,
    q,
    plan,
    sort: sort === "recent" ? undefined : sort,
  };

  return (
    <>
      <PageHeader
        title="Users"
        description="Everyone who has signed in to the add-in, with plan, credits and AI spend."
        actions={<RangeFilter current={range.key} basePath="/users" params={{ q, plan, sort: keep.sort }} />}
      />

      <TableFilters>
        <HiddenFilters range={range.key} />
        <FilterSearch defaultValue={q} placeholder="Search name or email…" className="w-full sm:w-80" />
        <FilterSelect name="plan" defaultValue={plan} label="Plan" options={PLANS} emptyLabel="All plans" />
        <FilterSelect
          name="sort"
          defaultValue={sort}
          label="Sort"
          options={Object.entries(USER_SORTS).map(([value, def]) => ({ value, label: def.label }))}
        />
        <FilterSubmit />
      </TableFilters>

      <Card flush title={`${formatInt(total)} users`}>
        {rows.length === 0 ? (
          <EmptyState title={q || plan ? "No users match these filters" : "No users yet"} />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>User</Th>
                <Th>Plan</Th>
                <Th align="right">Balance</Th>
                <Th align="right">Credits used</Th>
                <Th align="right">Prompts</Th>
                <Th align="right">AI spend</Th>
                <Th align="right">Last prompt</Th>
                <Th align="right">Last seen</Th>
                <Th align="right">Joined</Th>
                <Th align="right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((u) => (
                <tr key={u.id} className="transition hover:bg-surface-hover">
                  <Td className="max-w-72">
                    <Link href={`/users/${u.id}`} className="group flex min-w-0 items-center gap-2" title={u.email}>
                      <Avatar name={u.name} email={u.email} image={u.image} size={28} />
                      <span className="truncate font-medium text-ink group-hover:underline">{u.name || u.email}</span>
                      {u.name ? <span className="truncate text-xs text-ink-3">{u.email}</span> : null}
                    </Link>
                  </Td>
                  <Td className="whitespace-nowrap">
                    <PlanBadge plan={u.plan} />
                    {u.subscriptionStatus && u.subscriptionStatus !== "active" ? (
                      <span className="ml-1.5">
                        <SubscriptionStatusBadge status={u.subscriptionStatus} />
                      </span>
                    ) : null}
                  </Td>
                  <Td align="right">{u.credits == null ? <span className="text-ink-3">—</span> : formatInt(u.credits)}</Td>
                  <Td align="right">{formatInt(u.creditsUsed)}</Td>
                  <Td align="right">{formatInt(u.prompts)}</Td>
                  <Td align="right" className="font-medium whitespace-nowrap">
                    {formatMoney(u.costUsd)}
                  </Td>
                  <Td align="right" className="whitespace-nowrap text-ink-2">
                    {formatRelative(u.lastPromptAt)}
                  </Td>
                  <Td align="right" className="whitespace-nowrap text-ink-2">
                    {formatRelative(u.lastSeenAt)}
                  </Td>
                  <Td align="right" className="whitespace-nowrap text-ink-2">
                    {formatDate(u.createdAt)}
                  </Td>
                  <Td align="right">
                    <ViewSheet
                      title={u.name || u.email}
                      fields={[
                        { label: "Name", value: u.name || "—" },
                        { label: "Email", value: u.email },
                        { label: "Plan", value: u.plan },
                        { label: "Subscription", value: u.subscriptionStatus || "—" },
                        { label: "Credit balance", value: u.credits == null ? "—" : formatInt(u.credits) },
                        { label: "Credits used", value: formatInt(u.creditsUsed) },
                        { label: "Prompts", value: formatInt(u.prompts) },
                        { label: "AI spend", value: formatMoney(u.costUsd) },
                        { label: "Last prompt", value: u.lastPromptAt ? new Date(u.lastPromptAt).toLocaleString() : "—" },
                        { label: "Last seen", value: u.lastSeenAt ? new Date(u.lastSeenAt).toLocaleString() : "—" },
                        { label: "Joined", value: u.createdAt ? new Date(u.createdAt).toLocaleString() : "—" },
                        { label: "ID", value: u.id },
                      ]}
                      footer={
                        <Link href={`/users/${u.id}`} className="text-sm font-medium text-accent-ink hover:underline">
                          Open full page →
                        </Link>
                      }
                    />
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
        {total > USERS_PAGE_SIZE ? <Pagination page={page} pageSize={USERS_PAGE_SIZE} total={total} basePath="/users" params={keep} /> : null}
      </Card>
    </>
  );
}
