import { formatCredits } from "@/lib/cost";

/**
 * Radial gauge showing % of steps complete with actual vs estimated credits
 * stacked inside the ring.
 */
export function ProgressRing({
  completed,
  total,
  actual,
  estimated,
  size = 140,
  thickness = 12,
}: {
  completed: number;
  total: number;
  actual: number;
  estimated: number;
  size?: number;
  thickness?: number;
}) {
  const radius = (size - thickness) / 2;
  const circ = 2 * Math.PI * radius;
  const pct = total > 0 ? Math.min(1, completed / total) : 0;
  const dash = pct * circ;
  const cx = size / 2;
  const cy = size / 2;

  const overEstimate = estimated > 0 && actual > estimated;
  const ringColor = overEstimate
    ? "oklch(0.75 0.15 60)"
    : "oklch(0.62 0.14 155)";

  return (
    <div className="flex items-center gap-4 min-w-0">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label={`${Math.round(pct * 100)} percent complete`}
        className="shrink-0 -rotate-90"
      >
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke="var(--muted)"
          strokeWidth={thickness}
        />
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke={ringColor}
          strokeWidth={thickness}
          strokeDasharray={`${dash} ${circ - dash}`}
          strokeLinecap="round"
        />
        <g transform={`rotate(90 ${cx} ${cy})`}>
          <text
            x={cx}
            y={cy - 2}
            textAnchor="middle"
            className="fill-foreground"
            style={{ fontSize: 22, fontWeight: 600 }}
          >
            {Math.round(pct * 100)}%
          </text>
          <text
            x={cx}
            y={cy + 14}
            textAnchor="middle"
            className="fill-muted-foreground"
            style={{ fontSize: 9, letterSpacing: 0.5 }}
          >
            {completed}/{total} STEPS
          </text>
        </g>
      </svg>
      <div className="flex flex-col gap-1.5 text-xs min-w-0">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-muted-foreground">Estimated</span>
          <span className="tabular-nums font-medium text-foreground">
            {formatCredits(estimated)} cr
          </span>
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-muted-foreground">Actual</span>
          <span
            className={`tabular-nums font-medium ${overEstimate ? "text-warning" : "text-foreground"}`}
          >
            {formatCredits(actual)} cr
          </span>
        </div>
        <div className="flex items-baseline justify-between gap-3 pt-1.5 border-t border-border/60">
          <span className="text-muted-foreground">Delta</span>
          <span
            className={`tabular-nums font-medium ${overEstimate ? "text-warning" : "text-success"}`}
          >
            {actual >= estimated ? "+" : ""}
            {formatCredits(actual - estimated)} cr
          </span>
        </div>
      </div>
    </div>
  );
}
