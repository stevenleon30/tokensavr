import { Link } from "@tanstack/react-router";
import { Lightbulb, PlayCircle, ArrowRight, Sparkles } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { PlatformBadge } from "@/components/platform-badge";
import { getPlatform } from "@/lib/platforms";
import { parseCostToCredits, formatCredits } from "@/lib/cost";

export type InsightStrategyRow = {
  id: string;
  title: string;
  created_at: string;
  steps: { platform: string; estimated_cost?: string; step_number?: number }[];
};

export type InsightProgressRow = {
  strategy_id: string;
  step_number: number;
  completed: boolean;
  actual_cost_credits: number | null;
};

// ---------- In-progress strategies ----------
// A strategy is "in progress" when at least one step is completed but not all.
type InProgress = {
  id: string;
  title: string;
  completed: number;
  total: number;
  remainingEstimate: number;
};

function computeInProgress(
  rows: InsightStrategyRow[],
  progress: InsightProgressRow[],
): InProgress[] {
  const byStrategy: Record<string, InsightProgressRow[]> = {};
  progress.forEach((p) => {
    (byStrategy[p.strategy_id] ??= []).push(p);
  });

  return rows
    .map((r) => {
      const ps = byStrategy[r.id] ?? [];
      const completed = ps.filter((p) => p.completed).length;
      const total = (r.steps ?? []).length;
      if (completed === 0 || completed >= total) return null;

      // Sum estimates of steps not yet completed
      const completedNums = new Set(
        ps.filter((p) => p.completed).map((p) => p.step_number),
      );
      const remainingEstimate = (r.steps ?? []).reduce((sum, s, idx) => {
        const num = s.step_number ?? idx + 1;
        if (completedNums.has(num)) return sum;
        return sum + parseCostToCredits(s.estimated_cost ?? null);
      }, 0);

      return {
        id: r.id,
        title: r.title,
        completed,
        total,
        remainingEstimate,
      };
    })
    .filter((x): x is InProgress => x !== null)
    .sort((a, b) => b.completed / b.total - a.completed / a.total)
    .slice(0, 4);
}

export function InProgressCard({
  rows,
  progress,
}: {
  rows: InsightStrategyRow[];
  progress: InsightProgressRow[];
}) {
  const items = computeInProgress(rows, progress);

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <PlayCircle className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-medium">In progress</h2>
        </div>
        {items.length > 0 && (
          <span className="text-xs text-muted-foreground">
            {items.length} active
          </span>
        )}
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground py-2">
          No strategies in flight. Mark a step complete on any saved plan to
          start tracking progress here.
        </p>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => {
            const pct = (item.completed / item.total) * 100;
            return (
              <li key={item.id}>
                <Link
                  to="/results"
                  search={{ id: item.id }}
                  className="block group"
                >
                  <div className="flex items-center justify-between gap-3 mb-1.5">
                    <span className="text-sm font-medium truncate group-hover:text-primary">
                      {item.title}
                    </span>
                    <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                      {item.completed}/{item.total}
                    </span>
                  </div>
                  <Progress value={pct} className="h-1.5" />
                  <div className="mt-1.5 flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      ~{formatCredits(item.remainingEstimate)} cr remaining
                    </span>
                    <span className="inline-flex items-center gap-0.5 group-hover:text-primary">
                      Resume <ArrowRight className="h-3 w-3" />
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// ---------- Savings opportunities ----------
// Heuristic: across all saved strategies, find platforms the user leans on heavily
// where a cheaper alternative could absorb a meaningful share of steps.
type Opportunity = {
  id: string;
  title: string;
  description: string;
  potentialCredits: number;
};

// Rough relative cost weights — used only for "what if you swapped" math.
// Lovable=1.0 baseline (paid credits). Claude/ChatGPT free tiers ≈ 0. Cursor mid.
const COST_WEIGHTS: Record<string, number> = {
  lovable: 1.0,
  bolt: 0.9,
  replit: 0.7,
  cursor: 0.5,
  githubcopilot: 0.5,
  windsurf: 0.5,
  claudecode: 0.4,
  claude: 0.1,
  chatgpt: 0.1,
  gemini: 0.1,
};

function computeOpportunities(rows: InsightStrategyRow[]): Opportunity[] {
  if (rows.length === 0) return [];

  // Aggregate per-platform credit usage
  const platformCredits: Record<string, number> = {};
  const platformStepCount: Record<string, number> = {};
  rows.forEach((r) => {
    (r.steps ?? []).forEach((s) => {
      const id = getPlatform(s.platform || "").id;
      const credits = parseCostToCredits(s.estimated_cost ?? null);
      platformCredits[id] = (platformCredits[id] ?? 0) + credits;
      platformStepCount[id] = (platformStepCount[id] ?? 0) + 1;
    });
  });

  const opportunities: Opportunity[] = [];

  // Opportunity 1: Heavy Lovable user → 30% could shift to Claude Code / Cursor
  const lovableCredits = platformCredits["lovable"] ?? 0;
  const lovableSteps = platformStepCount["lovable"] ?? 0;
  if (lovableCredits >= 5 && lovableSteps >= 4) {
    const shiftable = Math.round(lovableCredits * 0.3 * 10) / 10;
    opportunities.push({
      id: "lovable-shift",
      title: "Offload boilerplate from Lovable",
      description:
        "About 30% of your Lovable steps look like setup or refactors that Claude Code or Cursor could handle for cheaper.",
      potentialCredits: shiftable,
    });
  }

  // Opportunity 2: User isn't using free Claude/ChatGPT for planning
  const freeUsage =
    (platformCredits["claude"] ?? 0) +
    (platformCredits["chatgpt"] ?? 0) +
    (platformCredits["gemini"] ?? 0);
  const totalCredits = Object.values(platformCredits).reduce((a, b) => a + b, 0);
  if (totalCredits >= 8 && freeUsage / totalCredits < 0.15) {
    const planningSavings = Math.round(totalCredits * 0.1 * 10) / 10;
    opportunities.push({
      id: "free-planning",
      title: "Plan in a free tool first",
      description:
        "You barely use Claude or ChatGPT. Drafting prompts and architecture there before paid runs typically trims ~10% off total credits.",
      potentialCredits: planningSavings,
    });
  }

  // Opportunity 3: Multi-platform spread → consolidating reduces context-switching cost
  const usedPlatforms = Object.values(platformStepCount).filter((n) => n > 0).length;
  if (usedPlatforms >= 5 && rows.length >= 3) {
    opportunities.push({
      id: "consolidate",
      title: "Consolidate to your top 3 platforms",
      description: `You're spreading across ${usedPlatforms} platforms. Sticking to your 3 most-used ones cuts re-prompting and context loss.`,
      potentialCredits: Math.round(totalCredits * 0.05 * 10) / 10,
    });
  }

  return opportunities.sort((a, b) => b.potentialCredits - a.potentialCredits);
}

export function OpportunitiesCard({ rows }: { rows: InsightStrategyRow[] }) {
  const opps = computeOpportunities(rows);

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-medium">Savings opportunities</h2>
        </div>
        {opps.length > 0 && (
          <span className="text-xs text-success font-medium tabular-nums">
            ~{formatCredits(opps.reduce((s, o) => s + o.potentialCredits, 0))} cr
          </span>
        )}
      </div>
      {opps.length === 0 ? (
        <div className="py-2 flex items-start gap-2 text-xs text-muted-foreground">
          <Sparkles className="h-4 w-4 text-muted-foreground/60 shrink-0 mt-0.5" />
          <span>
            Save a few more strategies and we'll surface patterns where you
            could trim credits.
          </span>
        </div>
      ) : (
        <ul className="space-y-3">
          {opps.map((opp) => (
            <li
              key={opp.id}
              className="rounded-lg border border-border/60 bg-background/40 p-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium">{opp.title}</div>
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                    {opp.description}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-sm font-semibold text-success tabular-nums">
                    ~{formatCredits(opp.potentialCredits)}
                  </div>
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    cr/mo
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
