/**
 * Compact vertical bar chart showing the count of steps per mode
 * (Plan / Build / Review / Debug, plus any other modes the AI emits).
 * Pure SVG — no chart library.
 */

type Bucket = { mode: string; count: number };

const MODE_COLORS: Record<string, string> = {
  plan: "oklch(0.70 0.16 250)", // blue
  build: "oklch(0.62 0.14 155)", // primary green
  review: "oklch(0.78 0.16 80)", // amber
  debug: "oklch(0.65 0.20 25)", // red
};

function colorFor(mode: string) {
  return MODE_COLORS[mode.toLowerCase()] ?? "oklch(0.55 0.05 270)";
}

export function ModeMixChart({ steps }: { steps: { mode: string }[] }) {
  const counts: Record<string, number> = {};
  steps.forEach((s) => {
    const key = (s.mode || "other").toLowerCase();
    counts[key] = (counts[key] ?? 0) + 1;
  });

  // Stable ordering: known modes first, then anything else alphabetically.
  const order = ["plan", "build", "review", "debug"];
  const buckets: Bucket[] = [
    ...order
      .filter((m) => counts[m])
      .map((m) => ({ mode: m, count: counts[m] })),
    ...Object.keys(counts)
      .filter((m) => !order.includes(m))
      .sort()
      .map((m) => ({ mode: m, count: counts[m] })),
  ];

  const max = Math.max(1, ...buckets.map((b) => b.count));
  const total = buckets.reduce((s, b) => s + b.count, 0);

  if (buckets.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">No mode data available.</p>
    );
  }

  return (
    <div className="flex flex-col gap-3 min-w-0">
      <div className="flex items-end gap-2 h-20">
        {buckets.map((b) => {
          const h = (b.count / max) * 100;
          return (
            <div
              key={b.mode}
              className="flex flex-1 flex-col items-center gap-1 min-w-0"
            >
              <div className="w-full h-full flex items-end">
                <div
                  className="w-full rounded-t-sm transition-all"
                  style={{
                    height: `${h}%`,
                    backgroundColor: colorFor(b.mode),
                    minHeight: 4,
                  }}
                  title={`${b.count} ${b.mode} step${b.count === 1 ? "" : "s"}`}
                />
              </div>
              <div className="text-[10px] tabular-nums font-medium text-foreground">
                {b.count}
              </div>
            </div>
          );
        })}
      </div>
      <ul className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] uppercase tracking-wide font-mono text-muted-foreground">
        {buckets.map((b) => (
          <li key={b.mode} className="flex items-center gap-1.5">
            <span
              className="h-2 w-2 rounded-sm"
              style={{ backgroundColor: colorFor(b.mode) }}
              aria-hidden
            />
            <span>{b.mode}</span>
          </li>
        ))}
      </ul>
      <div className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground">
        {total} {total === 1 ? "step" : "steps"} total
      </div>
    </div>
  );
}
