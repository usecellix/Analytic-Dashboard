import type { Metadata } from "next";
import Link from "next/link";
import { Avatar, Card, EmptyState, PageHeader, Pagination, pageParam, PlanBadge, stringParam, SubscriptionStatusBadge, Table, Td, Th } from "@/components/ui";
import { listUsers, USERS_PAGE_SIZE } from "@/lib/data/users";
import { formatDate, formatInt, formatRelative, formatUsd } from "@/lib/format";

export const metadata: Metadata = { title: "Users" };
export const dynamic = "force-dynamic";

export default async function UsersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[]>> }) {
  const params = await searchParams;
  const q = stringParam(params.q);
  const page = pageParam(params.page);
  const { rows, total } = await listUsers({ q, page });

  return (
    <>
      <PageHeader title="Users" description="Everyone who has signed in to the add-in, with plan, credits and AI spend." />

      <form method="get" className="mb-4 flex flex-wrap gap-2">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search name or email…"
          className="w-full rounded-lg border border-line bg-surface px-2.5 py-1.5 text-sm text-ink shadow-card outline-none focus:border-accent focus:ring-3 focus:ring-accent/20 sm:w-80"
        />
        <button type="submit" className="rounded-lg bg-ink px-3 py-1.5 text-sm font-medium text-surface hover:opacity-90">
          Search
        </button>
      </form>

      <Card flush title={`${formatInt(total)} users`}>
        {rows.length === 0 ? (
          <EmptyState title={q ? "No users match that search" : "No users yet"} />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>User</Th>
                <Th>Plan</Th>
                <Th align="right">Credits</Th>
                <Th align="right">Prompts</Th>
                <Th align="right">AI spend</Th>
                <Th align="right">Last prompt</Th>
                <Th align="right">Last seen</Th>
                <Th align="right">Joined</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((u) => (
                <tr key={u.id} className="transition hover:bg-surface-hover">
                  <Td className="max-w-72">
                    <Link href={`/users/${u.id}`} className="group flex min-w-0 items-center gap-3">
                      <Avatar name={u.name} email={u.email} image={u.image} size={32} />
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-ink group-hover:underline">{u.name || u.email}</span>
                        <span className="block truncate text-xs text-ink-3">{u.email}</span>
                      </span>
                    </Link>
                  </Td>
                  <Td>
                    <span className="flex flex-wrap items-center gap-1.5">
                      <PlanBadge plan={u.plan} />
                      {u.subscriptionStatus && u.subscriptionStatus !== "active" ? <SubscriptionStatusBadge status={u.subscriptionStatus} /> : null}
                    </span>
                  </Td>
                  <Td align="right">{u.credits == null ? <span className="text-ink-3">—</span> : formatInt(u.credits)}</Td>
                  <Td align="right">{formatInt(u.prompts)}</Td>
                  <Td align="right" className="font-medium">
                    {formatUsd(u.costUsd)}
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
                </tr>
              ))}
            </tbody>
          </Table>
        )}
        {total > USERS_PAGE_SIZE ? <Pagination page={page} pageSize={USERS_PAGE_SIZE} total={total} basePath="/users" params={{ q }} /> : null}
      </Card>
    </>
  );
}
