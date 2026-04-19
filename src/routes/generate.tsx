import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, ArrowRight, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useServerFn } from "@tanstack/react-start";
import { generateStrategy } from "@/server/strategy.functions";
import { BUDGETS, PLATFORM_LIST } from "@/lib/platforms";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/generate")({
  validateSearch: (s: Record<string, unknown>) => ({
    idea: typeof s.idea === "string" ? s.idea : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Generate a strategy — TokenSavvy" },
      {
        name: "description",
        content: "Build a token-optimized plan for your app idea across multiple AI platforms.",
      },
    ],
  }),
  component: GeneratePage,
});

function GeneratePage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const { user } = useAuth();
  const generate = useServerFn(generateStrategy);

  const [idea, setIdea] = useState(search.idea ?? "");
  const [budgetId, setBudgetId] = useState<string>("free");
  const [customBudget, setCustomBudget] = useState("");
  const [platforms, setPlatforms] = useState<string[]>(["lovable", "claude"]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (search.idea && !idea) setIdea(search.idea);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search.idea]);

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

    setLoading(true);
    try {
      const result = await generate({
        data: { idea: idea.trim(), budget: budgetLabel, platforms },
      });

      // Store in sessionStorage for results page (works for guests)
      const payload = {
        idea: idea.trim(),
        budget: budgetLabel,
        platforms,
        ...result,
      };
      sessionStorage.setItem("ts:lastStrategy", JSON.stringify(payload));

      // If logged in, save to DB
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

      navigate({ to: "/results", search: savedId ? { id: savedId } : {} });
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Failed to generate strategy.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-10">
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">Generate a strategy</h1>
        <p className="mt-2 text-muted-foreground">
          Tell us about your project. We'll build the cheapest sequence of prompts.
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
          />
          <p className="mt-2 text-xs text-muted-foreground">
            Be specific — features, integrations, target users.
          </p>
        </section>

        {/* Step 2 */}
        <section>
          <StepHeader n="02" title="What's your daily budget?" />
          <div className="grid sm:grid-cols-2 gap-3">
            {BUDGETS.map((b) => {
              const active = budgetId === b.id;
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setBudgetId(b.id)}
                  className={`text-left rounded-lg border p-4 transition-all ${
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
                  className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition-all ${
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
                Routing your build…
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
              Tip: <button onClick={() => navigate({ to: "/auth" })} className="text-primary underline-offset-2 hover:underline">sign in</button> to save strategies to your dashboard.
            </p>
          )}
        </section>
      </div>
    </div>
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
