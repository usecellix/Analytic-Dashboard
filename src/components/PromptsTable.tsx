import Link from "next/link";
import type { PromptRow } from "@/lib/data/prompts";
import { formatCompact, formatMs, formatRelative, formatUsd, truncate } from "@/lib/format";
import { EmptyState, OutcomeBadge, Table, Td, Th, UserCell } from "./ui";

export function routeLabel(row: Pick<PromptRow, "route" | "tier" | "mode">): string {
  const parts = [row.mode && row.mode !== "action" ? row.mode : null, row.route, row.tier != null ? `tier ${row.tier}` : null];
  return parts.filter(Boolean).join(" · ");
}

export function PromptsTable({ rows, compact = false, hideUser = false }: { rows: PromptRow[]; compact?: boolean; hideUser?: boolean }) {
  if (rows.length === 0) {
    return (
      <EmptyState title="No prompts in this range">
        Prompts appear here as soon as someone sends a message from the add-in. Usage is recorded from the backend version that added the llm_calls collection onward.
      </EmptyState>
    );
  }
  return (
    <Table>
      <thead>
        <tr>
          <Th className="w-[40%]">Prompt</Th>
          {hideUser ? null : <Th>User</Th>}
          <Th align="right">Calls</Th>
          <Th align="right">Tokens</Th>
          <Th align="right">Cost</Th>
          {compact ? null : <Th align="right">Time</Th>}
          <Th>Status</Th>
          <Th align="right">When</Th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => {
          const meta = routeLabel(row);
          return (
            <tr key={row.promptId} className="transition hover:bg-surface-hover">
              <Td className="max-w-0">
                <Link href={`/prompts/${encodeURIComponent(row.promptId)}`} className="block truncate font-medium text-ink hover:underline" title={row.prompt}>
                  {truncate(row.prompt, 140) || <span className="text-ink-3">(no prompt text)</span>}
                </Link>
                {meta ? <span className="mt-0.5 block truncate text-xs text-ink-3">{meta}</span> : null}
              </Td>
              {hideUser ? null : (
                <Td className="max-w-52">
                  <UserCell user={row.user} />
                </Td>
              )}
              <Td align="right">
                {row.llmCalls}
                {row.failedCalls ? <span className="ml-1 text-xs text-critical-ink">({row.failedCalls} failed)</span> : null}
              </Td>
              <Td align="right">{formatCompact(row.totalTokens)}</Td>
              <Td align="right" className="font-medium">
                {formatUsd(row.costUsd)}
              </Td>
              {compact ? null : <Td align="right">{formatMs(row.requestDurationMs || null)}</Td>}
              <Td>
                <OutcomeBadge outcome={row.outcome} />
              </Td>
              <Td align="right" className="whitespace-nowrap text-ink-2">
                <time dateTime={row.createdAt} title={new Date(row.createdAt).toLocaleString()}>
                  {formatRelative(row.createdAt)}
                </time>
              </Td>
            </tr>
          );
        })}
      </tbody>
    </Table>
  );
}
