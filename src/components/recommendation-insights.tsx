import { Link } from "@tanstack/react-router";
import {
  cheapestPlatformFor,
  platformUsdPerUnit,
  platformEntryPriceUsd,
  formatUsd,
  PRICING_VERSION,
} from "@/lib/pricing";
import { creditsToUsd } from "@/lib/pricing";

export function RecommendationInsights({
  tradeoffs,
  estimatedCredits = 0,
  monthlyBudgetUsd = 0,
}: {
  tradeoffs: string[];
  /** Projected credits for the generated plan — drives catalog-based ranking. */
  estimatedCredits?: number;
  /** Monthly budget in USD, when the user picked a dollar budget. */
  monthlyBudgetUsd?: number;
}) {
  const insights = tradeoffs.length
    ? tradeoffs
    : [
        "Use free planning before paid build prompts.",
        "Batch related UI changes into fewer build messages.",
        "Reserve build credits for preview, integration, and deployment work.",
        "Use review steps to catch expensive rework before implementation.",
      ];

  const ranked =
    estimatedCredits > 0
      ? cheapestPlatformFor(monthlyBudgetUsd, estimatedCredits).slice(0, 3)
      : [];

  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-card">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-sm font-medium">Savings insights</h2>
        <span className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground">Recommended tradeoffs</span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {insights.slice(0, 6).map((insight, index) => (
          <div key={`${insight}-${index}`} className="rounded-lg border border-border bg-background/40 p-3">
            <div className="text-[10px] font-mono uppercase tracking-wide text-primary">Insight {index + 1}</div>
            <p className="mt-1 text-sm text-foreground/90">{insight}</p>
          </div>
        ))}
      </div>

      {ranked.length > 0 && (
        <div className="mt-5 border-t border-border pt-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-medium">
              Cheapest paths for ~{Math.round(estimatedCredits)} credits of work
            </h3>
            <span className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground">
              Prices verified {PRICING_VERSION}
            </span>
          </div>
          <ul className="grid gap-2 sm:grid-cols-3">
            {ranked.map((p) => {
              const perUnit = platformUsdPerUnit(p.id);
              const entry = platformEntryPriceUsd(p.id);
              const projected =
                perUnit !== null && perUnit > 0
                  ? perUnit * estimatedCredits
                  : creditsToUsd(estimatedCredits);
              return (
                <li key={p.id} className="rounded-lg border border-border bg-background/40 p-3">
                  <div className="text-sm font-medium">{p.name}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {entry ? `From ${formatUsd(entry)}/mo` : "Free tier available"}
                  </div>
                  <div className="mt-1 text-xs text-foreground/90">
                    Projected workload cost ≈ {formatUsd(projected)}
                  </div>
                </li>
              );
            })}
          </ul>
          <Link
            to="/pricing"
            className="mt-3 inline-block text-xs text-primary underline-offset-4 hover:underline"
          >
            Compare all platform pricing →
          </Link>
        </div>
      )}
    </section>
  );
}
