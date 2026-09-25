import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CallTimeline } from "@/components/charts/CallTimeline";
import { TokenMix } from "@/components/charts/TokenMix";
import { routeLabel } from "@/components/PromptsTable";
import { Badge, Card, OutcomeBadge, StatTile, Table, Td, Th, UserCell } from "@/components/ui";
import { getPrompt, type Breakdown } from "@/lib/data/prompts";
import { formatCompact, formatDateTime, formatInt, formatMs, formatPercent, formatUsd } from "@/lib/format";

export const metadata: Metadata = { title: "Prompt" };
export const dynamic = "force-dynamic";

/** Cut off by the token budget — parses fine, silently short (TASKS.md #82). */
const TRUNCATED = new Set(["length", "max_tokens", "max_output_tokens"]);

function BreakdownTable({ rows, keyLabel, totalCost }: { rows: Breakdown[]; keyLabel: string; totalCost: number }) {
  return (
    <Table>
      <thead>
        <tr>
          <Th>{keyLabel}</Th>
          <Th align="right">Calls</Th>
          <Th align="right">Tokens</Th>
          <Th align="right">Model time</Th>
          <Th align="right">Cost</Th>
          <Th align="right">Share</Th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.key}>
            <Td className="font-medium">{row.key}</Td>
            <Td align="right">
              {row.calls}
              {row.failed ? <span className="ml-1 text-xs text-critical-ink">({row.failed} failed)</span> : null}
            </Td>
            <Td align="right">{formatCompact(row.tokens)}</Td>
            <Td align="right">{formatMs(row.latencyMs)}</Td>
            <Td align="right" className="font-medium">
              {formatUsd(row.costUsd)}
            </Td>
            <Td align="right" className="text-ink-2">
              {formatPercent(totalCost ? row.costUsd / totalCost : 0, 0)}
            </Td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}

export default async function PromptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await getPrompt(decodeURIComponent(id));
  if (!detail) notFound();
  const { prompt, calls } = detail;
  const t0 = calls.length ? Math.min(...calls.map((c) => new Date(c.startedAt).getTime())) : 0;
  const meta = routeLabel(prompt);

  return (
    <>
      <nav className="mb-4 text-sm">
        <Link href="/prompts" className="text-ink-2 hover:text-ink">
          ← Prompts
        </Link>
      </nav>

      <div className="mb-6 rounded-2xl border border-line bg-surface p-6 shadow-card">
        <div className="flex flex-wrap items-center gap-2 text-sm text-ink-2">
          <OutcomeBadge outcome={prompt.outcome} />
          {meta ? <Badge>{meta}</Badge> : null}
          <span>{formatDateTime(prompt.createdAt)}</span>
          {prompt.requestCount > 1 ? <span>· {prompt.requestCount} requests (stepwise waves)</span> : null}
        </div>
        <blockquote className="mt-4 max-h-64 overflow-auto whitespace-pre-wrap border-l-2 border-line-strong pl-4 text-[15px] leading-relaxed text-ink">
          {prompt.prompt || <span className="text-ink-3">(no prompt text recorded)</span>}
        </blockquote>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
          <UserCell user={prompt.user} fallback="Anonymous" />
          <p className="font-mono text-xs text-ink-3">
            {prompt.promptId}
            {prompt.conversationId ? ` · conv ${prompt.conversationId}` : ""}
          </p>
        </div>
        {prompt.outcome === "error" && prompt.lastError ? (
          <p className="mt-4 rounded-lg bg-critical-soft px-3 py-2 text-sm text-critical-ink">{prompt.lastError}</p>
        ) : null}
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile
          label="Total cost"
          value={formatUsd(prompt.costUsd)}
          hint={detail.estimatedCostCalls ? `${detail.estimatedCostCalls} call(s) estimated` : "Provider-billed"}
        />
        <StatTile
          label="Model calls"
          value={formatInt(prompt.llmCalls)}
          hint={[
            `${prompt.models.length} model${prompt.models.length === 1 ? "" : "s"}`,
            detail.retries ? `${detail.retries} retries` : null,
            prompt.failedCalls ? `${prompt.failedCalls} failed` : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        />
        <StatTile
          label="Tokens"
          value={formatCompact(prompt.totalTokens)}
          hint={`${formatCompact(prompt.promptTokens)} in · ${formatCompact(prompt.completionTokens)} out`}
        />
        <StatTile
          label="Time"
          value={formatMs(prompt.requestDurationMs || null)}
          hint={`${formatMs(prompt.llmLatencyMs)} summed model time`}
        />
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-3">
        <Card title="Token mix" className="lg:col-span-1">
          <TokenMix
            promptTokens={prompt.promptTokens}
            cachedTokens={prompt.cachedTokens}
            completionTokens={prompt.completionTokens}
            reasoningTokens={prompt.reasoningTokens}
          />
          <p className="mt-4 border-t border-line pt-3 text-xs text-ink-3">
            Cache hit rate {formatPercent(prompt.promptTokens ? prompt.cachedTokens / prompt.promptTokens : 0)} of input.
          </p>
        </Card>
        <Card title="Cost by agent" description="Which part of the pipeline spent it" flush className="lg:col-span-2">
          <BreakdownTable rows={detail.byCaller} keyLabel="Agent" totalCost={prompt.costUsd} />
        </Card>
      </div>

      <Card title="Call timeline" description="Each bar is one network call to the model, on a shared clock. Parallel bars ran concurrently." className="mb-6">
        <CallTimeline calls={calls} />
      </Card>

      <Card title="By model" flush className="mb-6">
        <BreakdownTable rows={detail.byModel} keyLabel="Model" totalCost={prompt.costUsd} />
      </Card>

      <Card title="All calls" description={`${calls.length} network calls, in start order`} flush>
        <Table>
          <thead>
            <tr>
              <Th align="right">#</Th>
              <Th align="right">Start</Th>
              <Th>Agent</Th>
              <Th>Model</Th>
              <Th align="right">In</Th>
              <Th align="right">Cached</Th>
              <Th align="right">Out</Th>
              <Th align="right">Reasoning</Th>
              <Th align="right">Latency</Th>
              <Th align="right">Cost</Th>
              <Th>Status</Th>
            </tr>
          </thead>
          <tbody>
            {calls.map((call, i) => (
              <tr key={call.id}>
                <Td align="right" className="text-ink-3">
                  {i + 1}
                </Td>
                <Td align="right" className="text-ink-2">
                  +{formatMs(new Date(call.startedAt).getTime() - t0)}
                </Td>
                <Td className="font-medium">
                  {call.caller}
                  {call.attempt > 1 ? <span className="ml-1.5 text-xs font-normal text-warning-ink">retry {call.attempt - 1}</span> : null}
                </Td>
                <Td className="max-w-56 truncate text-ink-2" >
                  <span title={call.servedModel ?? call.model}>{call.servedModel ?? call.model}</span>
                  {call.streaming ? <span className="ml-1.5 text-xs text-ink-3">stream</span> : null}
                </Td>
                <Td align="right">{formatInt(call.promptTokens)}</Td>
                <Td align="right" className="text-ink-2">
                  {formatInt(call.cachedTokens)}
                </Td>
                <Td align="right">{formatInt(call.completionTokens)}</Td>
                <Td align="right" className="text-ink-2">
                  {formatInt(call.reasoningTokens)}
                </Td>
                <Td align="right">{formatMs(call.latencyMs)}</Td>
                <Td align="right" className="font-medium">
                  {formatUsd(call.costUsd)}
                  {call.costEstimated ? <span className="ml-1 text-xs font-normal text-ink-3" title="Provider returned no cost; priced from the model table">est.</span> : null}
                </Td>
                <Td>
                  {call.success ? (
                    <Badge tone={TRUNCATED.has(call.finishReason ?? "") ? "warning" : "good"} dot>
                      {TRUNCATED.has(call.finishReason ?? "") ? "truncated" : (call.finishReason ?? "ok")}
                    </Badge>
                  ) : (
                    <span title={call.errorMessage ?? undefined}>
                      <Badge tone="critical" dot>
                        {call.errorStatus ?? "failed"}
                      </Badge>
                    </span>
                  )}
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </>
  );
}
