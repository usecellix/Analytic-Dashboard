import Link from "next/link";
import type { PromptRow } from "@/lib/data/prompts";
import { formatCompact, formatInt, formatMoney, formatMs, formatRelative, truncate } from "@/lib/format";
import { ViewSheet } from "./Sheet";
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
          <Th className="w-[36%]">Prompt</Th>
          {hideUser ? null : <Th>User</Th>}
          <Th align="right">Calls</Th>
          <Th align="right">Tokens</Th>
          <Th align="right">Cost</Th>
          <Th align="right">Credits</Th>
          {compact ? null : <Th align="right">Time</Th>}
          <Th>Status</Th>
          <Th align="right">When</Th>
          <Th align="right">Actions</Th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => {
          const meta = routeLabel(row);
          const promptText = truncate(row.prompt, 100) || "(no prompt text)";
          return (
            <tr key={row.promptId} className="transition hover:bg-surface-hover">
              <Td className="max-w-0">
                <Link
                  href={`/prompts/${encodeURIComponent(row.promptId)}`}
                  className="block truncate font-medium text-ink hover:underline"
                  title={row.prompt}
                >
                  {promptText}
                  {meta ? <span className="ml-1.5 font-normal text-ink-3">{meta}</span> : null}
                </Link>
              </Td>
              {hideUser ? null : (
                <Td className="max-w-48">
                  <UserCell user={row.user} />
                </Td>
              )}
              <Td align="right" className="whitespace-nowrap">
                {formatCompact(row.llmCalls)}
                {row.failedCalls ? <span className="ml-1 text-xs text-critical-ink">{row.failedCalls}f</span> : null}
              </Td>
              <Td align="right">{formatCompact(row.totalTokens)}</Td>
              <Td align="right" className="font-medium whitespace-nowrap">
                {formatMoney(row.costUsd)}
              </Td>
              <Td align="right" className="whitespace-nowrap">
                {row.creditsCharged ? formatInt(row.creditsCharged) : <span className="text-ink-3">—</span>}
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
              <Td align="right">
                <ViewSheet
                  title="Prompt"
                  fields={[
                    { label: "Prompt", value: truncate(row.prompt, 400) || "(none)" },
                    { label: "User", value: row.user ? `${row.user.name || row.user.email} · ${row.user.email}` : "Anonymous" },
                    { label: "Route", value: meta || "—" },
                    { label: "Status", value: row.outcome },
                    { label: "Calls", value: `${formatCompact(row.llmCalls)}${row.failedCalls ? ` (${row.failedCalls} failed)` : ""}` },
                    { label: "Tokens", value: formatCompact(row.totalTokens) },
                    { label: "Cost", value: formatMoney(row.costUsd) },
                    { label: "Credits charged", value: formatInt(row.creditsCharged) },
                    { label: "Duration", value: formatMs(row.requestDurationMs || null) },
                    { label: "When", value: new Date(row.createdAt).toLocaleString() },
                    { label: "Models", value: row.models.join(", ") || "—" },
                    { label: "Error", value: row.lastError || "—" },
                    { label: "ID", value: row.promptId },
                  ]}
                  footer={
                    <Link
                      href={`/prompts/${encodeURIComponent(row.promptId)}`}
                      className="text-sm font-medium text-accent-ink hover:underline"
                    >
                      Open full page →
                    </Link>
                  }
                />
              </Td>
            </tr>
          );
        })}
      </tbody>
    </Table>
  );
}
