import { getPlatform } from "@/lib/platforms";
import type { PlatformScore } from "@/components/platform-score-bars";

export function PlatformScoreMatrix({ scores }: { scores: PlatformScore[] }) {
  if (!scores.length) return null;

  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-card">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-sm font-medium">Recommendation matrix</h2>
        <span className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground">Why this route wins</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-xs">
          <thead className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground">
            <tr className="border-b border-border">
              <th className="py-2 pr-3 font-normal">Platform</th>
              <th className="py-2 px-3 font-normal text-right">Overall</th>
              <th className="py-2 px-3 font-normal text-right">Cost</th>
              <th className="py-2 px-3 font-normal text-right">Quality</th>
              <th className="py-2 px-3 font-normal text-right">Speed</th>
              <th className="py-2 pl-3 font-normal text-right">Ease</th>
            </tr>
          </thead>
          <tbody>
            {scores.slice(0, 6).map((score) => {
              const platform = getPlatform(score.platform);
              return (
                <tr key={score.platform} className="border-b border-border/60 last:border-0">
                  <td className="py-3 pr-3">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: platform.color }} />
                      <span className="font-medium text-foreground">{platform.name}</span>
                    </div>
                  </td>
                  <ScoreCell value={score.overall} strong />
                  <ScoreCell value={score.cost} />
                  <ScoreCell value={score.output_quality} />
                  <ScoreCell value={score.speed} />
                  <ScoreCell value={score.beginner_friendly} last />
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ScoreCell({ value, strong, last }: { value: number; strong?: boolean; last?: boolean }) {
  return (
    <td className={`py-3 ${last ? "pl-3" : "px-3"} text-right tabular-nums ${strong ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
      {Math.max(0, Math.min(100, value ?? 0))}
    </td>
  );
}
