import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  RefreshCw,
  Database,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Play,
} from "lucide-react";
import {
  getPricingSyncStatus,
  type PricingSyncStatus,
} from "@/lib/sync-status.functions";
import {
  getIsPricingAdmin,
  runPricingSyncNow,
  type SyncRunResult,
} from "@/lib/admin-sync.functions";
import { useAuth } from "@/lib/auth";


export const Route = createFileRoute("/pricing-sync")({
  head: () => ({
    meta: [
      { title: "Pricing sync status — TokenSavr" },
      {
        name: "description",
        content:
          "Live status of the daily model pricing sync: last run time, rows updated in the past 24 hours, per-source model counts, and coverage of the models TokenSavr estimates against.",
      },
      { property: "og:title", content: "Pricing sync status — TokenSavr" },
      {
        property: "og:description",
        content:
          "Last sync time, run metrics, and updated model counts for TokenSavr's daily model pricing sync.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PricingSyncPage,
});

const SOURCE_LABELS: Record<string, string> = {
  openrouter: "OpenRouter",
  litellm: "LiteLLM",
  manual: "Manual overrides",
};

function fmtDateTime(iso: string | null) {
  if (!iso) return "Never";
  return new Date(iso).toLocaleString();
}

function relative(iso: string | null) {
  if (!iso) return "no run recorded";
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 48) return `${hrs} hr ago`;
  return `${Math.round(hrs / 24)} days ago`;
}

function nextRunUtc() {
  const now = new Date();
  const next = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 6, 0, 0),
  );
  if (next.getTime() <= now.getTime()) next.setUTCDate(next.getUTCDate() + 1);
  return next;
}

function PricingSyncPage() {
  const [status, setStatus] = useState<PricingSyncStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setStatus(await getPricingSyncStatus());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load sync status");
    } finally {
      setLoading(false);
    }
  };

  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [running, setRunning] = useState(false);
  const [runResult, setRunResult] = useState<SyncRunResult | null>(null);
  const [runError, setRunError] = useState<string | null>(null);

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      return;
    }
    let cancelled = false;
    getIsPricingAdmin()
      .then((r) => !cancelled && setIsAdmin(r.isAdmin))
      .catch(() => !cancelled && setIsAdmin(false));
    return () => {
      cancelled = true;
    };
  }, [user]);

  const triggerSync = async () => {
    setRunning(true);
    setRunError(null);
    setRunResult(null);
    try {
      const result = await runPricingSyncNow();
      setRunResult(result);
      if (result.ok) await load();
    } catch (e) {
      setRunError(e instanceof Error ? e.message : "Sync request failed");
    } finally {
      setRunning(false);
    }
  };


  const stale =
    !!status &&
    (!status.lastFetchedAt ||
      Date.now() - new Date(status.lastFetchedAt).getTime() > 36 * 60 * 60 * 1000);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Pricing sync status
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Model prices refresh automatically every day at 06:00 UTC from OpenRouter and
            LiteLLM, plus hand-verified platform overrides. This page reports the last run and
            what it touched.
          </p>
        </div>
        <button
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium shadow-card transition hover:bg-accent disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="mt-6 flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {!status && loading && (
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-xl border border-border bg-card"
            />
          ))}
        </div>
      )}

      {status && (
        <>
          <div
            className={`mt-6 flex items-center gap-2 rounded-xl border p-4 text-sm ${
              stale
                ? "border-warning/40 bg-warning/5 text-warning"
                : "border-success/30 bg-success/5 text-foreground"
            }`}
          >
            {stale ? (
              <AlertTriangle className="h-4 w-4 shrink-0" />
            ) : (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
            )}
            <span>
              {stale
                ? `Prices look stale — last sync ${relative(status.lastFetchedAt)}.`
                : `Pricing is current — last sync ${relative(status.lastFetchedAt)}.`}
            </span>
          </div>

          {isAdmin && (
            <section className="mt-4 rounded-xl border border-primary/30 bg-primary/5 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    Admin controls
                  </div>
                  <p className="mt-1 max-w-xl text-xs text-muted-foreground">
                    Run the sync immediately instead of waiting for the 06:00 UTC job. It
                    refetches OpenRouter and LiteLLM and re-applies manual overrides.
                  </p>
                </div>
                <button
                  onClick={() => void triggerSync()}
                  disabled={running}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
                >
                  {running ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                  {running ? "Syncing…" : "Run sync now"}
                </button>
              </div>

              {running && (
                <p className="mt-3 text-xs text-muted-foreground">
                  Fetching upstream catalogs — this usually takes 10–30 seconds.
                </p>
              )}

              {runError && (
                <div className="mt-3 flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>{runError}</span>
                </div>
              )}

              {runResult && (
                <div
                  className={`mt-3 rounded-lg border p-3 text-xs ${
                    runResult.ok
                      ? "border-success/30 bg-success/5"
                      : "border-destructive/40 bg-destructive/5 text-destructive"
                  }`}
                >
                  <div className="flex items-center gap-2 font-medium">
                    {runResult.ok ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                    ) : (
                      <AlertTriangle className="h-3.5 w-3.5" />
                    )}
                    {runResult.ok
                      ? `Sync succeeded — ${runResult.total?.toLocaleString()} models upserted in ${(runResult.durationMs / 1000).toFixed(1)}s`
                      : `Sync failed after ${(runResult.durationMs / 1000).toFixed(1)}s`}
                  </div>
                  {runResult.ok && runResult.counts ? (
                    <ul className="mt-2 grid gap-1 sm:grid-cols-3">
                      <li>OpenRouter: {runResult.counts.openrouter.toLocaleString()}</li>
                      <li>LiteLLM: {runResult.counts.litellm.toLocaleString()}</li>
                      <li>Manual: {runResult.counts.manual.toLocaleString()}</li>
                    </ul>
                  ) : (
                    <p className="mt-2 font-mono break-words">{runResult.error}</p>
                  )}
                  <p className="mt-2 text-muted-foreground">
                    Started {fmtDateTime(runResult.startedAt)} · finished{" "}
                    {fmtDateTime(runResult.finishedAt)}
                  </p>
                </div>
              )}
            </section>
          )}



          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              icon={<Clock className="h-4 w-4" />}
              label="Last sync"
              value={fmtDateTime(status.lastFetchedAt)}
              hint={relative(status.lastFetchedAt)}
            />
            <StatCard
              icon={<Database className="h-4 w-4" />}
              label="Models in catalog"
              value={status.totalModels.toLocaleString()}
              hint="Rows in the pricing table"
            />
            <StatCard
              icon={<RefreshCw className="h-4 w-4" />}
              label="Updated (24h)"
              value={status.updatedLast24h.toLocaleString()}
              hint="Rows refreshed by the last run"
            />
            <StatCard
              icon={<CheckCircle2 className="h-4 w-4" />}
              label="Estimator coverage"
              value={`${status.trackedModelsPriced}/${status.trackedModelsTotal}`}
              hint="Models used for strategy estimates"
            />
          </div>

          <section className="mt-10">
            <h2 className="text-lg font-semibold">By source</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Each run upserts on source + model id, so counts stay stable while prices change.
            </p>
            <div className="mt-4 overflow-x-auto rounded-xl border border-border bg-card shadow-card">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-3 font-medium">Source</th>
                    <th className="px-4 py-3 font-medium">Models</th>
                    <th className="px-4 py-3 font-medium">Updated (24h)</th>
                    <th className="px-4 py-3 font-medium">Last fetched</th>
                  </tr>
                </thead>
                <tbody>
                  {status.sources.map((s) => (
                    <tr key={s.source} className="border-b border-border/60 last:border-0">
                      <td className="px-4 py-3 font-medium">
                        {SOURCE_LABELS[s.source] ?? s.source}
                      </td>
                      <td className="px-4 py-3">{s.total.toLocaleString()}</td>
                      <td className="px-4 py-3">
                        {s.updatedLast24h.toLocaleString()}
                        {s.total > 0 && (
                          <span className="ml-1 text-xs text-muted-foreground">
                            ({Math.round((s.updatedLast24h / s.total) * 100)}%)
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {fmtDateTime(s.lastFetchedAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="mt-10 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-border bg-card p-4 shadow-card">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                Schedule
              </div>
              <div className="mt-1 text-sm font-medium">Daily at 06:00 UTC</div>
              <div className="mt-1 text-xs text-muted-foreground">
                Next run {fmtDateTime(nextRunUtc().toISOString())}
              </div>
            </div>
            <div className="rounded-xl border border-border bg-card p-4 shadow-card">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                Status checked
              </div>
              <div className="mt-1 text-sm font-medium">{fmtDateTime(status.checkedAt)}</div>
              <div className="mt-1 text-xs text-muted-foreground">
                Live read of the pricing table
              </div>
            </div>
          </section>
        </>
      )}

      <p className="mt-10 text-xs text-muted-foreground">
        See the{" "}
        <Link to="/pricing" className="text-primary underline-offset-4 hover:underline">
          pricing comparison
        </Link>{" "}
        for how these rates apply to each platform.
      </p>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-card">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-2 text-lg font-semibold leading-tight">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{hint}</div>
    </div>
  );
}
