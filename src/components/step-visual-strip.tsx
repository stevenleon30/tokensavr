import {
  Compass,
  Hammer,
  Eye,
  Bug,
  Sparkles,
} from "lucide-react";
import { getPlatform } from "@/lib/platforms";
import { formatCredits } from "@/lib/cost";

const MODE_ICON: Record<string, React.ReactNode> = {
  plan: <Compass className="h-3 w-3" />,
  build: <Hammer className="h-3 w-3" />,
  review: <Eye className="h-3 w-3" />,
  debug: <Bug className="h-3 w-3" />,
};

function modeIcon(mode: string) {
  return MODE_ICON[mode.toLowerCase()] ?? <Sparkles className="h-3 w-3" />;
}

/**
 * Compact visual strip rendered inside each step card. Shows:
 *   1. Position dots (1 per step in the strategy)
 *   2. Cost gauge (this step's share of total estimated credits)
 *   3. Actual vs. estimated mini-bar (when actual is logged)
 */
export function StepVisualStrip({
  stepNumber,
  totalSteps,
  completedNumbers,
  estimatedCredits,
  totalEstimatedCredits,
  actualCredits,
  platformId,
  mode,
}: {
  stepNumber: number;
  totalSteps: number;
  completedNumbers: Set<number>;
  estimatedCredits: number;
  totalEstimatedCredits: number;
  actualCredits: number | null;
  platformId: string;
  mode: string;
}) {
  const platform = getPlatform(platformId);
  const sharePct =
    totalEstimatedCredits > 0
      ? (estimatedCredits / totalEstimatedCredits) * 100
      : 0;
  const hasActual = actualCredits != null && actualCredits > 0;
  // Scale actual relative to estimate (capped at 200%) so we can visualize
  // over-spend.
  const actualPct =
    estimatedCredits > 0
      ? Math.min(200, ((actualCredits ?? 0) / estimatedCredits) * 100)
      : hasActual
        ? 100
        : 0;
  const overEstimate = hasActual && (actualCredits ?? 0) > estimatedCredits;

  return (
    <div className="mt-3 flex flex-col gap-2.5 rounded-lg border border-border/60 bg-background/40 p-3">
      {/* Position dots */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground shrink-0">
          {stepNumber}/{totalSteps}
        </span>
        <div className="flex flex-1 flex-wrap items-center gap-1 min-w-0">
          {Array.from({ length: totalSteps }, (_, i) => {
            const num = i + 1;
            const isCurrent = num === stepNumber;
            const isDone = completedNumbers.has(num);
            return (
              <span
                key={num}
                className={`h-1.5 rounded-full transition-all ${
                  isCurrent
                    ? "w-4 bg-primary"
                    : isDone
                      ? "w-1.5 bg-success"
                      : "w-1.5 bg-muted"
                }`}
                aria-hidden
              />
            );
          })}
        </div>
        <span className="inline-flex items-center gap-1 rounded-full border border-border bg-card/60 px-1.5 py-0.5 text-[10px] font-mono uppercase tracking-wide text-muted-foreground shrink-0">
          {modeIcon(mode)}
          {mode}
        </span>
      </div>

      {/* Cost gauge: share of total */}
      <div className="flex items-center gap-3">
        <span className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground shrink-0 w-16">
          Share
        </span>
        <div className="relative flex-1 h-1.5 rounded-full bg-secondary overflow-hidden min-w-0">
          <div
            className="absolute inset-y-0 left-0 rounded-full"
            style={{
              width: `${Math.min(100, sharePct)}%`,
              backgroundColor: platform.color,
            }}
          />
        </div>
        <span className="text-[10px] tabular-nums text-muted-foreground shrink-0 w-12 text-right">
          {Math.round(sharePct)}%
        </span>
      </div>

      {/* Actual vs estimated comparison */}
      {hasActual && (
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground shrink-0 w-16">
            Actual
          </span>
          <div className="relative flex-1 h-1.5 rounded-full bg-secondary overflow-hidden min-w-0">
            {/* Estimate marker at 100% (= estimated credits) */}
            <div
              className="absolute inset-y-0 w-px bg-foreground/40 z-10"
              style={{ left: "50%" }}
              aria-hidden
            />
            <div
              className="absolute inset-y-0 left-0 rounded-full"
              style={{
                // Map 0-200% of estimate onto 0-100% of bar width
                width: `${actualPct / 2}%`,
                backgroundColor: overEstimate
                  ? "oklch(0.75 0.15 60)"
                  : "oklch(0.62 0.14 155)",
              }}
            />
          </div>
          <span
            className={`text-[10px] tabular-nums shrink-0 w-12 text-right ${overEstimate ? "text-warning font-medium" : "text-foreground"}`}
          >
            {formatCredits(actualCredits ?? 0)} cr
          </span>
        </div>
      )}
    </div>
  );
}
