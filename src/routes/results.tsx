import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Copy,
  Check,
  Download,
  Save,
  ArrowLeft,
  TrendingDown,
  Clock,
  CircleDollarSign,
  CheckCircle2,
  Circle,
  ClipboardList,
  Pencil,
  Info,
  PieChart,
  ChevronDown,
  Share2,
  LayoutDashboard,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { PlatformBadge } from "@/components/platform-badge";
import { PlatformDonut } from "@/components/platform-donut";
import { StrategyTimelineBar } from "@/components/strategy-timeline-bar";
import { ModeMixChart } from "@/components/mode-mix-chart";
import { ProgressRing } from "@/components/progress-ring";
import { StepVisualStrip } from "@/components/step-visual-strip";
import { RecommendationHero } from "@/components/recommendation-hero";
import { PlatformScoreBars, type PlatformScore } from "@/components/platform-score-bars";
import { PlatformScoreMatrix } from "@/components/platform-score-matrix";
import { RecommendationInsights } from "@/components/recommendation-insights";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { parseCostToCredits, formatCredits, formatCreditsWithUsd } from "@/lib/cost";
import { getPlatform } from "@/lib/platforms";
import { formatUsd } from "@/lib/pricing";
import { getLiveModelPricing } from "@/lib/live-pricing.functions";
import {
  estimateStrategyFromLivePricing,
  type LivePriceMap,
  type LiveStepEstimate,
  type LiveStrategyEstimate,
} from "@/lib/live-pricing";
import { downloadStrategyPdf } from "@/lib/strategy-pdf";
import { CostBreakdown } from "@/components/cost-breakdown";


/** Pull a monthly USD budget out of a stored budget label like "Pro ($50/mo)". */
function budgetToUsd(budget: string | null | undefined): number {
  if (!budget) return 0;
  const m = budget.match(/\$\s?(\d+(?:\.\d+)?)/);
  return m ? parseFloat(m[1]) : 0;
}


type Step = {
  step_number: number;
  action: string;
  platform: string;
  mode: string;
  estimated_cost: string;
  prompt_to_use: string;
};

type StoredStrategy = {
  idea: string;
  budget: string;
  platforms: string[];
  recommended_platform?: string;
  recommendation_reason?: string;
  optimization_goal?: string;
  confidence_score?: number;
  platform_scores?: PlatformScore[];
  recommended_stack?: string[];
  tradeoffs?: string[];
  total_estimated_cost: string;
  estimated_savings: string;
  time_estimate: string;
  steps: Step[];
};

type StrategyStepsPayload = Step[] | (Partial<StoredStrategy> & { items?: Step[]; recommendation?: Partial<StoredStrategy> });

function normalizeStrategyPayload(base: Omit<StoredStrategy, "steps">, rawSteps: unknown): StoredStrategy {
  const payload = rawSteps as StrategyStepsPayload;
  if (Array.isArray(payload)) return { ...base, steps: payload };
  const recommendation = payload?.recommendation ?? payload ?? {};
  return {
    ...base,
    ...recommendation,
    platforms: base.platforms,
    total_estimated_cost: base.total_estimated_cost,
    estimated_savings: base.estimated_savings,
    time_estimate: base.time_estimate,
    steps: Array.isArray(payload?.items) ? payload.items : [],
  };
}

type StepProgress = {
  step_number: number;
  completed: boolean;
  actual_cost_credits: number | null;
};

export const Route = createFileRoute("/results")({
  validateSearch: (s: Record<string, unknown>): { id?: string } => ({
    id: typeof s.id === "string" ? s.id : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Your build strategy — TokenSavr" },
      { name: "description", content: "Token-optimized AI build plan." },
    ],
  }),
  component: ResultsPage,
});

function ResultsPage() {
  const { id } = Route.useSearch();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [strategy, setStrategy] = useState<StoredStrategy | null>(null);
  const [loading, setLoading] = useState(true);
  const [savedId, setSavedId] = useState<string | undefined>(id);
  const [progress, setProgress] = useState<Record<number, StepProgress>>({});
  const [promptsExpanded, setPromptsExpanded] = useState(false);
  const [livePrices, setLivePrices] = useState<LivePriceMap | null>(null);

  // Live per-token model prices (synced daily into model_pricing).
  useEffect(() => {
    let cancelled = false;
    getLiveModelPricing()
      .then(({ prices }) => {
        if (cancelled) return;
        const map: LivePriceMap = {};
        prices.forEach((p) => {
          map[p.model_id] = p;
        });
        setLivePrices(map);
      })
      .catch((err) => {
        console.error("Live model pricing unavailable", err);
      });
    return () => {
      cancelled = true;
    };
  }, []);



  // Load strategy + (if signed-in) its progress rows
  useEffect(() => {
    let cancelled = false;

    const readSessionStrategy = () => {
      try {
        const raw = sessionStorage.getItem("ts:lastStrategy");
        return raw ? (JSON.parse(raw) as StoredStrategy) : null;
      } catch {
        return null;
      }
    };

    const load = async () => {
      setLoading(true);
      try {
        if (id) {
          const strategyQuery = supabase
            .from("strategies")
            .select(
              "idea,budget,platforms,total_estimated_cost,estimated_savings,time_estimate,steps",
            )
            .eq("id", id)
            .maybeSingle();

          const progressQuery = user
            ? supabase
                .from("step_progress")
                .select("step_number,completed,actual_cost_credits")
                .eq("strategy_id", id)
            : Promise.resolve({ data: [], error: null });

          const timeout = new Promise<never>((_, reject) => {
            window.setTimeout(() => reject(new Error("Strategy load timed out")), 8000);
          });

          const [{ data, error }, progressRes] = await Promise.race([
            Promise.all([strategyQuery, progressQuery]),
            timeout,
          ]);

          if (cancelled) return;

          const fallback = readSessionStrategy();
          const loaded = data
            ? normalizeStrategyPayload(
                {
                  idea: data.idea,
                  budget: data.budget,
                  platforms: (data.platforms as string[]) ?? [],
                  total_estimated_cost: data.total_estimated_cost ?? "—",
                  estimated_savings: data.estimated_savings ?? "—",
                  time_estimate: data.time_estimate ?? "—",
                },
                data.steps,
              )
            : fallback;

          if (error || !loaded) {
            toast.error("Couldn't load that strategy.");
            setStrategy(null);
          } else {
            setStrategy(loaded);
            const map: Record<number, StepProgress> = {};
            (progressRes.data ?? []).forEach((row) => {
              map[row.step_number] = {
                step_number: row.step_number,
                completed: row.completed,
                actual_cost_credits: row.actual_cost_credits,
              };
            });
            setProgress(map);
          }
          return;
        }

        if (!cancelled) setStrategy(readSessionStrategy());
      } catch (err) {
        console.error("Strategy load failed", err);
        if (!cancelled) {
          setStrategy(readSessionStrategy());
          toast.error("Strategy load took too long. Try opening it again.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [id, user]);

  const upsertProgress = async (
    stepNumber: number,
    patch: Partial<Omit<StepProgress, "step_number">>,
  ) => {
    if (!savedId || !user) {
      toast.message("Sign in to track progress", {
        description: "Save this strategy first to track real spend.",
      });
      return;
    }
    const prev = progress[stepNumber] ?? {
      step_number: stepNumber,
      completed: false,
      actual_cost_credits: null,
    };
    const next: StepProgress = { ...prev, ...patch };
    setProgress((p) => ({ ...p, [stepNumber]: next }));

    const { error } = await supabase.from("step_progress").upsert(
      {
        user_id: user.id,
        strategy_id: savedId,
        step_number: stepNumber,
        completed: next.completed,
        actual_cost_credits: next.actual_cost_credits,
      },
      { onConflict: "strategy_id,step_number" },
    );
    if (error) {
      console.error(error);
      toast.error("Couldn't save progress.");
      setProgress((p) => ({ ...p, [stepNumber]: prev }));
    }
  };

  const totals = useMemo(() => {
    if (!strategy) return null;
    const totalSteps = strategy.steps.length;
    const completed = Object.values(progress).filter((p) => p.completed).length;
    const actual = Object.values(progress).reduce(
      (sum, p) => sum + (p.actual_cost_credits ?? 0),
      0,
    );
    const estimated = strategy.steps.reduce(
      (sum, s) => sum + parseCostToCredits(s.estimated_cost),
      0,
    );

    // Per-platform estimated breakdown.
    const byPlatform: Record<
      string,
      { credits: number; steps: number; actual: number; hasActual: boolean }
    > = {};
    strategy.steps.forEach((s) => {
      const key = s.platform || "unknown";
      const entry = (byPlatform[key] ??= {
        credits: 0,
        steps: 0,
        actual: 0,
        hasActual: false,
      });
      entry.credits += parseCostToCredits(s.estimated_cost);
      entry.steps += 1;
      const pr = progress[s.step_number];
      if (pr?.actual_cost_credits != null && pr.actual_cost_credits > 0) {
        entry.actual += pr.actual_cost_credits;
        entry.hasActual = true;
      }
    });
    const platformBreakdown = Object.entries(byPlatform)
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => b.credits - a.credits);
    const platformMax = Math.max(
      0,
      ...platformBreakdown.map((p) => Math.max(p.credits, p.actual)),
    );

    return {
      totalSteps,
      completed,
      actual,
      estimated,
      platformBreakdown,
      platformMax,
    };
  }, [strategy, progress]);

  /** Accurate estimate recomputed from live per-token model prices. */
  const liveEstimate: LiveStrategyEstimate | null = useMemo(() => {
    if (!strategy || !livePrices) return null;
    const est = estimateStrategyFromLivePricing(strategy.steps, livePrices);
    return est.pricedSteps > 0 ? est : null;
  }, [strategy, livePrices]);



  const recommendation = useMemo(() => {
    if (!strategy || !totals) return null;
    const primary = strategy.recommended_platform || totals.platformBreakdown[0]?.id;
    const fallbackScores = totals.platformBreakdown.map((p, index) => ({
      platform: p.id,
      overall: Math.max(55, 88 - index * 7),
      cost: totals.estimated > 0 ? Math.max(40, Math.round(100 - (p.credits / totals.estimated) * 45)) : 80,
      output_quality: Math.max(60, 90 - index * 5),
      speed: Math.max(55, 84 - index * 6),
      beginner_friendly: Math.max(55, 86 - index * 5),
      reason: `${getPlatform(p.id).name} appears in ${p.steps} recommended ${p.steps === 1 ? "step" : "steps"}.`,
    }));
    return {
      recommended_platform: primary,
      recommendation_reason: strategy.recommendation_reason,
      optimization_goal: strategy.optimization_goal || "Balanced recommendation",
      confidence_score: strategy.confidence_score,
      platform_scores: strategy.platform_scores?.length ? strategy.platform_scores : fallbackScores,
      recommended_stack: strategy.recommended_stack?.length
        ? strategy.recommended_stack
        : totals.platformBreakdown.slice(0, 3).map((p) => `${getPlatform(p.id).name} for ${p.steps === 1 ? "a key workflow step" : `${p.steps} workflow steps`}`),
      tradeoffs: strategy.tradeoffs ?? [],
    };
  }, [strategy, totals]);

  const saveToDashboard = async () => {
    if (!user) {
      toast.message("Sign in to save", {
        description: "Create a free account to save strategies.",
      });
      navigate({ to: "/auth" });
      return;
    }
    if (!strategy) return;
    const { data, error } = await supabase
      .from("strategies")
      .insert({
        user_id: user.id,
        title: strategy.idea.slice(0, 80),
        idea: strategy.idea,
        budget: strategy.budget,
        platforms: strategy.platforms,
        total_estimated_cost: strategy.total_estimated_cost,
        estimated_savings: strategy.estimated_savings,
        time_estimate: strategy.time_estimate,
        steps: { items: strategy.steps, recommendation: strategy },
      })
      .select("id")
      .single();
    if (error) {
      toast.error("Failed to save.");
    } else {
      setSavedId(data.id);
      toast.success("Saved to your dashboard.");
    }
  };

  const downloadPdf = () => {
    if (!strategy) return;
    try {
      const safeSlug =
        strategy.idea
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "")
          .slice(0, 40) || "strategy";
      downloadStrategyPdf(strategy, `tokensavr-${safeSlug}.pdf`);
      toast.success("PDF downloaded");
    } catch (err) {
      console.error(err);
      toast.error("Couldn't generate PDF.");
    }
  };

  const copyAllPrompts = async () => {
    if (!strategy) return;
    const md = strategy.steps
      .map(
        (s) =>
          `${s.step_number}. **${s.action}** _(${s.platform} · ${s.mode} · est. ${s.estimated_cost})_\n\n\`\`\`\n${s.prompt_to_use}\n\`\`\``,
      )
      .join("\n\n");
    try {
      await navigator.clipboard.writeText(md);
      toast.success(`Copied ${strategy.steps.length} prompts as markdown`);
    } catch {
      toast.error("Couldn't copy prompts.");
    }
  };

  const copyDashboardSummary = async () => {
    if (!strategy || !totals || !recommendation) return;
    const lines: string[] = [];
    lines.push(`# TokenSavr Build Recommendation`);
    lines.push("");
    lines.push(`**Idea:** ${strategy.idea}`);
    lines.push(`**Recommended path:** ${recommendation.recommended_platform ? getPlatform(recommendation.recommended_platform).name : "—"}`);
    lines.push(`**Optimization goal:** ${recommendation.optimization_goal}`);
    lines.push(`**Confidence:** ${recommendation.confidence_score ?? "—"}%`);
    lines.push(`**Budget:** ${strategy.budget}`);
    lines.push(`**Total estimated cost:** ${strategy.total_estimated_cost}`);
    lines.push(`**Estimated savings:** ${strategy.estimated_savings}`);
    lines.push(`**Estimated build time:** ${strategy.time_estimate}`);
    lines.push(
      `**Progress:** ${totals.completed} / ${totals.totalSteps} steps · actual ${formatCredits(totals.actual)} cr / est ${formatCredits(totals.estimated)} cr`,
    );
    lines.push("");
    lines.push("## Why this route");
    lines.push("");
    lines.push(recommendation.recommendation_reason || "Recommended from platform fit, estimated credits, and workflow balance.");
    lines.push("");
    lines.push("## Platform scorecard");
    lines.push("");
    lines.push("| Platform | Overall | Cost | Quality | Speed | Ease |");
    lines.push("| --- | ---: | ---: | ---: | ---: | ---: |");
    recommendation.platform_scores.forEach((p) => {
      lines.push(`| ${getPlatform(p.platform).name} | ${p.overall} | ${p.cost} | ${p.output_quality} | ${p.speed} | ${p.beginner_friendly} |`);
    });
    lines.push("");
    lines.push("## Cost breakdown by platform");
    lines.push("");
    lines.push("| Platform | Steps | Est. credits | Share |");
    lines.push("| --- | ---: | ---: | ---: |");
    totals.platformBreakdown.forEach((p) => {
      const share =
        totals.estimated > 0
          ? Math.round((p.credits / totals.estimated) * 100)
          : 0;
      lines.push(
        `| ${getPlatform(p.id).name} | ${p.steps} | ${formatCredits(p.credits)} | ${share}% |`,
      );
    });
    lines.push("");
    lines.push("## Steps");
    lines.push("");
    strategy.steps.forEach((s) => {
      lines.push(
        `### ${s.step_number}. ${s.action}`,
      );
      lines.push("");
      lines.push(
        `_${getPlatform(s.platform).name} · ${s.mode} · est. ${s.estimated_cost}_`,
      );
      lines.push("");
      lines.push("```");
      lines.push(s.prompt_to_use);
      lines.push("```");
      lines.push("");
    });
    lines.push("---");
    lines.push("Generated with TokenSavr — https://tokensavr.lovable.app");
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      toast.success("Dashboard summary copied as markdown");
    } catch {
      toast.error("Couldn't copy dashboard.");
    }
  };


  const shareStrategy = async () => {
    if (!strategy) return;
    if (!user) {
      toast.message("Sign in to share", {
        description: "Create a free account to share strategies.",
      });
      navigate({ to: "/auth" });
      return;
    }
    let shareId = savedId;
    if (!shareId) {
      const { data, error } = await supabase
        .from("strategies")
        .insert({
          user_id: user.id,
          title: strategy.idea.slice(0, 80),
          idea: strategy.idea,
          budget: strategy.budget,
          platforms: strategy.platforms,
          total_estimated_cost: strategy.total_estimated_cost,
          estimated_savings: strategy.estimated_savings,
          time_estimate: strategy.time_estimate,
          steps: { items: strategy.steps, recommendation: strategy },
          is_public: true,
        })
        .select("id")
        .single();
      if (error || !data) {
        toast.error("Couldn't create share link.");
        return;
      }
      shareId = data.id;
      setSavedId(shareId);
    } else {
      const { error } = await supabase
        .from("strategies")
        .update({ is_public: true })
        .eq("id", shareId);
      if (error) {
        toast.error("Couldn't enable sharing.");
        return;
      }
    }
    const url = `${window.location.origin}/results?id=${shareId}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Public link copied to clipboard");
    } catch {
      toast.message("Share link ready", { description: url });
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-20 text-center text-muted-foreground">
        Loading your strategy…
      </div>
    );
  }

  if (!strategy) {
    return (
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-20 text-center">
        <h2 className="text-xl font-semibold">No strategy found</h2>
        <p className="mt-2 text-muted-foreground">Generate a new one to get started.</p>
        <Button asChild className="mt-6 bg-gradient-primary">
          <Link to="/generate">Generate strategy</Link>
        </Button>
      </div>
    );
  }

  const tracking = !!savedId && !!user;
  const completionPct = totals && totals.totalSteps > 0
    ? (totals.completed / totals.totalSteps) * 100
    : 0;
  const overEstimate =
    !!totals && totals.estimated > 0 && totals.actual > totals.estimated;

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-10 pb-28 sm:pb-10">
      <div className="flex items-center justify-between gap-2 mb-4">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-foreground -ml-2"
        >
          <Link to="/generate">
            <ArrowLeft className="h-4 w-4 mr-1" /> New strategy
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm" className="gap-2">
          <Link
            to="/generate"
            search={{
              idea: strategy.idea,
              budget: strategy.budget,
              platforms: strategy.platforms,
            }}
          >
            <Pencil className="h-3.5 w-3.5" /> Edit inputs
          </Link>
        </Button>
      </div>

      {recommendation && (
        <RecommendationHero
          recommendation={recommendation}
          totalCost={strategy.total_estimated_cost}
          savings={strategy.estimated_savings}
          timeEstimate={strategy.time_estimate}
        />
      )}

      {liveEstimate && (
        <section className="mt-4 rounded-xl border border-border bg-card p-5 shadow-card">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <CircleDollarSign className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-medium">Live-priced estimate</h2>
            </div>
            <span className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground">
              Model prices synced{" "}
              {liveEstimate.fetchedAt
                ? new Date(liveEstimate.fetchedAt).toLocaleDateString()
                : "recently"}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <LiveStat
              label="Token cost"
              value={formatUsd(liveEstimate.totalUsd)}
              hint="Sum of per-step model API cost"
            />
            <LiveStat
              label="Credit equivalent"
              value={`${formatCredits(liveEstimate.totalCredits)} cr`}
              hint={`at ${formatUsd(liveEstimate.creditUsd)}/credit`}
            />
            <LiveStat
              label="Plan estimate"
              value={`${formatCredits(totals?.estimated ?? 0)} cr`}
              hint="From the generated strategy"
            />
            <LiveStat
              label="Priced steps"
              value={`${liveEstimate.pricedSteps}/${strategy.steps.length}`}
              hint="Steps matched to a live model price"
            />
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Recomputed from real published per-token prices for the model each platform
            runs, using typical token volumes for each step type.
          </p>
        </section>
      )}

      {liveEstimate && liveEstimate.pricedSteps > 0 && (
        <CostBreakdown steps={strategy.steps} estimate={liveEstimate} />
      )}





      <div className="mt-4 rounded-xl border border-border bg-card p-4 shadow-card">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground">Idea</div>
            <p className="mt-1 truncate text-sm text-foreground/90">{strategy.idea}</p>
          </div>
          <Badge variant="outline" className="w-fit font-normal border-border bg-background/40">
            {strategy.budget}
          </Badge>
        </div>
        <div className="mt-4 hidden sm:flex flex-wrap gap-2">
          <Button onClick={saveToDashboard} variant="secondary" className="gap-2" disabled={!!savedId}>
            <Save className="h-4 w-4" />
            {savedId ? "Saved" : "Save to dashboard"}
          </Button>
          <Button onClick={downloadPdf} variant="outline" className="gap-2">
            <Download className="h-4 w-4" /> Download as PDF
          </Button>
          <Button onClick={copyAllPrompts} variant="outline" className="gap-2">
            <ClipboardList className="h-4 w-4" /> Copy all prompts
          </Button>
          <Button onClick={copyDashboardSummary} variant="outline" className="gap-2">
            <LayoutDashboard className="h-4 w-4" /> Copy dashboard
          </Button>
          <Button onClick={shareStrategy} variant="outline" className="gap-2">
            <Share2 className="h-4 w-4" /> Share strategy
          </Button>
        </div>
      </div>

      {recommendation && (
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
          <PlatformScoreBars scores={recommendation.platform_scores} />
          <PlatformScoreMatrix scores={recommendation.platform_scores} />
        </div>
      )}

      {recommendation && (
        <div className="mt-6">
          <RecommendationInsights
            tradeoffs={recommendation.tradeoffs}
            estimatedCredits={totals?.estimated ?? 0}
            monthlyBudgetUsd={budgetToUsd(strategy?.budget)}
          />
        </div>
      )}

      {/* Visual dashboard hero — 4-panel summary */}
      {totals && (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Cost composition donut */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-card">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <PieChart className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-medium">Cost composition</h2>
              </div>
              <span className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground">
                {formatCreditsWithUsd(totals.estimated)} est.
              </span>
            </div>
            {totals.platformBreakdown.length > 0 && totals.estimated > 0 ? (
              <PlatformDonut
                slices={totals.platformBreakdown.map((p) => ({
                  id: p.id,
                  credits: p.credits,
                }))}
                total={totals.estimated}
              />
            ) : (
              <p className="text-xs text-muted-foreground py-4">
                No cost data yet.
              </p>
            )}
          </div>

          {/* Build timeline */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-card">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-medium">Build timeline</h2>
              </div>
              <span className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground">
                Tap to jump
              </span>
            </div>
            <StrategyTimelineBar
              segments={strategy.steps.map((s) => ({
                step_number: s.step_number,
                platform: s.platform,
                action: s.action,
                credits: parseCostToCredits(s.estimated_cost),
                completed: progress[s.step_number]?.completed ?? false,
              }))}
            />
            <p className="mt-3 text-[10px] text-muted-foreground">
              Width = step's share of estimated cost. Faded = completed.
            </p>
          </div>

          {/* Mode mix */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-card">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <CircleDollarSign className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-medium">Mode mix</h2>
              </div>
              <span className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground">
                Plan vs build vs review
              </span>
            </div>
            <ModeMixChart steps={strategy.steps.map((s) => ({ mode: s.mode }))} />
          </div>

          {/* Progress ring */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-card">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-medium">Progress &amp; spend</h2>
              </div>
              <span className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground">
                {strategy.estimated_savings} saved
              </span>
            </div>
            <ProgressRing
              completed={totals.completed}
              total={totals.totalSteps}
              actual={totals.actual}
              estimated={totals.estimated}
            />
            <div className="mt-4 flex items-start gap-2 rounded-md border border-warning/30 bg-warning/5 px-3 py-2 text-[11px] text-foreground/80">
              <Info className="h-3 w-3 text-warning mt-0.5 shrink-0" />
              <p>
                Estimates are rough. Log actual credits per step to refine the
                numbers and surface savings opportunities.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Real-spend tracker */}
      {totals && (
        <div className="mt-6 rounded-xl border border-border bg-card p-5 shadow-card">
          <div className="flex flex-wrap items-end justify-between gap-3 mb-3">
            <div>
              <h2 className="text-sm font-medium">Real spend tracker</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {tracking
                  ? "Mark steps done and log the credits you actually spent."
                  : savedId
                    ? "Sign in to track real spend."
                    : "Save this strategy to start tracking."}
              </p>
            </div>
            <div className="text-right">
              <div className="text-xs text-muted-foreground">Steps done</div>
              <div className="text-lg font-semibold">
                {totals.completed} / {totals.totalSteps}
              </div>
            </div>
          </div>
          <Progress value={completionPct} className="h-2" />
          <div className="mt-4 grid grid-cols-3 gap-3 text-xs">
            <Stat label="Estimated" value={`${formatCredits(totals.estimated)} cr`} />
            <Stat
              label="Actual so far"
              value={`${formatCredits(totals.actual)} cr`}
              tone={overEstimate ? "warn" : "ok"}
            />
            <Stat
              label="Delta"
              value={`${overEstimate ? "+" : ""}${formatCredits(
                totals.actual - totals.estimated,
              )} cr`}
              tone={overEstimate ? "warn" : "ok"}
            />
          </div>
        </div>
      )}

      {/* Per-platform breakdown bars (kept — complements the donut with actuals) */}
      {totals && totals.platformBreakdown.length > 0 && (
        <div className="mt-6 rounded-xl border border-border bg-card p-5 shadow-card">
          <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <PieChart className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-medium">Estimated vs actual by platform</h2>
            </div>
            <span className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground">
              {formatCreditsWithUsd(totals.estimated)} est. total
            </span>
          </div>
          <ul className="space-y-3">
            {totals.platformBreakdown.map((p) => {
              const denom = totals.platformMax || 1;
              const estPct = Math.min(100, (p.credits / denom) * 100);
              const actualPct = Math.min(100, (p.actual / denom) * 100);
              const share =
                totals.estimated > 0
                  ? Math.round((p.credits / totals.estimated) * 100)
                  : 0;
              const platform = getPlatform(p.id);
              return (
                <li key={p.id}>
                  <div className="flex items-center justify-between gap-3 mb-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <PlatformBadge id={p.id} size="sm" />
                      <span className="text-xs text-muted-foreground shrink-0">
                        · {p.steps} {p.steps === 1 ? "step" : "steps"}
                      </span>
                    </div>
                    <div className="text-xs tabular-nums text-muted-foreground shrink-0">
                      {p.hasActual && (
                        <span className="text-foreground font-medium mr-1">
                          {formatCredits(p.actual)} cr actual /
                        </span>
                      )}
                      <span>~{formatCredits(p.credits)} cr est.</span>
                      <span className="ml-1 text-muted-foreground/70">
                        ({share}%)
                      </span>
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
        </div>
      )}

      <div className="mt-8 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Copy-ready prompts</h2>
          <p className="text-xs text-muted-foreground">Prompts are collapsed so the dashboard stays visual.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setPromptsExpanded((v) => !v)}>
          {promptsExpanded ? "Collapse all prompts" : "Expand all prompts"}
        </Button>
      </div>
      <ol className="mt-4 space-y-4">
        {strategy.steps.map((s) => (
          <StepCard
            key={s.step_number}
            step={s}
            progress={progress[s.step_number]}
            tracking={tracking}
            totalSteps={strategy.steps.length}
            totalEstimatedCredits={totals?.estimated ?? 0}
            completedNumbers={
              new Set(
                Object.values(progress)
                  .filter((p) => p.completed)
                  .map((p) => p.step_number),
              )
            }
            forceExpanded={promptsExpanded}
            liveEstimate={liveEstimate?.byStep[s.step_number]}
            onUpdate={(patch) => upsertProgress(s.step_number, patch)}

          />
        ))}
      </ol>

      {/* Sticky mobile action bar */}
      <div className="sm:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border bg-background/95 backdrop-blur-xl shadow-elegant pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto max-w-4xl px-2 py-2 grid grid-cols-5 gap-1">
          <Button
            onClick={saveToDashboard}
            variant="secondary"
            size="sm"
            disabled={!!savedId}
            className="flex-col h-auto py-2 gap-1 px-1"
          >
            <Save className="h-4 w-4" />
            <span className="text-[10px] leading-none">{savedId ? "Saved" : "Save"}</span>
          </Button>
          <Button
            onClick={downloadPdf}
            variant="outline"
            size="sm"
            className="flex-col h-auto py-2 gap-1 px-1"
          >
            <Download className="h-4 w-4" />
            <span className="text-[10px] leading-none">PDF</span>
          </Button>
          <Button
            onClick={copyAllPrompts}
            variant="outline"
            size="sm"
            className="flex-col h-auto py-2 gap-1 px-1"
          >
            <ClipboardList className="h-4 w-4" />
            <span className="text-[10px] leading-none">Prompts</span>
          </Button>
          <Button
            onClick={copyDashboardSummary}
            variant="outline"
            size="sm"
            className="flex-col h-auto py-2 gap-1 px-1"
          >
            <LayoutDashboard className="h-4 w-4" />
            <span className="text-[10px] leading-none">Dashboard</span>
          </Button>
          <Button
            onClick={shareStrategy}
            variant="outline"
            size="sm"
            className="flex-col h-auto py-2 gap-1 px-1"
          >
            <Share2 className="h-4 w-4" />
            <span className="text-[10px] leading-none">Share</span>
          </Button>
        </div>
      </div>
    </div>
  );
}

function LiveStat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-background/40 px-3 py-2">
      <div className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-sm font-semibold text-foreground">{value}</div>
      <div className="mt-0.5 text-[10px] text-muted-foreground">{hint}</div>
    </div>
  );
}

function Stat({

  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "ok" | "warn";
}) {
  const cls =
    tone === "warn"
      ? "border-warning/40 bg-warning/5 text-warning"
      : tone === "ok"
        ? "border-success/30 bg-success/5 text-foreground"
        : "border-border bg-background/40 text-foreground";
  return (
    <div className={`rounded-lg border px-3 py-2 ${cls}`}>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-0.5 text-sm font-semibold">{value}</div>
    </div>
  );
}

function StepCard({
  step,
  progress,
  tracking,
  totalSteps,
  totalEstimatedCredits,
  completedNumbers,
  forceExpanded,
  liveEstimate,
  onUpdate,
}: {
  step: Step;
  progress: StepProgress | undefined;
  tracking: boolean;
  totalSteps: number;
  totalEstimatedCredits: number;
  completedNumbers: Set<number>;
  forceExpanded: boolean;
  liveEstimate?: LiveStepEstimate;
  onUpdate: (patch: Partial<Omit<StepProgress, "step_number">>) => void;
}) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const isOpen = forceExpanded || expanded;
  const [costInput, setCostInput] = useState(
    progress?.actual_cost_credits != null ? String(progress.actual_cost_credits) : "",
  );
  const completed = !!progress?.completed;

  useEffect(() => {
    setCostInput(
      progress?.actual_cost_credits != null
        ? String(progress.actual_cost_credits)
        : "",
    );
  }, [progress?.actual_cost_credits]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(step.prompt_to_use);
      setCopied(true);
      toast.success("Prompt copied");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Couldn't copy.");
    }
  };

  const commitCost = () => {
    const trimmed = costInput.trim();
    if (trimmed === "") {
      onUpdate({ actual_cost_credits: null });
      return;
    }
    const n = parseFloat(trimmed);
    if (!Number.isFinite(n) || n < 0) {
      toast.error("Enter a number ≥ 0.");
      setCostInput(
        progress?.actual_cost_credits != null
          ? String(progress.actual_cost_credits)
          : "",
      );
      return;
    }
    onUpdate({ actual_cost_credits: Math.round(n * 100) / 100 });
  };

  return (
    <li
      id={`step-${step.step_number}`}
      className={`rounded-xl border bg-card shadow-card overflow-hidden transition-colors scroll-mt-24 ${
        completed ? "border-success/40" : "border-border"
      }`}
    >
      <div className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <button
              type="button"
              onClick={() => tracking && onUpdate({ completed: !completed })}
              disabled={!tracking}
              className={`mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors disabled:cursor-not-allowed ${
                completed
                  ? "bg-success/15 text-success hover:bg-success/25"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
              aria-label={completed ? "Mark step incomplete" : "Mark step complete"}
              title={
                tracking
                  ? completed
                    ? "Mark incomplete"
                    : "Mark complete"
                  : "Save this strategy and sign in to track"
              }
            >
              {completed ? (
                <CheckCircle2 className="h-5 w-5" />
              ) : (
                <Circle className="h-5 w-5" />
              )}
            </button>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-muted-foreground">
                  Step {step.step_number}
                </span>
              </div>
              <h3
                className={`font-medium leading-snug mt-0.5 ${
                  completed ? "text-muted-foreground line-through" : ""
                }`}
              >
                {step.action}
              </h3>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <PlatformBadge id={step.platform} size="sm" />
                <Badge
                  variant="outline"
                  className="font-normal text-xs border-warning/40 text-warning"
                >
                  Est. {step.estimated_cost}
                </Badge>
                {liveEstimate && (
                  <Badge
                    variant="outline"
                    className="font-normal text-xs border-primary/40 text-primary"
                    title={`${liveEstimate.profileLabel} · ${liveEstimate.inputTokens.toLocaleString()} in / ${liveEstimate.outputTokens.toLocaleString()} out tokens on ${liveEstimate.sourceModelId}`}
                  >
                    Live {formatCredits(liveEstimate.credits)} cr ·{" "}
                    {formatUsd(liveEstimate.usd)}
                  </Badge>
                )}
              </div>

              <StepVisualStrip
                stepNumber={step.step_number}
                totalSteps={totalSteps}
                completedNumbers={completedNumbers}
                estimatedCredits={parseCostToCredits(step.estimated_cost)}
                totalEstimatedCredits={totalEstimatedCredits}
                actualCredits={progress?.actual_cost_credits ?? null}
                platformId={step.platform}
                mode={step.mode}
              />
            </div>
          </div>
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between gap-2 mb-2">
            <button
              onClick={() => setExpanded((v) => !v)}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
              aria-expanded={isOpen}
            >
              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform ${isOpen ? "rotate-180" : ""}`}
              />
              {isOpen ? "Hide prompt" : "Show prompt"}
            </button>
            <button
              onClick={copy}
              className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              aria-label="Copy prompt"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-success" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
              Copy
            </button>
          </div>
          {isOpen && (
            <div className="relative">
              <pre className="whitespace-pre-wrap rounded-lg border border-border bg-background/60 p-4 pr-12 text-xs sm:text-sm font-mono text-foreground/90 max-h-72 overflow-auto">
                {step.prompt_to_use}
              </pre>
              <button
                onClick={copy}
                className="absolute top-2 right-2 inline-flex items-center justify-center h-8 w-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                aria-label="Copy prompt"
              >
                {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
          )}
        </div>

        {tracking && (
          <div className="mt-4 flex flex-wrap items-center gap-3 text-xs">
            <label className="text-muted-foreground">Actual cost (credits)</label>
            <Input
              type="number"
              step="0.1"
              min="0"
              value={costInput}
              onChange={(e) => setCostInput(e.target.value)}
              onBlur={commitCost}
              onKeyDown={(e) => {
                if (e.key === "Enter") (e.target as HTMLInputElement).blur();
              }}
              placeholder="e.g. 1"
              className="h-8 w-28 bg-background border-border text-sm"
            />
            <span className="text-muted-foreground">
              Estimate: {formatCredits(parseCostToCredits(step.estimated_cost))} cr
            </span>
          </div>
        )}
      </div>
    </li>
  );
}

