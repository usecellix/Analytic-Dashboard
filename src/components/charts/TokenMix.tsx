import { formatCompact, formatPercent } from "@/lib/format";

/**
 * Where a prompt's tokens went: fresh input, cache-served input, output.
 * Three categorical slots in fixed order, 2px surface gaps, legend always shown.
 */
export function TokenMix({
  promptTokens,
  cachedTokens,
  completionTokens,
  reasoningTokens,
}: {
  promptTokens: number;
  cachedTokens: number;
  completionTokens: number;
  reasoningTokens: number;
}) {
  const cached = Math.min(cachedTokens, promptTokens);
  const segments = [
    { key: "input", label: "Input", value: promptTokens - cached, color: "var(--series-1)" },
    { key: "cached", label: "Cached input", value: cached, color: "var(--series-2)" },
    { key: "output", label: "Output", value: completionTokens, color: "var(--series-3)" },
  ];
  const total = segments.reduce((sum, s) => sum + s.value, 0);

  if (total === 0) return <p className="text-sm text-ink-3">No tokens recorded.</p>;

  return (
    <div>
      <div className="flex h-2.5 gap-0.5 overflow-hidden rounded-full" role="img" aria-label="Token mix">
        {segments
          .filter((s) => s.value > 0)
          .map((s) => (
            <div key={s.key} style={{ width: `${(s.value / total) * 100}%`, background: s.color }} className="h-full min-w-0.5" />
          ))}
      </div>
      <dl className="mt-4 space-y-2 text-sm">
        {segments.map((s) => (
          <div key={s.key} className="flex items-center gap-2">
            <span aria-hidden className="size-2.5 shrink-0 rounded-[3px]" style={{ background: s.color }} />
            <dt className="text-ink-2">{s.label}</dt>
            <dd className="num ml-auto whitespace-nowrap text-ink">
              {formatCompact(s.value)} <span className="inline-block w-10 text-right text-ink-3">{formatPercent(s.value / total, 0)}</span>
            </dd>
          </div>
        ))}
      </dl>
      {reasoningTokens > 0 ? (
        <p className="mt-2 text-xs text-ink-3">
          Output includes {formatCompact(reasoningTokens)} reasoning tokens ({formatPercent(reasoningTokens / Math.max(1, completionTokens), 0)} of output).
        </p>
      ) : null}
    </div>
  );
}
