import { useMemo, useState } from "react";
import type { NpmWeek } from "@/lib/live-metrics.server";

const RANGES = [4, 8, 12] as const;

function compact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}k`;
  return String(n);
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function NpmTrendSparkline({ weeks: allWeeks }: { weeks: NpmWeek[] }) {
  const [range, setRange] = useState<number>(8);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (allWeeks.length < 2) return null;

  const weeks = allWeeks.slice(-range);
  if (weeks.length < 2) return null;

  const w = 132;
  const h = 34;
  const pad = 2;
  const values = weeks.map((k) => k.downloads);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;

  const points = useMemo(() => {
    return values.map((v, i) => {
      const x = pad + (i * (w - pad * 2)) / (values.length - 1);
      const y = h - pad - ((v - min) / span) * (h - pad * 2);
      return { x, y };
    });
  }, [values, min, span]);

  const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const last = points[points.length - 1];
  const first = values[0];
  const latest = values[values.length - 1];
  const changePct = first > 0 ? ((latest - first) / first) * 100 : 0;
  const up = changePct >= 0;

  const hovered = hoveredIndex != null ? weeks[hoveredIndex] : null;
  const hoveredPoint = hoveredIndex != null ? points[hoveredIndex] : null;

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${w} ${h}`}
        width={w}
        height={h}
        role="img"
        aria-label={`SDK downloads over the last ${weeks.length} weeks, from ${compact(first)} to ${compact(latest)} per week`}
        className="block"
      >
        <path
          d={`${line} L${last.x.toFixed(1)},${h} L${points[0].x.toFixed(1)},${h} Z`}
          fill="var(--primary)"
          opacity="0.1"
        />
        <path d={line} fill="none" stroke="var(--primary)" strokeWidth="1.5" strokeLinejoin="round" />
        <circle cx={last.x} cy={last.y} r="2" fill="var(--primary)" />
        {points.map((p, i) => (
          <g key={i}>
            <rect
              x={p.x - 6}
              y={0}
              width={12}
              height={h}
              fill="transparent"
              pointerEvents="all"
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
              style={{ cursor: "pointer" }}
            />
            {hoveredIndex === i && (
              <circle cx={p.x} cy={p.y} r="3" fill="var(--primary)" opacity="0.5" />
            )}
          </g>
        ))}
      </svg>

      {hovered && hoveredPoint && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 translate-y-1 rounded border border-border bg-card px-2 py-1 shadow-sm"
          style={{ left: hoveredPoint.x, top: hoveredPoint.y }}
        >
          <p className="whitespace-nowrap font-mono text-[10px] text-card-foreground">
            Week ending {formatDate(hovered.weekEnding)}: {hovered.downloads.toLocaleString()} downloads
          </p>
        </div>
      )}

      <p className="mt-1 font-mono text-xs text-muted-foreground">
        {weeks.length}w momentum{" "}
        <span className={up ? "text-success" : "text-warning"}>
          {up ? "+" : "−"}
          {Math.abs(changePct).toFixed(1)}%
        </span>
      </p>
      <div
        className="mt-2 flex items-center gap-1"
        role="group"
        aria-label="SDK momentum timeframe"
      >
        {RANGES.map((r) => {
          const disabled = allWeeks.length < r;
          const active = range === r;
          return (
            <button
              key={r}
              type="button"
              disabled={disabled}
              aria-pressed={active}
              onClick={() => setRange(r)}
              className={`rounded border px-1.5 py-0.5 font-mono text-[10px] transition-colors ${
                active
                  ? "border-primary text-primary"
                  : "border-border text-muted-foreground hover:bg-secondary"
              } ${disabled ? "cursor-not-allowed opacity-40" : ""}`}
            >
              {r}w
            </button>
          );
        })}
      </div>
    </div>
  );
}
