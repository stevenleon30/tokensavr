import { getPlatform } from "@/lib/platforms";

export type PlatformScore = {
  platform: string;
  overall: number;
  cost: number;
  output_quality: number;
  speed: number;
  beginner_friendly: number;
  reason?: string;
};

const metrics = [
  ["overall", "Overall"],
  ["cost", "Cost"],
  ["output_quality", "Quality"],
  ["speed", "Speed"],
  ["beginner_friendly", "Ease"],
] as const;

export function PlatformScoreBars({ scores }: { scores: PlatformScore[] }) {
  if (!scores.length) return null;

  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-card">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-sm font-medium">Platform score comparison</h2>
        <span className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground">0–100 fit score</span>
      </div>
      <div className="space-y-5">
        {scores.slice(0, 5).map((score) => {
          const platform = getPlatform(score.platform);
          return (
            <div key={score.platform} className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: platform.color }} />
                  <span className="truncate text-sm font-medium">{platform.name}</span>
                </div>
                <span className="text-xs tabular-nums text-muted-foreground">{score.overall}/100</span>
              </div>
              <div className="grid gap-1.5">
                {metrics.map(([key, label]) => {
                  const value = Math.max(0, Math.min(100, score[key] ?? 0));
                  return (
                    <div key={key} className="grid grid-cols-[4.5rem_1fr_2rem] items-center gap-2 text-[10px]">
                      <span className="font-mono uppercase tracking-wide text-muted-foreground">{label}</span>
                      <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                        <div className="h-full rounded-full" style={{ width: `${value}%`, backgroundColor: platform.color }} />
                      </div>
                      <span className="text-right tabular-nums text-muted-foreground">{value}</span>
                    </div>
                  );
                })}
              </div>
              {score.reason && <p className="text-xs text-muted-foreground">{score.reason}</p>}
            </div>
          );
        })}
      </div>
    </section>
  );
}
