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
