export function RecommendationInsights({ tradeoffs }: { tradeoffs: string[] }) {
  const insights = tradeoffs.length
    ? tradeoffs
    : [
        "Use free planning before paid build prompts.",
        "Batch related UI changes into fewer build messages.",
        "Reserve build credits for preview, integration, and deployment work.",
        "Use review steps to catch expensive rework before implementation.",
      ];

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
    </section>
  );
}
