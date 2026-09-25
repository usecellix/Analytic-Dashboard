"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { formatCompact, formatInt, formatUsd } from "@/lib/format";

type Format = "usd" | "count";

interface Point {
  start: string;
  value: number;
}

const PLOT_HEIGHT = 180;
const AXIS_BAND = 26;
const LEFT_GUTTER = 52;
const TOP_PAD = 8;

function niceMax(max: number): number {
  if (max <= 0) return 1;
  const exp = Math.pow(10, Math.floor(Math.log10(max)));
  const f = max / exp;
  const nice = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
  return nice * exp;
}

function formatValue(value: number, format: Format, compact = false): string {
  if (format === "usd") return formatUsd(value);
  return compact ? formatCompact(value) : formatInt(value);
}

function formatTick(value: number, format: Format): string {
  if (format !== "usd") return formatCompact(value);
  if (value === 0) return "$0";
  return value >= 1 ? `$${formatCompact(value)}` : `$${value.toFixed(value >= 0.1 ? 2 : 3)}`;
}

function bucketLabel(iso: string, bucket: "hour" | "day", long = false): string {
  const d = new Date(iso);
  const opts: Intl.DateTimeFormatOptions =
    bucket === "hour"
      ? { hour: "numeric", minute: "2-digit", ...(long ? { month: "short", day: "numeric" } : {}) }
      : { month: "short", day: "numeric", ...(long ? { weekday: "short" } : {}) };
  return d.toLocaleString("en-US", { ...opts, timeZone: "Asia/Kolkata" });
}

/** Rounded 4px data-end, square at the baseline. */
function barPath(x: number, y: number, w: number, h: number): string {
  const r = Math.min(4, h, w / 2);
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
}

export function ColumnChart({
  points,
  bucket,
  format,
  label,
}: {
  points: Point[];
  bucket: "hour" | "day";
  format: Format;
  /** What one bar measures, e.g. "Spend" — used for the tooltip, table and aria label. */
  label: string;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(640);
  const [active, setActive] = useState<number | null>(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(240, entry.contentRect.width)));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const max = useMemo(() => niceMax(Math.max(0, ...points.map((p) => p.value))), [points]);
  const total = points.reduce((sum, p) => sum + p.value, 0);
  const plotWidth = width - LEFT_GUTTER;
  const band = plotWidth / Math.max(1, points.length);
  const barWidth = Math.max(1, Math.min(24, band - 2, band * 0.72));
  const ticks = [0, max / 4, max / 2, (max * 3) / 4, max];
  const labelEvery = Math.max(1, Math.ceil(points.length / Math.max(2, Math.floor(plotWidth / 72))));
  const yOf = (v: number) => TOP_PAD + PLOT_HEIGHT - (v / max) * PLOT_HEIGHT;

  const onKeyDown = (event: KeyboardEvent<SVGSVGElement>) => {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    event.preventDefault();
    const step = event.key === "ArrowRight" ? 1 : -1;
    setActive((i) => Math.min(points.length - 1, Math.max(0, (i ?? (step > 0 ? -1 : points.length)) + step)));
  };

  const activePoint = active !== null ? points[active] : null;
  const tooltipLeft = active !== null ? LEFT_GUTTER + band * active + band / 2 : 0;

  return (
    <div>
      <div ref={wrapRef} className="relative" onPointerLeave={() => setActive(null)}>
        <svg
          width={width}
          height={TOP_PAD + PLOT_HEIGHT + AXIS_BAND}
          role="img"
          aria-label={`${label} per ${bucket}. Use arrow keys to read values.`}
          tabIndex={0}
          onKeyDown={onKeyDown}
          onBlur={() => setActive(null)}
          className="block overflow-visible outline-none focus-visible:ring-2 focus-visible:ring-accent/40 rounded-md"
        >
          {ticks.map((tick) => (
            <g key={tick}>
              <line x1={LEFT_GUTTER} x2={width} y1={yOf(tick)} y2={yOf(tick)} stroke="var(--grid)" strokeWidth={1} shapeRendering="crispEdges" />
              <text x={LEFT_GUTTER - 8} y={yOf(tick)} dy="0.32em" textAnchor="end" className="num fill-ink-3 text-[11px]">
                {formatTick(tick, format)}
              </text>
            </g>
          ))}
          <line
            x1={LEFT_GUTTER}
            x2={width}
            y1={yOf(0)}
            y2={yOf(0)}
            stroke="var(--line-strong)"
            strokeWidth={1}
            shapeRendering="crispEdges"
          />

          {points.map((p, i) => {
            const h = (p.value / max) * PLOT_HEIGHT;
            const x = LEFT_GUTTER + band * i + (band - barWidth) / 2;
            return (
              <g key={p.start}>
                {h > 0 ? (
                  <path
                    d={barPath(x, yOf(0) - h, barWidth, h)}
                    fill={active === i ? "var(--series-1-hover)" : "var(--series-1)"}
                  />
                ) : null}
                {/* Hit target is the whole band, not the painted bar. */}
                <rect
                  x={LEFT_GUTTER + band * i}
                  y={TOP_PAD}
                  width={band}
                  height={PLOT_HEIGHT}
                  fill="transparent"
                  onPointerEnter={() => setActive(i)}
                />
                {i % labelEvery === 0 ? (
                  <text x={LEFT_GUTTER + band * i + band / 2} y={TOP_PAD + PLOT_HEIGHT + 18} textAnchor="middle" className="fill-ink-3 text-[11px]">
                    {bucketLabel(p.start, bucket)}
                  </text>
                ) : null}
              </g>
            );
          })}
        </svg>

        {total === 0 ? (
          <p className="pointer-events-none absolute inset-x-0 top-1/3 text-center text-sm text-ink-3">No data in this range yet</p>
        ) : null}

        {activePoint ? (
          <div
            role="status"
            className="pointer-events-none absolute top-0 z-10 min-w-32 -translate-x-1/2 rounded-lg border border-line bg-surface px-3 py-2 shadow-lg"
            style={{ left: Math.min(Math.max(tooltipLeft, 70), width - 70) }}
          >
            <p className="text-sm font-semibold text-ink">{formatValue(activePoint.value, format)}</p>
            <p className="mt-0.5 flex items-center gap-1.5 text-xs text-ink-2">
              <span aria-hidden className="inline-block h-0.5 w-3 rounded-full bg-[var(--series-1)]" />
              {label} · {bucketLabel(activePoint.start, bucket, true)}
            </p>
          </div>
        ) : null}
      </div>

      <details className="mt-3 text-xs text-ink-2">
        <summary className="cursor-pointer select-none hover:text-ink">View as table</summary>
        <div className="mt-2 max-h-56 overflow-auto rounded-lg border border-line">
          <table className="w-full text-left">
            <thead className="sticky top-0 bg-surface-2">
              <tr>
                <th className="px-3 py-1.5 font-medium">{bucket === "hour" ? "Hour" : "Day"}</th>
                <th className="px-3 py-1.5 text-right font-medium">{label}</th>
              </tr>
            </thead>
            <tbody>
              {points.map((p) => (
                <tr key={p.start} className="border-t border-line">
                  <td className="px-3 py-1">{bucketLabel(p.start, bucket, true)}</td>
                  <td className="num px-3 py-1 text-right text-ink">{formatValue(p.value, format)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
