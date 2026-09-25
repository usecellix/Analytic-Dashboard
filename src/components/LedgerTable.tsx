import Link from "next/link";
import type { OwnerSummary } from "@/lib/data/common";
import type { LedgerRow } from "@/lib/data/users";
import { formatDateTime, formatInt } from "@/lib/format";
import { Badge, EmptyState, Table, Td, Th } from "./ui";

const ENTRY_LABELS: Record<string, string> = {
  grant: "Plan grant",
  purchase: "Top-up",
  debit: "Usage",
  one_time_grant: "Free credits",
};

const BUCKET_LABELS: Record<string, string> = {
  planCredits: "plan",
  purchasedCredits: "bought",
  oneTimeCredits: "one-time",
};

export function LedgerTable({ rows }: { rows: (LedgerRow & { owner?: OwnerSummary })[] }) {
  if (rows.length === 0) return <EmptyState title="No credit activity" />;
  const showOwner = rows.some((r) => r.owner);
  return (
    <Table>
      <thead>
        <tr>
          <Th>Entry</Th>
          {showOwner ? <Th>Account</Th> : null}
          <Th align="right">Credits</Th>
          <Th>Bucket</Th>
          <Th align="right">When</Th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.id}>
            <Td>
              <span className="font-medium">{ENTRY_LABELS[row.entryType] ?? row.entryType}</span>
              {row.actionType ? <span className="ml-1.5 text-xs text-ink-3">{row.actionType}</span> : null}
            </Td>
            {showOwner ? (
              <Td className="max-w-52 truncate">
                {row.owner?.userId ? (
                  <Link href={`/users/${row.owner.userId}`} className="hover:underline">
                    {row.owner.label}
                  </Link>
                ) : (
                  <span className="text-ink-2">{row.owner?.label ?? row.billingEntityId}</span>
                )}
                {row.owner?.guest ? (
                  <span className="ml-1.5">
                    <Badge tone="warning">guest</Badge>
                  </span>
                ) : null}
              </Td>
            ) : null}
            <Td align="right" className={`font-medium ${row.amount < 0 ? "text-ink" : "text-good-ink"}`}>
              {row.amount > 0 ? "+" : row.amount < 0 ? "−" : ""}
              {formatInt(Math.abs(row.amount))}
            </Td>
            <Td className="text-ink-2">{BUCKET_LABELS[row.bucket] ?? row.bucket}</Td>
            <Td align="right" className="whitespace-nowrap text-ink-2">
              {formatDateTime(row.createdAt)}
            </Td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}
