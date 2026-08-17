import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, Sparkles, Zap, BarChart3, Library } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { PlatformFan } from "@/components/platform-fan";

// Brand hex colors for the platform name strip — kept literal because
// these are external brands, not part of our themed palette. Picked to
// remain legible on both light and dark backgrounds.
const PARTNER_BRANDS: { name: string; color: string }[] = [
  { name: "Lovable", color: "#FF4F8B" },
  { name: "Claude", color: "#D97757" },
  { name: "Claude Code", color: "#C96342" },
  { name: "ChatGPT", color: "#10A37F" },
  { name: "Gemini", color: "#4796E3" },
  { name: "Cursor", color: "#6E6E73" },
  { name: "Windsurf", color: "#0BAA9F" },
  { name: "GitHub Copilot", color: "#6E6E73" },
  { name: "Bolt", color: "#E0AE00" },
  { name: "Replit", color: "#F26207" },
];

export const Route = createFileRoute("/")({
  validateSearch: (s: Record<string, unknown>): { idea?: string } => ({
    idea: typeof s.idea === "string" ? s.idea : undefined,
  }),
  head: () => ({
    meta: [
      { title: "TokenSavr — Stop burning credits. Start building smart." },
      {
        name: "description",
        content:
          "Paste your app idea. Get a token-optimized build plan across Lovable, Claude, Cursor, ChatGPT, and Bolt.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  const navigate = useNavigate();
  const [idea, setIdea] = useState("");
  const [selected, setSelected] = useState<string[]>([]);

  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = idea.trim();
    if (trimmed.length < 10) return;
    navigate({
      to: "/generate",
      search: {
        idea: trimmed,
        budget: undefined,
        platforms: selected.length > 0 ? selected : undefined,
      },
    });
  };




  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-hero pointer-events-none" />
        <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 pt-20 pb-24 sm:pt-28 sm:pb-32 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm font-medium text-foreground shadow-glow backdrop-blur">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
            <Sparkles className="h-4 w-4 text-primary" />
            For vibe coders &amp; indie builders
          </div>

          <h1 className="mt-6 text-5xl sm:text-7xl lg:text-8xl font-semibold tracking-tight leading-[1.02]">
            <span className="bg-gradient-to-br from-foreground via-foreground to-foreground/60 bg-clip-text text-transparent">
              Stop burning credits.
            </span>
            <br />
            <span className="text-gradient">Start building smart.</span>
          </h1>

          <p className="mt-6 text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            TokenSavr turns your app idea into a token-optimized build plan across Lovable, Claude,
            Cursor, ChatGPT, and more — so you save credits and ship faster.
          </p>

          <form onSubmit={onSubmit} className="mt-10 mx-auto max-w-2xl">
            <div className="rounded-2xl border border-border bg-card shadow-card p-2 transition-all focus-within:border-primary/50 focus-within:shadow-elegant">
              <Textarea
                value={idea}
                onChange={(e) => setIdea(e.target.value)}
                placeholder="A SaaS dashboard for tracking gym memberships with Stripe billing and a public landing page…"
                rows={3}
                className="resize-none border-0 bg-transparent text-base focus-visible:ring-0 shadow-none px-3 py-2 placeholder:text-muted-foreground/60"
              />
              <div className="flex items-center justify-between gap-3 px-2 pb-1 pt-2">
                <span className="text-xs text-muted-foreground hidden sm:block">
                  Press Enter to generate · Free preview
                </span>
                <Button
                  type="submit"
                  size="lg"
                  className="bg-gradient-primary hover:opacity-95 shadow-glow transition-all hover:scale-[1.02] gap-2 ml-auto"
                  disabled={idea.trim().length < 10}
                >
                  Generate My Strategy
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </form>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-3 text-xs text-muted-foreground">
            <span>Optimizes across</span>
            {PLATFORM_LIST.map((p) => (
              <span key={p.id} className="inline-flex items-center gap-1.5">
                <span
                  className="h-4 w-4 rounded flex items-center justify-center text-[9px] font-bold text-background"
                  style={{ backgroundColor: p.color }}
                  aria-hidden
                >
                  {p.initial}
                </span>
                {p.name}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">How it works</h2>
          <p className="mt-3 text-muted-foreground">
            Three minutes to a plan that could save you hundreds of credits.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <FeatureCard
            icon={<Zap className="h-5 w-5" />}
            step="01"
            title="Describe your idea"
            body="Paste what you want to build. Pick your daily budget and which platforms you have access to."
          />
          <FeatureCard
            icon={<Sparkles className="h-5 w-5" />}
            step="02"
            title="Get a routed plan"
            body="Free Claude for planning. Lovable Chat for architecture. Build mode only when needed. Each step has a copy-paste prompt."
          />
          <FeatureCard
            icon={<BarChart3 className="h-5 w-5" />}
            step="03"
            title="Track your savings"
            body="Save strategies, watch your daily budget, and learn which features burn the most tokens."
          />
        </div>
      </section>

      {/* Tips teaser */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="rounded-2xl border border-border bg-gradient-mesh p-8 sm:p-12 shadow-card">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 justify-between">
            <div>
              <div className="inline-flex items-center gap-2 text-xs text-primary mb-3">
                <Library className="h-3.5 w-3.5" /> Platform Tips Library
              </div>
              <h3 className="text-2xl font-semibold tracking-tight">
                Browse curated cost-saving tactics
              </h3>
              <p className="mt-2 text-muted-foreground max-w-xl">
                Lovable Chat vs Build mode. Claude SKILL.md tricks. Cursor /compose. ChatGPT model
                routing. Updated as platforms change.
              </p>
            </div>
            <Button asChild size="lg" variant="secondary" className="shrink-0">
              <Link to="/tips">Open library</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Powered-by logo strip */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-16 border-t border-border">
        <p className="text-center text-xs uppercase tracking-widest text-muted-foreground mb-8">
          Optimizes spend across the tools you already use
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
          {PARTNER_BRANDS.map((b) => (
            <span
              key={b.name}
              className="text-base sm:text-lg font-semibold tracking-tight transition-transform hover:scale-[1.05]"
              style={{ color: b.color }}
            >
              {b.name}
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}

function FeatureCard({
  icon,
  step,
  title,
  body,
}: {
  icon: React.ReactNode;
  step: string;
  title: string;
  body: string;
}) {
  return (
    <div className="group rounded-xl border border-border bg-card p-6 shadow-card transition-all hover:border-primary/40 hover:shadow-elegant">
      <div className="flex items-center justify-between mb-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-primary group-hover:bg-gradient-primary group-hover:text-primary-foreground transition-colors">
          {icon}
        </div>
        <span className="text-xs font-mono text-muted-foreground">{step}</span>
      </div>
      <h3 className="font-semibold tracking-tight">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{body}</p>
    </div>
  );
}
