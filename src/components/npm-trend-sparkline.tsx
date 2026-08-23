import { useState } from "react";
import type { NpmWeek } from "@/lib/live-metrics.server";

const RANGES = [4, 8, 12] as const;

function compact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}k`;
  return String(n);
}

export function NpmTrendSparkline({ weeks: allWeeks }: { weeks: NpmWeek[] }) {
  const [range, setRange] = useState<number>(8);

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

  const points = values.map((v, i) => {
    const x = pad + (i * (w - pad * 2)) / (values.length - 1);
    const y = h - pad - ((v - min) / span) * (h - pad * 2);
    return { x, y };
  });

  const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const last = points[points.length - 1];
  const first = values[0];
  const latest = values[values.length - 1];
  const changePct = first > 0 ? ((latest - first) / first) * 100 : 0;
  const up = changePct >= 0;

  return (
    <div>
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
      </svg>
      <p className="mt-1 font-mono text-xs text-muted-foreground">
        {weeks.length}w momentum{" "}
        <span className={up ? "text-success" : "text-warning"}>
          {up ? "+" : "−"}
          {Math.abs(changePct).toFixed(1)}%
        </span>
      </p>
    </div>
  );
}
