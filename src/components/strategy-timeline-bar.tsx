import { getPlatform } from "@/lib/platforms";
import { formatCredits } from "@/lib/cost";

type Segment = {
  step_number: number;
  platform: string;
  credits: number;
  action: string;
  completed?: boolean;
};

/**
 * Horizontal stacked bar where each segment = one step, width proportional to
 * estimated credits, color matches the platform brand. Click → smooth-scrolls
 * to the matching step card by id.
 */
export function StrategyTimelineBar({ segments }: { segments: Segment[] }) {
  const total = segments.reduce((s, x) => s + x.credits, 0);
  // If everything is zero-cost, fall back to even distribution so the bar
  // still communicates step ordering.
  const useEven = total <= 0;
  const denom = useEven ? segments.length : total;

  const handleJump = (n: number) => {
    if (typeof document === "undefined") return;
    const el = document.getElementById(`step-${n}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  return (
    <div className="flex flex-col gap-2 min-w-0">
      <div className="flex h-6 w-full overflow-hidden rounded-md border border-border bg-secondary">
        {segments.map((seg, i) => {
          const w = useEven ? 1 : Math.max(seg.credits, 0.0001);
          const pct = (w / denom) * 100;
          const platform = getPlatform(seg.platform);
          return (
            <button
              key={seg.step_number}
              type="button"
              onClick={() => handleJump(seg.step_number)}
              title={`Step ${seg.step_number} · ${platform.name} · ~${formatCredits(seg.credits)} cr — ${seg.action}`}
              className="group relative h-full transition-opacity hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-primary"
              style={{
                width: `${pct}%`,
                backgroundColor: platform.color,
                opacity: seg.completed ? 0.55 : 1,
                borderRight:
                  i < segments.length - 1
                    ? "1px solid hsl(var(--background) / 0.3)"
                    : undefined,
              }}
              aria-label={`Jump to step ${seg.step_number}`}
            >
              <span className="sr-only">{`Step ${seg.step_number}: ${seg.action}`}</span>
            </button>
          );
        })}
      </div>
      <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wide text-muted-foreground">
        <span>Step 1</span>
        <span>{useEven ? "Equal weight" : `${formatCredits(total)} cr total`}</span>
        <span>Step {segments.length}</span>
      </div>
    </div>
  );
}
