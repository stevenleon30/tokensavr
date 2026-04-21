import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Loader2, ArrowRight, Check, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PlatformBadge } from "@/components/platform-badge";
import { BUDGETS, PLATFORM_LIST } from "@/lib/platforms";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import {
  streamStrategy,
  type StreamingPartial,
  type StreamingStep,
} from "@/lib/strategy-stream";
import { loadUserCalibration } from "@/lib/calibration";

export const Route = createFileRoute("/generate")({
  validateSearch: (
    s: Record<string, unknown>,
  ): { idea?: string; budget?: string; platforms?: string[] } => ({
    idea: typeof s.idea === "string" ? s.idea : undefined,
    budget: typeof s.budget === "string" ? s.budget : undefined,
    platforms:
      Array.isArray(s.platforms) && s.platforms.every((p) => typeof p === "string")
        ? (s.platforms as string[])
        : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Generate a strategy — TokenSavr" },
      {
        name: "description",
        content: "Build a token-optimized plan for your app idea across multiple AI platforms.",
      },
    ],
  }),
  component: GeneratePage,
});

function isCompleteStep(s: StreamingStep): boolean {
  return (
    typeof s.step_number === "number" &&
    !!s.action &&
    !!s.platform &&
    !!s.mode &&
    !!s.estimated_cost &&
    !!s.prompt_to_use
  );
}

// Reverse-map a budget label (or raw custom string) to a budget id + custom text.
function resolveBudget(budgetParam: string | undefined): { id: string; custom: string } {
  if (!budgetParam) return { id: "free", custom: "" };
  const match = BUDGETS.find((b) => b.label === budgetParam);
  if (match) return { id: match.id, custom: "" };
  return { id: "custom", custom: budgetParam };
}

function GeneratePage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const { user } = useAuth();

  const initialBudget = resolveBudget(search.budget);

  const [idea, setIdea] = useState(search.idea ?? "");
  const [budgetId, setBudgetId] = useState<string>(initialBudget.id);
  const [customBudget, setCustomBudget] = useState(initialBudget.custom);
  const [platforms, setPlatforms] = useState<string[]>(
    search.platforms && search.platforms.length > 0 ? search.platforms : ["lovable", "claude"],
  );
  const [loading, setLoading] = useState(false);
  const [partial, setPartial] = useState<StreamingPartial | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const previewRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (search.idea && !idea) setIdea(search.idea);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search.idea]);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const togglePlatform = (id: string) => {
    setPlatforms((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
  };

  const onGenerate = async () => {
    if (idea.trim().length < 10) {
      toast.error("Please describe what you want to build (10+ characters).");
      return;
    }
    if (platforms.length === 0) {
      toast.error("Select at least one platform.");
      return;
    }
    const budgetLabel =
      budgetId === "custom"
        ? customBudget.trim() || "Custom (not specified)"
        : BUDGETS.find((b) => b.id === budgetId)?.label ?? "Free tier only";

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setPartial({ steps: [] });
    // Smooth scroll to live preview
    setTimeout(() => previewRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);

    let lastPartial: StreamingPartial | null = null;
    let errored = false;

    // Pull the user's running accuracy signal so the AI can nudge estimates
    // up or down based on their historical over/under pattern. Failures here
    // are non-fatal — we just generate without calibration.
    let calibration: Awaited<ReturnType<typeof loadUserCalibration>> = null;
    let calibrationDisabled = false;
    try {
      calibrationDisabled = localStorage.getItem("ts:calibrationDisabled") === "1";
    } catch {}
    if (user && !calibrationDisabled) {
      try {
        calibration = await loadUserCalibration(user.id);
        if (calibration && Math.abs(Math.round(calibration.avgErrorPct * 100)) >= 10) {
          const pct = Math.round(calibration.avgErrorPct * 100);
          toast.message("Calibrating estimates", {
            description: `Past strategies ran ${pct > 0 ? `${pct}% over` : `${Math.abs(pct)}% under`} estimate — adjusting.`,
          });
        }
      } catch (e) {
        console.warn("calibration load failed", e);
      }
    }

    try {
      await streamStrategy(
        {
          idea: idea.trim(),
          budget: budgetLabel,
          platforms,
          ...(calibration ? { calibration } : {}),
        },
        {
          onPartial: (p) => {
            lastPartial = p;
            setPartial(p);
          },
          onError: (msg) => {
            errored = true;
            toast.error(msg);
          },
        },
        controller.signal,
      );
    } catch (e) {
      if (controller.signal.aborted) return;
      errored = true;
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Failed to generate strategy.");
    }

    if (errored || !lastPartial) {
      setLoading(false);
      return;
    }

    // Validate completeness
    const final = lastPartial as StreamingPartial;
    const completeSteps = (final.steps ?? []).filter(isCompleteStep) as Required<StreamingStep>[];
    if (
      !final.total_estimated_cost ||
      !final.estimated_savings ||
      completeSteps.length === 0
    ) {
      setLoading(false);
      toast.error("AI returned an incomplete plan. Please try again.");
      return;
    }

    const result = {
      total_estimated_cost: final.total_estimated_cost,
      estimated_savings: final.estimated_savings,
      time_estimate: final.time_estimate ?? "—",
      steps: completeSteps,
    };

    const payload = {
      idea: idea.trim(),
      budget: budgetLabel,
      platforms,
      ...result,
    };
    sessionStorage.setItem("ts:lastStrategy", JSON.stringify(payload));

    let savedId: string | undefined;
    if (user) {
      const { data, error } = await supabase
        .from("strategies")
        .insert({
          user_id: user.id,
          title: idea.trim().slice(0, 80),
          idea: idea.trim(),
          budget: budgetLabel,
          platforms,
          total_estimated_cost: result.total_estimated_cost,
          estimated_savings: result.estimated_savings,
          time_estimate: result.time_estimate,
          steps: result.steps,
        })
        .select("id")
        .single();
      if (error) {
        console.error(error);
        toast.error("Couldn't save strategy, but here's your plan.");
      } else {
        savedId = data.id;
      }
    }

    setLoading(false);
    navigate({ to: "/results", search: savedId ? { id: savedId } : {} });
  };

  const liveSteps = partial?.steps ?? [];

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-10">
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">Generate a strategy</h1>
        <p className="mt-2 text-muted-foreground">
          Tell us about your project. We'll build the cheapest sequence of prompts.{" "}
          <Link to="/docs" className="text-primary underline-offset-2 hover:underline">
            How does this work?
          </Link>
        </p>
      </div>

      <div className="space-y-8">
        {/* Step 1 */}
        <section>
          <StepHeader n="01" title="Describe what you want to build" />
          <Textarea
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            rows={5}
            placeholder="e.g. A Notion-style note-taking app with AI summarization, login, and a Stripe billing page."
            className="bg-card border-border resize-none"
            disabled={loading}
          />
          <p className="mt-2 text-xs text-muted-foreground">
            Be specific — features, integrations, target users.
          </p>
        </section>

        {/* Step 2 */}
        <section>
          <StepHeader n="02" title="What's your budget?" />
          <div className="grid sm:grid-cols-2 gap-3">
            {BUDGETS.map((b) => {
              const active = budgetId === b.id;
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setBudgetId(b.id)}
                  disabled={loading}
                  className={`text-left rounded-lg border p-4 transition-all disabled:opacity-60 ${
                    active
                      ? "border-primary bg-primary/5 shadow-elegant"
                      : "border-border bg-card hover:border-primary/40"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-medium">{b.label}</div>
                      <div className="text-xs text-muted-foreground mt-1">{b.desc}</div>
                    </div>
                    {active && <Check className="h-4 w-4 text-primary shrink-0" />}
                  </div>
                </button>
              );
            })}
          </div>
          {budgetId === "custom" && (
            <Input
              className="mt-3 bg-card border-border"
              placeholder="e.g. $30/month, mostly Lovable"
              value={customBudget}
              onChange={(e) => setCustomBudget(e.target.value)}
              disabled={loading}
            />
          )}
        </section>

        {/* Step 3 */}
        <section>
          <StepHeader n="03" title="Which platforms do you have access to?" />
          <div className="flex flex-wrap gap-2">
            {PLATFORM_LIST.map((p) => {
              const active = platforms.includes(p.id);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => togglePlatform(p.id)}
                  disabled={loading}
                  className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition-all disabled:opacity-60 ${
                    active
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border bg-card text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <span
                    className="h-5 w-5 rounded flex items-center justify-center text-[10px] font-bold text-background"
                    style={{ backgroundColor: p.color }}
                    aria-hidden
                  >
                    {p.initial}
                  </span>
                  {p.name}
                  {active && <Check className="h-3.5 w-3.5 text-primary" />}
                </button>
              );
            })}
          </div>
        </section>

        {/* Step 4 */}
        <section>
          <StepHeader n="04" title="Generate" />
          <Button
            size="lg"
            onClick={onGenerate}
            disabled={loading}
            className="w-full sm:w-auto bg-gradient-primary hover:opacity-95 shadow-glow gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Streaming your plan…
              </>
            ) : (
              <>
                Generate Strategy
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
          {!user && (
            <p className="mt-3 text-xs text-muted-foreground">
              Tip:{" "}
              <Link to="/auth" className="text-primary underline-offset-2 hover:underline">
                sign in
              </Link>{" "}
              to save strategies to your dashboard.
            </p>
          )}
        </section>

        {/* Live streaming preview */}
        {(loading || liveSteps.length > 0) && (
          <section ref={previewRef} className="pt-2">
            <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
              <Sparkles className="h-4 w-4 text-primary" />
              {loading ? (
                <span>
                  Generating live — {liveSteps.length} step{liveSteps.length === 1 ? "" : "s"} so far
                </span>
              ) : (
                <span>Done. Redirecting to your plan…</span>
              )}
            </div>

            {(partial?.total_estimated_cost || partial?.estimated_savings) && (
              <div className="mb-4 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                <MiniStat label="Cost" value={partial?.total_estimated_cost} />
                <MiniStat label="Savings" value={partial?.estimated_savings} accent />
                <MiniStat label="Time" value={partial?.time_estimate} />
              </div>
            )}

            <ol className="space-y-3">
              {liveSteps.map((s, i) => (
                <LiveStep key={i} step={s} index={i} />
              ))}
              {loading && (
                <li className="rounded-xl border border-dashed border-border bg-card/40 p-5">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Drafting the next step…
                  </div>
                </li>
              )}
            </ol>
          </section>
        )}
      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
  accent,
}: {
  label: string;
  value?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border px-3 py-2 ${
        accent ? "border-success/40 bg-success/5" : "border-border bg-card/60"
      }`}
    >
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-sm font-medium truncate">{value ?? "…"}</div>
    </div>
  );
}

function LiveStep({ step, index }: { step: StreamingStep; index: number }) {
  const num = step.step_number ?? index + 1;
  const ready = isCompleteStep(step);
  return (
    <li
      className={`rounded-xl border bg-card shadow-card overflow-hidden transition-all ${
        ready ? "border-border opacity-100" : "border-border/60 opacity-80"
      }`}
    >
      <div className="p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-gradient-primary text-xs font-semibold text-primary-foreground">
            {num}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-medium leading-snug">
              {step.action ?? <span className="text-muted-foreground">Writing action…</span>}
            </h3>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {step.platform ? (
                <PlatformBadge id={step.platform} size="sm" />
              ) : (
                <Badge variant="outline" className="text-xs font-normal text-muted-foreground">
                  picking platform…
                </Badge>
              )}
              {step.mode && (
                <Badge variant="secondary" className="font-normal text-xs">
                  {step.mode}
                </Badge>
              )}
              {step.estimated_cost && (
                <Badge
                  variant="outline"
                  className="font-normal text-xs border-warning/40 text-warning"
                >
                  {step.estimated_cost}
                </Badge>
              )}
            </div>
          </div>
        </div>
        {step.prompt_to_use && (
          <pre className="mt-3 whitespace-pre-wrap rounded-lg border border-border bg-background/60 p-3 text-xs font-mono text-foreground/80 max-h-48 overflow-auto">
            {step.prompt_to_use}
          </pre>
        )}
      </div>
    </li>
  );
}

function StepHeader({ n, title }: { n: string; title: string }) {
  return (
    <div className="mb-3 flex items-center gap-3">
      <span className="text-xs font-mono text-muted-foreground">{n}</span>
      <Label className="text-base font-medium">{title}</Label>
    </div>
  );
}
