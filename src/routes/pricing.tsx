import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Coins } from "lucide-react";
import {
  PLATFORM_PRICING_LIST,
  MODEL_LIST,
  MODEL_PRICING,
  PRICING_VERSION,
  CREDIT_USD,
  formatUsd,
  tierUsdPerUnit,
} from "@/lib/pricing";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "AI coding platform pricing compared — TokenSavr" },
      {
        name: "description",
        content:
          "Side-by-side pricing for Lovable, Claude, Cursor, Bolt, Replit, Windsurf, Copilot and Gemini — monthly plans, included credits, effective cost per credit, and model token rates.",
      },
      { property: "og:title", content: "AI coding platform pricing compared — TokenSavr" },
      {
        property: "og:description",
        content:
          "Monthly plans, included credits, effective cost per credit, and API token rates for every platform TokenSavr supports.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PricingPage,
});

const BUDGET_FILTERS = [
  { id: "all", label: "Any budget", max: Infinity },
  { id: "free", label: "Free only", max: 0 },
  { id: "20", label: "Up to $20/mo", max: 20 },
  { id: "50", label: "Up to $50/mo", max: 50 },
] as const;

function PricingPage() {
  const [budget, setBudget] = useState<(typeof BUDGET_FILTERS)[number]["id"]>("all");
  const [sortByRate, setSortByRate] = useState(true);

  const rows = useMemo(() => {
    const max = BUDGET_FILTERS.find((b) => b.id === budget)!.max;
    const flat = PLATFORM_PRICING_LIST.flatMap((p) =>
      p.tiers.map((t) => ({ platform: p, tier: t, rate: tierUsdPerUnit(t) })),
    ).filter((r) => r.tier.monthlyUsd <= max);
    if (!sortByRate) return flat;
    return [...flat].sort((a, b) => {
      const ar = a.rate ?? Number.POSITIVE_INFINITY;
      const br = b.rate ?? Number.POSITIVE_INFINITY;
      if (ar !== br) return ar - br;
      return a.tier.monthlyUsd - b.tier.monthlyUsd;
    });
  }, [budget, sortByRate]);

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-12">
      <header className="mb-8">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
          <Coins className="h-3.5 w-3.5 text-primary" />
          Pricing catalog · verified {PRICING_VERSION}
        </div>
        <h1 className="mt-4 text-3xl sm:text-4xl font-semibold tracking-tight">
          What AI coding platforms actually cost
        </h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          TokenSavr estimates every strategy against this catalog. Credits are pegged at{" "}
          {formatUsd(CREDIT_USD)} each, so any credit figure in the app converts straight to
          dollars. Published prices change often — check the source before committing.
        </p>
      </header>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {BUDGET_FILTERS.map((b) => (
          <button
            key={b.id}
            type="button"
            onClick={() => setBudget(b.id)}
            className={`rounded-full border px-3 py-1 text-xs transition-colors ${
              budget === b.id
                ? "border-primary bg-primary/10 text-foreground"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {b.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setSortByRate((v) => !v)}
          className="ml-auto rounded-full border border-border px-3 py-1 text-xs text-muted-foreground hover:text-foreground"
        >
          Sort: {sortByRate ? "cheapest per unit" : "platform"}
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-card">
        <table className="w-full min-w-[820px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-[10px] font-mono uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3">Platform</th>
              <th className="px-4 py-3">Plan</th>
              <th className="px-4 py-3">Monthly</th>
              <th className="px-4 py-3">Included</th>
              <th className="px-4 py-3">Effective rate</th>
              <th className="px-4 py-3">Free tier</th>
              <th className="px-4 py-3">Models</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ platform, tier, rate }) => (
              <tr key={`${platform.id}-${tier.name}`} className="border-b border-border/60 last:border-0">
                <td className="px-4 py-3 font-medium">{platform.name}</td>
                <td className="px-4 py-3 text-muted-foreground">{tier.name}</td>
                <td className="px-4 py-3">{tier.monthlyUsd === 0 ? "Free" : `${formatUsd(tier.monthlyUsd)}/mo`}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {tier.includedUnits
                    ? `${tier.includedUnits.toLocaleString()} ${tier.unit}s`
                    : "Not metered"}
                </td>
                <td className="px-4 py-3">
                  {rate === null
                    ? "—"
                    : rate === 0
                      ? "Included"
                      : `$${rate.toFixed(3)} / ${tier.unit}`}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{platform.freeTier ?? "None"}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {platform.models
                    .map((m) => MODEL_PRICING[m]?.name ?? m)
                    .join(", ")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section className="mt-10">
        <h2 className="text-xl font-semibold tracking-tight">Model API token rates</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          What the underlying models cost when you call them directly, per million tokens.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {MODEL_LIST.map((m) => (
            <div key={m.id} className="rounded-xl border border-border bg-card p-4 shadow-card">
              <div className="text-sm font-medium">{m.name}</div>
              <div className="text-xs text-muted-foreground">{m.vendor}</div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-md border border-border bg-background/40 px-2 py-1">
                  In ${m.inputPerMTok}/M
                </div>
                <div className="rounded-md border border-border bg-background/40 px-2 py-1">
                  Out ${m.outputPerMTok}/M
                </div>
              </div>
              <a
                href={m.source}
                target="_blank"
                rel="noreferrer noopener"
                className="mt-3 inline-block text-[11px] text-primary underline-offset-4 hover:underline"
              >
                Source · verified {m.lastVerified}
              </a>
            </div>
          ))}
        </div>
      </section>

      <p className="mt-10 text-xs text-muted-foreground">
        Prices are published list prices and may not reflect discounts, annual billing, or
        overage rates.{" "}
        <Link to="/generate" className="text-primary underline-offset-4 hover:underline">
          Generate a strategy
        </Link>{" "}
        to see these numbers applied to your project.
      </p>
    </div>
  );
}
