import { createFileRoute, Link } from "@tanstack/react-router";
import { PricingSyncLedger } from "@/components/pricing-sync-ledger";
import { ProviderStatusStrip } from "@/components/provider-status-strip";
import { getSyncLedger } from "@/lib/sync-ledger.functions";
import { getNpmTrend, getProviderStatuses } from "@/lib/live-metrics.functions";
import {
  SYNC_INTERVAL_HOURS,
  relativeTime,
  runNote,
  syncHealth,
  type SyncRun,
} from "@/lib/sync-ledger";



export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "tokensavr — every model's price, checked every six hours" },
      {
        name: "description",
        content:
          "tokensavr tracks LLM prices across every major provider and routes each API call to the cheapest model that clears your quality bar.",
      },
      {
        property: "og:title",
        content: "tokensavr — every model's price, checked every six hours",
      },
      {
        property: "og:description",
        content:
          "Live pricing sync ledger, model routing, and a public log of every price check we run.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: async () => {
    const [ledger, npm, providers] = await Promise.all([
      getSyncLedger(),
      getNpmTrend().catch(() => null),
      getProviderStatuses().catch(() => []),
    ]);
    return { ...ledger, npm, providers };
  },

  errorComponent: ({ error }) => (
    <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
      <p className="font-mono text-sm text-warning" role="alert">
        the sync ledger could not be loaded: {error.message}
      </p>
    </div>
  ),
  notFoundComponent: () => (
    <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
      <p className="font-mono text-sm text-muted-foreground">nothing here.</p>
    </div>
  ),
  component: Landing,
});

function Landing() {
  const data = Route.useLoaderData();
  const health = syncHealth(data.runs);


  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
      {/* status line */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 pt-14 font-mono text-xs text-muted-foreground">
        <span
          aria-hidden
          className={`h-2 w-2 rounded-full ${health.operational ? "bg-success" : "bg-warning"}`}
        />
        <span className={health.operational ? "text-success" : "text-warning"}>{health.label}</span>
        <span aria-hidden>·</span>
        <span>
          {health.lastRunAt ? `last sync ${relativeTime(health.lastRunAt)}` : "no sync recorded"}
        </span>
      </div>

      {/* hero */}
      <section className="pt-6">
        <h1 className="max-w-[600px] font-display text-4xl font-medium leading-[1.1] tracking-tight text-foreground sm:text-6xl">
          Every model's price, checked every six hours.
        </h1>
        <p className="mt-6 max-w-[560px] text-base leading-relaxed text-muted-foreground">
          tokensavr watches what OpenAI, Anthropic, Google, DeepSeek, Meta and the rest charge per
          token. When you send a request, it picks the cheapest model that still clears the quality
          bar you set, so you pay list price for the work instead of paying for the brand name.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link
            to="/generate"
            search={{ idea: undefined, budget: undefined, platforms: undefined }}
            className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-85"
          >
            Start routing free
          </Link>
          <Link
            to="/pricing-sync"
            className="rounded-lg border border-border px-5 py-2.5 text-sm text-foreground transition-colors hover:bg-secondary"
          >
            View live sync log →
          </Link>
        </div>
      </section>

      {/* ledger */}
      <section className="pt-14">
        <PricingSyncLedger runs={data.runs} checksLastYear={data.checksLastYear} />
        <div className="mt-5">
          <ProviderStatusStrip providers={data.providers} />
        </div>
      </section>

      {/* live feed */}
      <section className="pt-14">
        <h2 className="font-mono text-xs text-muted-foreground">recent sync activity</h2>
        <div className="mt-4">
          {data.recent.length === 0 ? (
            <p className="border-t border-border py-4 font-mono text-xs text-muted-foreground">
              no sync runs logged yet — the first scheduled run will appear here
            </p>
          ) : (
            data.recent.map((run) => <FeedRow key={run.run_at} run={run} />)
          )}
        </div>
      </section>

      {/* stat strip */}
      <section className="grid grid-cols-2 gap-8 py-16 sm:grid-cols-3 lg:grid-cols-5">
        <Stat value={data.modelsTracked.toLocaleString()} label="models tracked" />
        <Stat value={`${SYNC_INTERVAL_HOURS}h`} label="sync interval" />
        <Stat value={data.checksLastYear.toLocaleString()} label="checks in the last year" />
        <Stat
          value={data.uptimePct === null ? "—" : `${data.uptimePct.toFixed(1)}%`}
          label="sync uptime"
        />
        <Stat
          value={
            data.npm && data.npm.totalWeeklyDownloads > 0
              ? data.npm.totalWeeklyDownloads.toLocaleString()
              : "—"
          }
          label="SDK installs this week"
        >
          {data.npm && data.npm.weeks.length > 1 ? (
            <NpmTrendSparkline weeks={data.npm.weeks} />
          ) : null}
        </Stat>

      </section>

    </div>
  );
}

function FeedRow({ run }: { run: SyncRun }) {
  const note = runNote(run);
  const toneClass =
    note.tone === "success"
      ? "text-success"
      : note.tone === "warning"
        ? "text-warning"
        : "text-muted-foreground";

  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-t border-border py-3 last:border-b">
      <span className="font-mono text-sm text-foreground">
        {run.models_checked > 0 ? "model_pricing" : "sync job"}
      </span>
      <span className={`font-mono text-xs ${toneClass}`}>{note.text}</span>
      <span className="font-mono text-xs text-muted-foreground">{relativeTime(run.run_at)}</span>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="font-display text-3xl font-medium tabular-nums text-foreground sm:text-4xl">
        {value}
      </p>
      <p className="mt-1 font-mono text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
