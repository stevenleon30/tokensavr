import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  History as HistoryIcon,
  Search,
  Trash2,
  ArrowRight,
  Sparkles,
  Download,
  FileJson,
  Share2,
  HardDrive,
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
import { downloadStrategyJson, strategyFilename } from "@/lib/strategy-export";
import { createStrategyShare } from "@/lib/strategy-share.functions";

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [
      { title: "Strategy history — TokenSavr" },
      {
        name: "description",
        content:
          "Every strategy you've generated and saved to your TokenSavr account, with progress, costs and exports.",
      },
      { property: "og:title", content: "Strategy history — TokenSavr" },
      {
        property: "og:description",
        content: "Browse, search and re-open every AI build strategy saved to your account.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HistoryPage,
});

type Step = {
  step_number?: number;
  action?: string;
  platform: string;
  mode?: string;
  estimated_cost?: string;
  prompt_to_use?: string;
};

type StrategyRow = {
  id: string;
  title: string;
  idea: string;
  budget: string;
  platforms: string[] | null;
  total_estimated_cost: string | null;
  estimated_savings: string | null;
  time_estimate: string | null;
  is_public: boolean | null;
  created_at: string;
  steps: unknown;
};

type ProgressRow = {
  strategy_id: string;
  step_number: number;
  completed: boolean;
  actual_cost_credits: number | null;
};

function normalizeSteps(value: unknown): Step[] {
  if (Array.isArray(value)) return value as Step[];
  if (value && typeof value === "object") {
    const items = (value as { items?: unknown }).items;
    if (Array.isArray(items)) return items as Step[];
    const nested = (value as { steps?: unknown }).steps;
    if (Array.isArray(nested)) return nested as Step[];
  }
  return [];
}

/** Rebuild the full strategy payload used by exports/shares from a saved row. */
function toStrategyPayload(row: StrategyRow) {
  const raw = row.steps as { recommendation?: Record<string, unknown> } | null;
  return {
    ...(raw?.recommendation ?? {}),
    idea: row.idea,
    budget: row.budget,
    platforms: row.platforms ?? [],
    total_estimated_cost: row.total_estimated_cost ?? "—",
    estimated_savings: row.estimated_savings ?? "—",
    time_estimate: row.time_estimate ?? "—",
    steps: normalizeSteps(row.steps),
  } as Record<string, unknown>;
}

function formatWhen(iso: string) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

type SortKey = "newest" | "oldest" | "cost" | "progress";

function HistoryPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<StrategyRow[] | null>(null);
  const [progress, setProgress] = useState<ProgressRow[]>([]);
  const [query, setQuery] = useState("");
  const [platform, setPlatform] = useState<string>("all");
  const [sort, setSort] = useState<SortKey>("newest");
  const [sharingId, setSharingId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate({
        to: "/auth",
        search: { redirect: "/history", idea: undefined },
        replace: true,
      });
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const [strategiesRes, progressRes] = await Promise.all([
        supabase
          .from("strategies")
          .select(
            "id,title,idea,budget,platforms,total_estimated_cost,estimated_savings,time_estimate,is_public,created_at,steps",
          )
          .order("created_at", { ascending: false }),
        supabase
          .from("step_progress")
          .select("strategy_id,step_number,completed,actual_cost_credits"),
      ]);
      if (cancelled) return;
      if (strategiesRes.error) {
        toast.error("Couldn't load your history.");
        setRows([]);
        return;
      }
      setRows((strategiesRes.data as unknown as StrategyRow[]) ?? []);
      setProgress((progressRes.data as ProgressRow[]) ?? []);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const items = useMemo(() => {
    if (!rows) return null;
    const byStrategy: Record<string, ProgressRow[]> = {};
    progress.forEach((p) => {
      (byStrategy[p.strategy_id] ??= []).push(p);
    });

    return rows.map((row) => {
      const steps = normalizeSteps(row.steps);
      const ps = byStrategy[row.id] ?? [];
      const completed = ps.filter((p) => p.completed).length;
      const estimated = steps.reduce(
        (sum, s) => sum + parseCostToCredits(s.estimated_cost ?? null),
        0,
      );
      const actual = ps.reduce((sum, p) => sum + (p.actual_cost_credits ?? 0), 0);
      const platforms = Array.from(
        new Set([...(row.platforms ?? []), ...steps.map((s) => s.platform)].filter(Boolean)),
      );
      return {
        row,
        steps,
        stepCount: steps.length,
        completed,
        pct: steps.length ? Math.round((completed / steps.length) * 100) : 0,
        estimated,
        actual,
        platforms,
      };
    });
  }, [rows, progress]);

  const platformOptions = useMemo(() => {
    const set = new Set<string>();
    (items ?? []).forEach((i) => i.platforms.forEach((p) => set.add(p)));
    return Array.from(set).sort();
  }, [items]);

  const visible = useMemo(() => {
    if (!items) return null;
    const q = query.trim().toLowerCase();
    let list = items.filter((i) => {
      const matchesQuery =
        !q ||
        i.row.idea.toLowerCase().includes(q) ||
        i.row.title.toLowerCase().includes(q) ||
        i.steps.some((s) => (s.action ?? "").toLowerCase().includes(q));
      const matchesPlatform = platform === "all" || i.platforms.includes(platform);
      return matchesQuery && matchesPlatform;
    });
    list = [...list].sort((a, b) => {
      switch (sort) {
        case "oldest":
          return (
            new Date(a.row.created_at).getTime() - new Date(b.row.created_at).getTime()
          );
        case "cost":
          return b.estimated - a.estimated;
        case "progress":
          return b.pct - a.pct;
        default:
          return (
            new Date(b.row.created_at).getTime() - new Date(a.row.created_at).getTime()
          );
      }
    });
    return list;
  }, [items, query, platform, sort]);

  const totals = useMemo(() => {
    if (!items) return null;
    return {
      count: items.length,
      steps: items.reduce((s, i) => s + i.stepCount, 0),
      completed: items.reduce((s, i) => s + i.completed, 0),
      estimated: items.reduce((s, i) => s + i.estimated, 0),
      actual: items.reduce((s, i) => s + i.actual, 0),
    };
  }, [items]);

  const remove = async (id: string) => {
    const { error } = await supabase.from("strategies").delete().eq("id", id);
    if (error) {
      toast.error("Couldn't delete that strategy.");
      return;
    }
    setRows((prev) => (prev ?? []).filter((r) => r.id !== id));
    toast.success("Strategy deleted");
  };

  const exportPdf = (row: StrategyRow) => {
    try {
      const payload = toStrategyPayload(row);
      downloadStrategyPdf(payload as never, strategyFilename(payload.idea, "pdf"));
      toast.success("PDF downloaded");
    } catch (err) {
      console.error(err);
      toast.error("Couldn't generate PDF.");
    }
  };

  const exportJson = (row: StrategyRow) => {
    try {
      downloadStrategyJson(toStrategyPayload(row));
      toast.success("JSON downloaded");
    } catch (err) {
      console.error(err);
      toast.error("Couldn't export JSON.");
    }
  };

  const share = async (row: StrategyRow) => {
    setSharingId(row.id);
    try {
      const { id } = await createStrategyShare({
        data: {
          title: (row.idea || row.title || "AI build strategy").slice(0, 120),
          payload: toStrategyPayload(row),
        },
      });
      const url = `${window.location.origin}/results?share=${id}`;
      try {
        await navigator.clipboard.writeText(url);
        toast.success("Public link copied", {
          description: "Anyone with this link can view it — no account needed.",
        });
      } catch {
        toast.message("Share link ready", { description: url });
      }
    } catch (err) {
      console.error(err);
      toast.error("Couldn't create a share link.");
    } finally {
      setSharingId(null);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-20 text-center text-muted-foreground">
        Loading your history…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">Strategy history</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Everything you've generated and saved to your account — search it, re-open it, export
            it, or share a read-only link.
          </p>
        </div>
        <Button asChild className="bg-gradient-primary gap-2">
          <Link to="/generate">
            <Sparkles className="h-4 w-4" /> New strategy
          </Link>
        </Button>
      </div>

      {totals && totals.count > 0 && (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile label="Strategies" value={String(totals.count)} />
          <StatTile label="Steps completed" value={`${totals.completed}/${totals.steps}`} />
          <StatTile label="Estimated credits" value={`${formatCredits(totals.estimated)} cr`} />
          <StatTile
            label="Tracked spend"
            value={totals.actual > 0 ? `${formatCredits(totals.actual)} cr` : "—"}
          />
        </div>
      )}

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by idea or step…"
            className="pl-9"
            aria-label="Search strategy history"
          />
        </div>
        <select
          value={platform}
          onChange={(e) => setPlatform(e.target.value)}
          aria-label="Filter by platform"
          className="h-10 rounded-md border border-border bg-background px-3 text-sm"
        >
          <option value="all">All platforms</option>
          {platformOptions.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          aria-label="Sort history"
          className="h-10 rounded-md border border-border bg-background px-3 text-sm"
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="cost">Highest estimated cost</option>
          <option value="progress">Most progress</option>
        </select>
      </div>

      {rows === null && (
        <p className="py-10 text-center text-sm text-muted-foreground">Loading history…</p>
      )}

      {rows !== null && rows.length === 0 && (
        <div className="rounded-xl border border-dashed border-border bg-card/50 p-10 text-center">
          <HistoryIcon className="mx-auto h-8 w-8 text-muted-foreground" />
          <h2 className="mt-4 text-lg font-medium">No saved strategies yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Generate a strategy, then choose “Save to dashboard” on the results page and it'll show
            up here.
          </p>
          <Button asChild className="mt-6 bg-gradient-primary gap-2">
            <Link to="/generate">
              <Sparkles className="h-4 w-4" /> Generate a strategy
            </Link>
          </Button>
        </div>
      )}

      {visible && rows !== null && rows.length > 0 && visible.length === 0 && (
        <p className="py-10 text-center text-sm text-muted-foreground">
          No strategies match those filters.
        </p>
      )}

      <div className="space-y-3">
        {(visible ?? []).map((item) => (
          <div
            key={item.row.id}
            className="rounded-xl border border-border bg-card p-4 shadow-card"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate font-medium">{item.row.idea || item.row.title}</p>
                  {item.row.is_public && (
                    <Badge variant="outline" className="border-border font-normal text-xs">
                      Shared
                    </Badge>
                  )}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-mono">{formatWhen(item.row.created_at)}</span>
                  {item.row.budget && (
                    <Badge variant="outline" className="border-border font-normal">
                      {item.row.budget}
                    </Badge>
                  )}
                  <span>{item.stepCount} steps</span>
                  <span>{formatCredits(item.estimated)} cr est.</span>
                  {item.actual > 0 && <span>{formatCredits(item.actual)} cr tracked</span>}
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  {item.platforms.slice(0, 5).map((p) => (
                    <PlatformBadge key={p} id={p} size="sm" />
                  ))}
                </div>
                {item.stepCount > 0 && (
                  <div className="mt-3 max-w-sm">
                    <div className="mb-1 flex items-center justify-between text-[10px] font-mono uppercase tracking-wide text-muted-foreground">
                      <span>Progress</span>
                      <span>
                        {item.completed}/{item.stepCount} · {item.pct}%
                      </span>
                    </div>
                    <Progress value={item.pct} className="h-1.5" />
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  className="gap-2"
                  onClick={() => navigate({ to: "/results", search: { id: item.row.id } })}
                >
                  Open <ArrowRight className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  disabled={sharingId === item.row.id}
                  onClick={() => share(item.row)}
                  aria-label={`Share ${item.row.idea}`}
                >
                  <Share2 className="h-3.5 w-3.5" />
                  {sharingId === item.row.id ? "Linking…" : "Share"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  onClick={() => exportPdf(item.row)}
                  aria-label={`Export ${item.row.idea} as PDF`}
                >
                  <Download className="h-3.5 w-3.5" /> PDF
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  onClick={() => exportJson(item.row)}
                  aria-label={`Export ${item.row.idea} as JSON`}
                >
                  <FileJson className="h-3.5 w-3.5" /> JSON
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-muted-foreground"
                  onClick={() => remove(item.row.id)}
                  aria-label={`Delete ${item.row.idea}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-muted/30 px-4 py-3">
        <p className="text-sm text-muted-foreground">
          Strategies saved without an account live only in this browser.
        </p>
        <Button asChild size="sm" variant="outline" className="gap-2">
          <Link to="/saved">
            <HardDrive className="h-3.5 w-3.5" /> Device-only saves
          </Link>
        </Button>
      </div>
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-card">
      <div className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-lg font-semibold">{value}</div>
    </div>
  );
}
