import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { HardDrive, Trash2, ArrowRight, Sparkles, Download, FileJson } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  listLocalStrategies,
  deleteLocalStrategy,
  clearLocalStrategies,
  type LocalStrategyRecord,
} from "@/lib/local-strategies";
import { downloadStrategyPdf } from "@/lib/strategy-pdf";
import { downloadStrategyJson, strategyFilename } from "@/lib/strategy-export";

export const Route = createFileRoute("/saved")({
  head: () => ({
    meta: [
      { title: "Saved in this browser — TokenSavr" },
      {
        name: "description",
        content:
          "Strategies you saved locally on this device. No account required — nothing leaves your browser.",
      },
      { property: "og:title", content: "Saved strategies — TokenSavr" },
      {
        property: "og:description",
        content: "Your locally saved AI build strategies, stored only in this browser.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SavedPage,
});

function formatWhen(iso: string) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function SavedPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<LocalStrategyRecord[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setItems(listLocalStrategies());
    setReady(true);
  }, []);

  const remove = (id: string) => {
    deleteLocalStrategy(id);
    setItems(listLocalStrategies());
    toast.success("Removed from this browser");
  };

  const clearAll = () => {
    clearLocalStrategies();
    setItems([]);
    toast.success("Cleared local strategies");
  };

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">Saved in this browser</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            These strategies are stored only on this device. Clearing your browser data removes them.
          </p>
        </div>
        {items.length > 0 && (
          <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={clearAll}>
            <Trash2 className="mr-1.5 h-4 w-4" /> Clear all
          </Button>
        )}
      </div>

      {ready && items.length === 0 && (
        <div className="rounded-xl border border-dashed border-border bg-card/50 p-10 text-center">
          <HardDrive className="mx-auto h-8 w-8 text-muted-foreground" />
          <h2 className="mt-4 text-lg font-medium">Nothing saved yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Generate a strategy, then choose “Save in this browser” on the results page to keep it
            here without an account.
          </p>
          <Button asChild className="mt-6 bg-gradient-primary gap-2">
            <Link to="/generate">
              <Sparkles className="h-4 w-4" /> Generate a strategy
            </Link>
          </Button>
        </div>
      )}

      <div className="space-y-3">
        {items.map((item) => {
          const idea = String(item.payload.idea ?? "Untitled strategy");
          const budget = item.payload.budget ? String(item.payload.budget) : null;
          const steps = Array.isArray((item.payload as { steps?: unknown[] }).steps)
            ? (item.payload as { steps: unknown[] }).steps.length
            : 0;
          return (
            <div
              key={item.id}
              className="rounded-xl border border-border bg-card p-4 shadow-card"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">{idea}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-mono">{formatWhen(item.savedAt)}</span>
                    {budget && (
                      <Badge variant="outline" className="font-normal border-border">
                        {budget}
                      </Badge>
                    )}
                    {steps > 0 && <span>{steps} steps</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="gap-2"
                    onClick={() => navigate({ to: "/results", search: { local: item.id } })}
                  >
                    Open <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-muted-foreground"
                    onClick={() => remove(item.id)}
                    aria-label={`Delete ${idea}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
