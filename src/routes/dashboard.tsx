import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Trash2,
  FileText,
  TrendingDown,
  Coins,
  Sparkles,
  Target,
  Gauge,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { PlatformBadge } from "@/components/platform-badge";
import { getPlatform } from "@/lib/platforms";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { parseCostToCredits, formatCredits } from "@/lib/cost";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — TokenSavvy" },
      { name: "description", content: "Your saved strategies and budget tracker." },
    ],
  }),
  component: DashboardPage,
});

type StrategyRow = {
  id: string;
  title: string;
  budget: string;
  platforms: string[];
  total_estimated_cost: string | null;
  estimated_savings: string | null;
  created_at: string;
  steps: { platform: string; estimated_cost?: string; step_number?: number }[];
};

type ProgressRow = {
  strategy_id: string;
  step_number: number;
  completed: boolean;
  actual_cost_credits: number | null;
};

function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<StrategyRow[] | null>(null);
  const [progress, setProgress] = useState<ProgressRow[]>([]);
  const [budgetLimit, setBudgetLimit] = useState(5);
  const [usedToday, setUsedToday] = useState(0);

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/auth" });
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const [strategiesRes, profileRes, progressRes] = await Promise.all([
        supabase
          .from("strategies")
          .select(
            "id,title,budget,platforms,total_estimated_cost,estimated_savings,created_at,steps",
          )
          .order("created_at", { ascending: false }),
        supabase
          .from("profiles")
          .select("daily_budget_credits")
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase
          .from("step_progress")
          .select("strategy_id,step_number,completed,actual_cost_credits"),
      ]);
      if (cancelled) return;
      const strategies = (strategiesRes.data as unknown as StrategyRow[]) ?? [];
      setRows(strategies);
      setProgress((progressRes.data as ProgressRow[]) ?? []);
      if (profileRes.data?.daily_budget_credits)
        setBudgetLimit(profileRes.data.daily_budget_credits);

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const used = strategies.filter(
        (s) => new Date(s.created_at).getTime() >= today.getTime(),
      ).length;
      setUsedToday(used);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const stats = useMemo(() => {
    if (!rows) return null;
    const totalSaved = rows.length;

    // Most-used platform across all steps
    const platformCount: Record<string, number> = {};
    rows.forEach((r) =>
      (r.steps ?? []).forEach((s) => {
        const k = s.platform || "unknown";
        platformCount[k] = (platformCount[k] ?? 0) + 1;
      }),
    );
    const fav =
      Object.entries(platformCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";

    // Per-strategy estimated and actual credit totals
    const progressByStrategy: Record<string, ProgressRow[]> = {};
    progress.forEach((p) => {
      (progressByStrategy[p.strategy_id] ??= []).push(p);
    });

    let totalEstimated = 0;
    let totalActual = 0;
    let totalActualHasData = false;

    const perStrategy = rows.map((r) => {
      const estimated = (r.steps ?? []).reduce(
        (sum, s) => sum + parseCostToCredits(s.estimated_cost ?? null),
        0,
      );
      const ps = progressByStrategy[r.id] ?? [];
      const actual = ps.reduce(
        (sum, p) => sum + (p.actual_cost_credits ?? 0),
        0,
      );
      const hasActual = ps.some(
        (p) => p.actual_cost_credits != null && p.actual_cost_credits > 0,
      );
      const completed = ps.filter((p) => p.completed).length;
      totalEstimated += estimated;
      if (hasActual) {
        totalActual += actual;
        totalActualHasData = true;
      }
      return {
        id: r.id,
        title: r.title,
        estimated,
        actual,
        hasActual,
        completed,
        totalSteps: (r.steps ?? []).length,
      };
    });

    // Last 7 days: count of strategies generated per day
    const days: { day: string; strategies: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const next = new Date(d);
      next.setDate(d.getDate() + 1);
      const count = rows.filter((r) => {
        const t = new Date(r.created_at).getTime();
        return t >= d.getTime() && t < next.getTime();
      }).length;
      days.push({
        day: d.toLocaleDateString(undefined, { weekday: "short" }),
        strategies: count,
      });
    }

    // Real spend chart: top 6 most-recent tracked strategies
    const trackedChart = perStrategy
      .filter((p) => p.hasActual || p.completed > 0)
      .slice(0, 6)
      .reverse()
      .map((p) => ({
        name: p.title.length > 18 ? p.title.slice(0, 18) + "…" : p.title,
        Estimated: Math.round(p.estimated * 10) / 10,
        Actual: Math.round(p.actual * 10) / 10,
      }));

    // Per-platform breakdown: estimated + actual credits per platform
    const platformTotals: Record<
      string,
      { estimated: number; actual: number; hasActual: boolean }
    > = {};
    rows.forEach((r) => {
      const ps = progressByStrategy[r.id] ?? [];
      const progressByStep: Record<number, ProgressRow> = {};
      ps.forEach((p) => {
        progressByStep[p.step_number] = p;
      });
      (r.steps ?? []).forEach((s, idx) => {
        const platform = getPlatform(s.platform || "unknown").name;
        const entry = (platformTotals[platform] ??= {
          estimated: 0,
          actual: 0,
          hasActual: false,
        });
        entry.estimated += parseCostToCredits(s.estimated_cost ?? null);
        const stepNum = s.step_number ?? idx + 1;
        const pr = progressByStep[stepNum];
        if (pr?.actual_cost_credits != null && pr.actual_cost_credits > 0) {
          entry.actual += pr.actual_cost_credits;
          entry.hasActual = true;
        }
      });
    });
    const platformBreakdown = Object.entries(platformTotals)
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => (b.actual || b.estimated) - (a.actual || a.estimated));
    const platformActualMax = Math.max(
      0,
      ...platformBreakdown.map((p) => Math.max(p.actual, p.estimated)),
    );

    const realSavings = totalActualHasData ? totalEstimated - totalActual : null;

    // Estimate accuracy: how close the AI's guesses were to reality.
    // Per-strategy ratio = actual / estimated. Accuracy = 100 - mean(|1 - ratio|) * 100.
    // Skips strategies without tracked actuals or with 0 estimate.
    const tracked = perStrategy.filter(
      (p) => p.hasActual && p.estimated > 0,
    );
    let accuracy: {
      score: number; // 0-100
      sampleSize: number;
      avgErrorPct: number; // signed: positive = AI underestimated (real > est)
      overCount: number;
      underCount: number;
      worst: { id: string; title: string; errorPct: number } | null;
      best: { id: string; title: string; errorPct: number } | null;
    } | null = null;
    if (tracked.length > 0) {
      const errors = tracked.map((p) => ({
        id: p.id,
        title: p.title,
        // signed deviation as fraction: +0.5 means actual is 50% higher than est.
        deviation: (p.actual - p.estimated) / p.estimated,
      }));
      const meanAbs =
        errors.reduce((s, e) => s + Math.abs(e.deviation), 0) / errors.length;
      const meanSigned =
        errors.reduce((s, e) => s + e.deviation, 0) / errors.length;
      const sortedByAbs = [...errors].sort(
        (a, b) => Math.abs(a.deviation) - Math.abs(b.deviation),
      );
      accuracy = {
        score: Math.max(0, Math.round((1 - Math.min(1, meanAbs)) * 100)),
        sampleSize: tracked.length,
        avgErrorPct: Math.round(meanSigned * 100),
        overCount: errors.filter((e) => e.deviation > 0.05).length,
        underCount: errors.filter((e) => e.deviation < -0.05).length,
        best: sortedByAbs[0]
          ? {
              id: sortedByAbs[0].id,
              title: sortedByAbs[0].title,
              errorPct: Math.round(sortedByAbs[0].deviation * 100),
            }
          : null,
        worst: sortedByAbs[sortedByAbs.length - 1]
          ? {
              id: sortedByAbs[sortedByAbs.length - 1].id,
              title: sortedByAbs[sortedByAbs.length - 1].title,
              errorPct: Math.round(
                sortedByAbs[sortedByAbs.length - 1].deviation * 100,
              ),
            }
          : null,
      };
    }

    return {
      totalSaved,
      fav,
      days,
      trackedChart,
      perStrategy,
      platformBreakdown,
      platformActualMax,
      totalEstimated,
      totalActual,
      totalActualHasData,
      realSavings,
      accuracy,
    };
  }, [rows, progress]);

  const onDelete = async (id: string) => {
    const { error } = await supabase.from("strategies").delete().eq("id", id);
    if (error) {
      toast.error("Couldn't delete.");
      return;
    }
    setRows((r) => r?.filter((x) => x.id !== id) ?? null);
    setProgress((p) => p.filter((x) => x.strategy_id !== id));
    toast.success("Deleted.");
  };

  if (authLoading || !user) {
    return <div className="mx-auto max-w-6xl px-4 py-20 text-muted-foreground">Loading…</div>;
  }

  const pct = budgetLimit > 0 ? Math.min(100, (usedToday / budgetLimit) * 100) : 0;
  const overBudget = usedToday >= budgetLimit;
  const overSpend =
    !!stats?.totalActualHasData && stats.totalActual > stats.totalEstimated;

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-muted-foreground text-sm">
            Welcome back{user.email ? `, ${user.email.split("@")[0]}` : ""}.
          </p>
        </div>
        <Button asChild className="bg-gradient-primary gap-2">
          <Link to="/generate">
            <Plus className="h-4 w-4" />
            New strategy
          </Link>
        </Button>
      </div>

      {/* Top stat row */}
      <div className="grid gap-4 md:grid-cols-4 mb-8">
        <div className="rounded-xl border border-border bg-card p-5 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Daily budget</span>
            <Coins className={`h-4 w-4 ${overBudget ? "text-warning" : "text-primary"}`} />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-semibold">{usedToday}</span>
            <span className="text-sm text-muted-foreground">/ {budgetLimit} strategies</span>
          </div>
          <Progress value={pct} className="mt-3 h-2" />
          {overBudget && (
            <p className="mt-2 text-xs text-warning">
              You've hit today's budget. Bump it in Settings if needed.
            </p>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Real spend</span>
            <Target className={`h-4 w-4 ${overSpend ? "text-warning" : "text-primary"}`} />
          </div>
          {stats?.totalActualHasData ? (
            <>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-semibold">
                  {formatCredits(stats.totalActual)}
                </span>
                <span className="text-sm text-muted-foreground">
                  / {formatCredits(stats.totalEstimated)} cr est.
                </span>
              </div>
              <p
                className={`mt-1 text-xs ${
                  overSpend ? "text-warning" : "text-success"
                }`}
              >
                {overSpend ? "Over" : "Under"} estimate by{" "}
                {formatCredits(Math.abs(stats.totalActual - stats.totalEstimated))} cr
              </p>
            </>
          ) : (
            <>
              <div className="mt-2 text-sm text-muted-foreground">
                Log actual costs on a strategy to compare.
              </div>
              <p className="mt-1 text-xs text-muted-foreground">No tracked spend yet</p>
            </>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Real savings</span>
            <TrendingDown className="h-4 w-4 text-success" />
          </div>
          {stats?.realSavings != null ? (
            <>
              <div className="mt-2 text-2xl font-semibold">
                {stats.realSavings >= 0 ? "" : "-"}
                {formatCredits(Math.abs(stats.realSavings))} cr
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                vs. running everything in one platform
              </p>
            </>
          ) : (
            <>
              <div className="mt-2 text-2xl font-semibold text-muted-foreground">—</div>
              <p className="mt-1 text-xs text-muted-foreground">Awaiting tracked data</p>
            </>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Strategies saved</span>
            <FileText className="h-4 w-4 text-primary" />
          </div>
          <div className="mt-2 text-2xl font-semibold">{stats?.totalSaved ?? "—"}</div>
          <p className="mt-1 text-xs text-muted-foreground">
            Most-used:{" "}
            {stats?.fav && stats.fav !== "—" ? (
              <span className="text-foreground">{stats.fav}</span>
            ) : (
              "—"
            )}
          </p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2 mb-8">
        <div className="rounded-xl border border-border bg-card p-5 shadow-card">
          <h2 className="text-sm font-medium mb-4">Strategies generated · last 7 days</h2>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats?.days ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis
                  dataKey="day"
                  stroke="var(--color-muted-foreground)"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="var(--color-muted-foreground)"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--color-popover)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  cursor={{ fill: "var(--color-secondary)" }}
                />
                <Bar dataKey="strategies" fill="var(--color-primary)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-card">
          <h2 className="text-sm font-medium mb-4">Estimated vs. actual · per strategy</h2>
          {stats?.trackedChart && stats.trackedChart.length > 0 ? (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.trackedChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis
                    dataKey="name"
                    stroke="var(--color-muted-foreground)"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="var(--color-muted-foreground)"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "var(--color-popover)",
                      border: "1px solid var(--color-border)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    cursor={{ fill: "var(--color-secondary)" }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="Estimated" fill="var(--color-muted-foreground)" radius={[4, 4, 0, 0]}>
                    {stats.trackedChart.map((_, i) => (
                      <Cell key={`e-${i}`} />
                    ))}
                  </Bar>
                  <Bar dataKey="Actual" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-48 flex flex-col items-center justify-center text-center text-xs text-muted-foreground gap-2">
              <Target className="h-5 w-5 text-muted-foreground/50" />
              Track real costs on any strategy to see them here.
            </div>
          )}
        </div>
      </div>

      {/* Estimate accuracy */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-card mb-8">
        <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <Gauge className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-medium">Estimate accuracy</h2>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              How close the AI's cost guesses have been to your real spend.
            </p>
          </div>
          {stats?.accuracy && (
            <span className="text-xs text-muted-foreground">
              Based on {stats.accuracy.sampleSize} tracked{" "}
              {stats.accuracy.sampleSize === 1 ? "strategy" : "strategies"}
            </span>
          )}
        </div>
        {stats?.accuracy ? (
          <AccuracyWidget accuracy={stats.accuracy} />
        ) : (
          <div className="py-6 text-center text-xs text-muted-foreground">
            Log actual costs on at least one strategy to see how accurate the
            estimates have been.
          </div>
        )}
      </div>

      {/* Per-platform breakdown */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-card mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-medium">Spend by platform</h2>
          <span className="text-xs text-muted-foreground">
            Where your credits actually go
          </span>
        </div>
        {stats?.platformBreakdown && stats.platformBreakdown.length > 0 ? (
          <ul className="space-y-3">
            {stats.platformBreakdown.map((p) => {
              const denom = stats.platformActualMax || 1;
              const actualPct = Math.min(100, (p.actual / denom) * 100);
              const estPct = Math.min(100, (p.estimated / denom) * 100);
              const platform = getPlatform(p.name);
              return (
                <li key={p.name}>
                  <div className="flex items-center justify-between gap-3 mb-1.5">
                    <PlatformBadge id={p.name} size="sm" />
                    <div className="text-xs text-muted-foreground tabular-nums">
                      {p.hasActual ? (
                        <>
                          <span className="text-foreground font-medium">
                            {formatCredits(p.actual)}
                          </span>
                          <span> / {formatCredits(p.estimated)} cr est.</span>
                        </>
                      ) : (
                        <span>{formatCredits(p.estimated)} cr est.</span>
                      )}
                    </div>
                  </div>
                  <div className="relative h-2 rounded-full bg-secondary overflow-hidden">
                    <div
                      className="absolute inset-y-0 left-0 rounded-full opacity-30"
                      style={{
                        width: `${estPct}%`,
                        backgroundColor: platform.color,
                      }}
                    />
                    {p.hasActual && (
                      <div
                        className="absolute inset-y-0 left-0 rounded-full"
                        style={{
                          width: `${actualPct}%`,
                          backgroundColor: platform.color,
                        }}
                      />
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-xs text-muted-foreground">
            Generate a strategy to see your platform mix here.
          </p>
        )}
      </div>

      {/* Strategy list */}
      <h2 className="text-sm font-medium mb-3 text-muted-foreground">Saved strategies</h2>
      {rows === null ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center">
          <Sparkles className="h-6 w-6 text-primary mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No strategies yet.</p>
          <Button asChild className="mt-4 bg-gradient-primary">
            <Link to="/generate">Generate your first one</Link>
          </Button>
        </div>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => {
            const ps = stats?.perStrategy.find((p) => p.id === r.id);
            return (
              <li
                key={r.id}
                className="group rounded-xl border border-border bg-card p-4 shadow-card transition-colors hover:border-primary/40"
              >
                <div className="flex items-start justify-between gap-4">
                  <Link to="/results" search={{ id: r.id }} className="flex-1 min-w-0">
                    <h3 className="font-medium leading-snug truncate">{r.title}</h3>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span>{new Date(r.created_at).toLocaleDateString()}</span>
                      <span>·</span>
                      <span>{r.budget}</span>
                      {ps && ps.totalSteps > 0 && (
                        <>
                          <span>·</span>
                          <span>
                            {ps.completed}/{ps.totalSteps} done
                          </span>
                        </>
                      )}
                      {ps?.hasActual && (
                        <>
                          <span>·</span>
                          <span
                            className={
                              ps.actual > ps.estimated ? "text-warning" : "text-success"
                            }
                          >
                            {formatCredits(ps.actual)} cr actual
                          </span>
                        </>
                      )}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {r.platforms.map((p) => (
                        <PlatformBadge key={p} id={p} size="sm" />
                      ))}
                    </div>
                  </Link>
                  <button
                    onClick={() => onDelete(r.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    aria-label="Delete strategy"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

type AccuracyData = {
  score: number;
  sampleSize: number;
  avgErrorPct: number;
  overCount: number;
  underCount: number;
  worst: { id: string; title: string; errorPct: number } | null;
  best: { id: string; title: string; errorPct: number } | null;
};

function AccuracyWidget({ accuracy }: { accuracy: AccuracyData }) {
  const { score, avgErrorPct, overCount, underCount, best, worst } = accuracy;
  const tone =
    score >= 80 ? "success" : score >= 50 ? "primary" : "warning";
  const ringColor =
    tone === "success"
      ? "var(--color-success)"
      : tone === "warning"
        ? "var(--color-warning)"
        : "var(--color-primary)";
  const label =
    score >= 80
      ? "Pretty trustworthy"
      : score >= 50
        ? "Roughly in the ballpark"
        : "Take with a grain of salt";
  const direction =
    avgErrorPct > 5
      ? `On average, real spend was ${avgErrorPct}% higher than the AI's estimate.`
      : avgErrorPct < -5
        ? `On average, real spend was ${Math.abs(avgErrorPct)}% lower than the AI's estimate.`
        : `On average, the AI's estimates were within ~${Math.max(
            Math.abs(avgErrorPct),
            1,
          )}% of real spend.`;

  return (
    <div className="grid gap-5 md:grid-cols-[auto_1fr] md:items-center">
      {/* Circular gauge */}
      <div className="flex items-center gap-4">
        <div
          className="relative h-24 w-24 shrink-0 rounded-full"
          style={{
            background: `conic-gradient(${ringColor} ${score * 3.6}deg, var(--color-secondary) 0deg)`,
          }}
        >
          <div className="absolute inset-1.5 rounded-full bg-card flex flex-col items-center justify-center">
            <span className="text-2xl font-semibold tabular-nums">
              {score}
            </span>
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
              / 100
            </span>
          </div>
        </div>
        <div className="md:hidden">
          <div className="text-sm font-medium">{label}</div>
          <p className="text-xs text-muted-foreground mt-0.5">{direction}</p>
        </div>
      </div>

      {/* Details */}
      <div className="space-y-3">
        <div className="hidden md:block">
          <div className="text-sm font-medium">{label}</div>
          <p className="text-xs text-muted-foreground mt-0.5">{direction}</p>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-lg border border-warning/30 bg-warning/5 px-3 py-2">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <TrendingUp className="h-3 w-3 text-warning" /> Underestimated
            </div>
            <div className="mt-0.5 font-semibold tabular-nums">
              {overCount} {overCount === 1 ? "strategy" : "strategies"}
            </div>
          </div>
          <div className="rounded-lg border border-success/30 bg-success/5 px-3 py-2">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <TrendingDown className="h-3 w-3 text-success" /> Overestimated
            </div>
            <div className="mt-0.5 font-semibold tabular-nums">
              {underCount} {underCount === 1 ? "strategy" : "strategies"}
            </div>
          </div>
        </div>
        {(best || worst) && (
          <div className="grid gap-1.5 text-xs">
            {best && (
              <div className="flex items-center justify-between gap-2 rounded-md border border-border bg-background/40 px-3 py-1.5">
                <span className="text-muted-foreground shrink-0">
                  Closest call
                </span>
                <Link
                  to="/results"
                  search={{ id: best.id }}
                  className="truncate text-foreground hover:text-primary"
                >
                  {best.title}
                </Link>
                <span className="tabular-nums text-muted-foreground shrink-0">
                  {best.errorPct >= 0 ? "+" : ""}
                  {best.errorPct}%
                </span>
              </div>
            )}
            {worst && worst.id !== best?.id && (
              <div className="flex items-center justify-between gap-2 rounded-md border border-border bg-background/40 px-3 py-1.5">
                <span className="text-muted-foreground shrink-0">
                  Biggest miss
                </span>
                <Link
                  to="/results"
                  search={{ id: worst.id }}
                  className="truncate text-foreground hover:text-primary"
                >
                  {worst.title}
                </Link>
                <span
                  className={`tabular-nums shrink-0 ${
                    worst.errorPct > 0 ? "text-warning" : "text-success"
                  }`}
                >
                  {worst.errorPct >= 0 ? "+" : ""}
                  {worst.errorPct}%
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
