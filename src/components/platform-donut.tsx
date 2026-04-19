import { getPlatform } from "@/lib/platforms";

type Slice = { id: string; credits: number };

/**
 * Compact SVG donut chart showing each platform's share of estimated credits.
 * Pure presentation — no tooltips, no recharts dependency.
 */
export function PlatformDonut({
  slices,
  total,
  size = 120,
  thickness = 16,
}: {
  slices: Slice[];
  total: number;
  size?: number;
  thickness?: number;
}) {
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const cx = size / 2;
  const cy = size / 2;

  // Filter out zero-credit slices so they don't render as invisible segments.
  const visible = slices.filter((s) => s.credits > 0);
  const safeTotal = total > 0 ? total : visible.reduce((a, b) => a + b.credits, 0);

  let offset = 0;

  return (
    <div className="flex items-center gap-4">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label="Estimated credit share per platform"
        className="shrink-0 -rotate-90"
      >
        {/* Track */}
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke="var(--muted)"
          strokeWidth={thickness}
        />
        {safeTotal > 0 &&
          visible.map((s) => {
            const fraction = s.credits / safeTotal;
            const dash = fraction * circumference;
            const platform = getPlatform(s.id);
            const seg = (
              <circle
                key={s.id}
                cx={cx}
                cy={cy}
                r={radius}
                fill="none"
                stroke={platform.color}
                strokeWidth={thickness}
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeDashoffset={-offset}
                strokeLinecap="butt"
              />
            );
            offset += dash;
            return seg;
          })}
        {/* Center label (counter-rotate so text reads upright) */}
        <g transform={`rotate(90 ${cx} ${cy})`}>
          <text
            x={cx}
            y={cy - 2}
            textAnchor="middle"
            className="fill-foreground"
            style={{ fontSize: 14, fontWeight: 600 }}
          >
            {visible.length}
          </text>
          <text
            x={cx}
            y={cy + 12}
            textAnchor="middle"
            className="fill-muted-foreground"
            style={{ fontSize: 9, letterSpacing: 0.5 }}
          >
            {visible.length === 1 ? "PLATFORM" : "PLATFORMS"}
          </text>
        </g>
      </svg>

      <ul className="grid grid-cols-1 gap-1 text-xs min-w-0">
        {visible.map((s) => {
          const platform = getPlatform(s.id);
          const pct = safeTotal > 0 ? Math.round((s.credits / safeTotal) * 100) : 0;
          return (
            <li key={s.id} className="flex items-center gap-2 min-w-0">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-sm"
                style={{ backgroundColor: platform.color }}
                aria-hidden
              />
              <span className="truncate text-foreground/90">{platform.name}</span>
              <span className="ml-auto tabular-nums text-muted-foreground shrink-0">
                {pct}%
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
