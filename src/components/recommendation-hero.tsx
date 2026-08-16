import { Badge } from "@/components/ui/badge";
import { ProgressRing } from "@/components/progress-ring";
import { getPlatform } from "@/lib/platforms";
import { withUsd } from "@/lib/cost";

export type RecommendationSummary = {
  recommended_platform?: string;
  recommendation_reason?: string;
  optimization_goal?: string;
  confidence_score?: number;
  recommended_stack?: string[];
};

export function RecommendationHero({
  recommendation,
  totalCost,
  savings,
  timeEstimate,
}: {
  recommendation: RecommendationSummary;
  totalCost: string;
  savings: string;
  timeEstimate: string;
}) {
  const platform = recommendation.recommended_platform
    ? getPlatform(recommendation.recommended_platform)
    : null;
  const confidence = Math.max(0, Math.min(100, recommendation.confidence_score ?? 0));

  return (
    <section className="rounded-2xl border border-border bg-gradient-mesh p-6 sm:p-8 shadow-card">
      <div className="grid gap-6 lg:grid-cols-[1.4fr_0.8fr] lg:items-center">
        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="font-normal">
              {recommendation.optimization_goal || "Balanced recommendation"}
            </Badge>
            {platform && <Badge variant="outline" className="border-border bg-card/60">{platform.name}</Badge>}
          </div>
          <h1 className="text-2xl sm:text-4xl font-semibold tracking-tight">
            {platform ? `${platform.name} is the best build path` : "Recommended build path"}
          </h1>
          <p className="mt-3 max-w-2xl text-sm sm:text-base text-muted-foreground">
            {recommendation.recommendation_reason ||
              "This route is based on the generated workflow, estimated credits, and platform fit for the project."}
          </p>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <HeroStat label="Estimated" value={totalCost} />
            <HeroStat label="Savings" value={savings} />
            <HeroStat label="Timeline" value={timeEstimate} />
            <HeroStat label="Confidence" value={confidence ? `${confidence}%` : "—"} />
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card/70 p-4">
          <ProgressRing completed={confidence} total={100} actual={0} estimated={0} size={132} />
          {recommendation.recommended_stack && recommendation.recommended_stack.length > 0 && (
            <ul className="mt-4 space-y-2 text-xs text-muted-foreground">
              {recommendation.recommended_stack.slice(0, 4).map((item) => (
                <li key={item} className="rounded-md border border-border bg-background/40 px-3 py-2 text-foreground/90">
                  {item}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card/70 px-3 py-2">
      <div className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 truncate text-sm font-semibold text-foreground">{value}</div>
    </div>
  );
}
