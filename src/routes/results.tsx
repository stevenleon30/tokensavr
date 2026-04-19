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
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { PlatformBadge } from "@/components/platform-badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { parseCostToCredits, formatCredits } from "@/lib/cost";
import { downloadStrategyPdf } from "@/lib/strategy-pdf";

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
  total_estimated_cost: string;
  estimated_savings: string;
  time_estimate: string;
  steps: Step[];
};

type StepProgress = {
  step_number: number;
  completed: boolean;
  actual_cost_credits: number | null;
};

export const Route = createFileRoute("/results")({
  validateSearch: (s: Record<string, unknown>) => ({
    id: typeof s.id === "string" ? s.id : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Your build strategy — TokenSavvy" },
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

  // Load strategy + (if signed-in) its progress rows
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (id) {
        const [{ data, error }, progressRes] = await Promise.all([
          supabase
            .from("strategies")
            .select(
              "idea,budget,platforms,total_estimated_cost,estimated_savings,time_estimate,steps",
            )
            .eq("id", id)
            .maybeSingle(),
          supabase
            .from("step_progress")
            .select("step_number,completed,actual_cost_credits")
            .eq("strategy_id", id),
        ]);
        if (cancelled) return;
        if (error || !data) {
          toast.error("Couldn't load that strategy.");
        } else {
          setStrategy({
            idea: data.idea,
            budget: data.budget,
            platforms: (data.platforms as string[]) ?? [],
            total_estimated_cost: data.total_estimated_cost ?? "—",
            estimated_savings: data.estimated_savings ?? "—",
            time_estimate: data.time_estimate ?? "—",
            steps: (data.steps as unknown as Step[]) ?? [],
          });
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
        setLoading(false);
        return;
      }
      const raw = sessionStorage.getItem("ts:lastStrategy");
      if (raw) {
        try {
          setStrategy(JSON.parse(raw));
        } catch {
          /* noop */
        }
      }
      setLoading(false);
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

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
    return { totalSteps, completed, actual, estimated };
  }, [strategy, progress]);

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
        steps: strategy.steps,
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
      downloadStrategyPdf(strategy, `tokensavvy-${safeSlug}.pdf`);
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
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-10">
      <Button
        asChild
        variant="ghost"
        size="sm"
        className="text-muted-foreground hover:text-foreground -ml-2 mb-4"
      >
        <Link to="/generate">
          <ArrowLeft className="h-4 w-4 mr-1" /> New strategy
        </Link>
      </Button>

      <div className="rounded-2xl border border-border bg-gradient-mesh p-6 sm:p-8 shadow-card">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Your build strategy</h1>
        <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{strategy.idea}</p>

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <SummaryCard
            icon={<CircleDollarSign className="h-4 w-4" />}
            label="Total estimated cost"
            value={strategy.total_estimated_cost}
          />
          <SummaryCard
            icon={<TrendingDown className="h-4 w-4 text-success" />}
            label="Estimated savings"
            value={strategy.estimated_savings}
            accent
          />
          <SummaryCard
            icon={<Clock className="h-4 w-4" />}
            label="Time estimate"
            value={strategy.time_estimate}
          />
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <Button onClick={saveToDashboard} variant="secondary" className="gap-2" disabled={!!savedId}>
            <Save className="h-4 w-4" />
            {savedId ? "Saved" : "Save to dashboard"}
          </Button>
          <Button onClick={downloadPdf} variant="outline" className="gap-2">
            <Download className="h-4 w-4" /> Download as PDF
          </Button>
        </div>
      </div>

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

      <ol className="mt-8 space-y-4">
        {strategy.steps.map((s) => (
          <StepCard
            key={s.step_number}
            step={s}
            progress={progress[s.step_number]}
            tracking={tracking}
            onUpdate={(patch) => upsertProgress(s.step_number, patch)}
          />
        ))}
      </ol>
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

function SummaryCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        accent ? "border-success/40 bg-success/5" : "border-border bg-card/60"
      }`}
    >
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-1 text-lg font-semibold tracking-tight break-words">{value}</div>
    </div>
  );
}

function StepCard({
  step,
  progress,
  tracking,
  onUpdate,
}: {
  step: Step;
  progress: StepProgress | undefined;
  tracking: boolean;
  onUpdate: (patch: Partial<Omit<StepProgress, "step_number">>) => void;
}) {
  const [copied, setCopied] = useState(false);
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
      className={`rounded-xl border bg-card shadow-card overflow-hidden transition-colors ${
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
            <div className="min-w-0">
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
                <Badge variant="secondary" className="font-normal text-xs">
                  {step.mode}
                </Badge>
                <Badge
                  variant="outline"
                  className="font-normal text-xs border-warning/40 text-warning"
                >
                  Est. {step.estimated_cost}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 relative">
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

