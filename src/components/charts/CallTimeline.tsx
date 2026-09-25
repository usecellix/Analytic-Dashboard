"use client";

import { useState } from "react";
import { formatInt, formatMs, formatUsd } from "@/lib/format";
import type { CallRow } from "@/lib/data/prompts";

const LABEL_WIDTH = 168;

/**
 * One row per model call, placed on a shared clock, so parallel waves, retries and
 * the slow step are visible at a glance. Failed calls use the reserved critical
 * color and also say "failed" in text.
 */
export function CallTimeline({ calls }: { calls: CallRow[] }) {
  const [active, setActive] = useState<string | null>(null);
  if (calls.length === 0) return <p className="py-6 text-center text-sm text-ink-3">No model calls were recorded for this prompt.</p>;

  const starts = calls.map((c) => new Date(c.startedAt).getTime());
  const ends = calls.map((c) => new Date(c.ts).getTime());
  const t0 = Math.min(...starts);
  const span = Math.max(1, Math.max(...ends) - t0);
  const ticks = [0, 0.25, 0.5, 0.75, 1];

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[560px]">
        <div className="relative mb-1 h-5" style={{ marginLeft: LABEL_WIDTH }}>
          {ticks.map((t) => (
            <span
              key={t}
              className="num absolute -translate-x-1/2 whitespace-nowrap text-[11px] text-ink-3 first:translate-x-0 last:-translate-x-full"
              style={{ left: `${t * 100}%` }}
            >
              {formatMs(span * t)}
            </span>
          ))}
        </div>

        <ol className="max-h-[520px] overflow-y-auto pr-1">
          {calls.map((call, index) => {
            const left = ((new Date(call.startedAt).getTime() - t0) / span) * 100;
            const width = Math.max(0.4, (call.latencyMs / span) * 100);
            const isActive = active === call.id;
            return (
              <li
                key={call.id}
                className={`relative flex items-center rounded-md ${isActive ? "bg-surface-hover" : ""}`}
                onPointerEnter={() => setActive(call.id)}
                onPointerLeave={() => setActive(null)}
                onFocus={() => setActive(call.id)}
                onBlur={() => setActive(null)}
                tabIndex={0}
                aria-label={`Call ${index + 1}: ${call.caller}, ${call.model}, ${formatMs(call.latencyMs)}, ${formatUsd(call.costUsd)}${call.success ? "" : ", failed"}`}
              >
                <div className="flex shrink-0 items-center gap-1.5 truncate py-1.5 pr-3 text-xs" style={{ width: LABEL_WIDTH }}>
                  <span className="num w-6 shrink-0 text-right text-ink-3">{index + 1}</span>
                  <span className="truncate font-medium text-ink">{call.caller}</span>
                  {call.attempt > 1 ? <span className="shrink-0 text-warning-ink">retry {call.attempt - 1}</span> : null}
                  {!call.success ? <span className="shrink-0 text-critical-ink">failed</span> : null}
                </div>
                <div className="relative h-6 flex-1">
                  {ticks.map((t) => (
                    <span key={t} aria-hidden className="absolute inset-y-0 w-px bg-[var(--grid)]" style={{ left: `${t * 100}%` }} />
                  ))}
                  <span
                    aria-hidden
                    className="absolute top-1.5 h-3 rounded-[3px]"
                    style={{
                      left: `${left}%`,
                      width: `${width}%`,
                      minWidth: 3,
                      background: call.success ? (isActive ? "var(--series-1-hover)" : "var(--series-1)") : "var(--critical)",
                    }}
                  />

                {isActive ? (
                  <div
                    role="status"
                    className="pointer-events-none absolute top-full z-20 mt-1 w-72 rounded-lg border border-line bg-surface p-3 text-xs shadow-lg"
                    style={{ left: `min(${left}%, calc(100% - 18rem))` }}
                  >
                    <p className="text-sm font-semibold text-ink">
                      {formatUsd(call.costUsd)}
                      <span className="ml-2 font-normal text-ink-2">{formatMs(call.latencyMs)}</span>
                    </p>
                    <p className="mt-0.5 truncate text-ink-2">
                      {call.caller} · {call.servedModel ?? call.model}
                    </p>
                    <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-ink-2">
                      <dt>Input</dt>
                      <dd className="num text-right text-ink">{formatInt(call.promptTokens)}</dd>
                      <dt>Cached</dt>
                      <dd className="num text-right text-ink">{formatInt(call.cachedTokens)}</dd>
                      <dt>Output</dt>
                      <dd className="num text-right text-ink">{formatInt(call.completionTokens)}</dd>
                      <dt>Reasoning</dt>
                      <dd className="num text-right text-ink">{formatInt(call.reasoningTokens)}</dd>
                      <dt>Started at</dt>
                      <dd className="num text-right text-ink">+{formatMs(new Date(call.startedAt).getTime() - t0)}</dd>
                    </dl>
                    {!call.success && call.errorMessage ? (
                      <p className="mt-2 line-clamp-3 text-critical-ink">
                        {call.errorStatus ? `${call.errorStatus}: ` : ""}
                        {call.errorMessage}
                      </p>
                    ) : null}
                  </div>
                ) : null}
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
