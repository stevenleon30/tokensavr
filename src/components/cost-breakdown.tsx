import { useState } from "react";
import { ChevronDown, TrendingDown, Coins } from "lucide-react";
import { formatUsd } from "@/lib/pricing";
import { formatCredits } from "@/lib/cost";
import { getPlatform } from "@/lib/platforms";
import type { LiveStrategyEstimate } from "@/lib/live-pricing";

type Step = {
  step_number: number;
  platform: string;
  mode: string;
  action?: string;
};

/** Per-million-token rate, compact. */
function rate(perMillion: number) {
  if (!perMillion) return "—";
  return `$${perMillion < 1 ? perMillion.toFixed(2) : perMillion.toFixed(perMillion < 10 ? 2 : 0)}/M`;
}

/**
 * Per-step token + cost breakdown sourced from the daily-synced `model_pricing`
 * table, with the delta against running every step on a frontier model so users
 * can see exactly where the savings come from.
 */
export function CostBreakdown({
  steps,
  estimate,
}: {
  steps: Step[];
  estimate: LiveStrategyEstimate;
}) {
  const [open, setOpen] = useState(true);
  const priced = steps.filter((s) => estimate.byStep[s.step_number]);
  const baselineName = estimate.baselineModelId ?? "frontier model";

  return (
    <section className="mt-4 rounded-xl border border-border bg-card shadow-card">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 p-5 text-left"
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Coins className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-medium">Where the savings come from</h2>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Token volume and live per-token pricing for every step, vs. running the whole
            build on {baselineName}.
          </p>
        </div>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="px-5 pb-5">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Cell
              label="Tokens"
              value={`${(estimate.totalTokens / 1000).toFixed(0)}K`}
              hint={`${(estimate.totalInputTokens / 1000).toFixed(0)}K in / ${(estimate.totalOutputTokens / 1000).toFixed(0)}K out`}
            />
            <Cell
              label="This plan"
              value={formatUsd(estimate.totalUsd)}
              hint={`${formatCredits(estimate.totalCredits)} cr`}
            />
            <Cell
              label={`All ${baselineName}`}
              value={formatUsd(estimate.baselineUsd)}
              hint={`${formatCredits(estimate.baselineCredits)} cr baseline`}
            />
            <Cell
              label="You avoid"
              value={formatUsd(estimate.savedUsd)}
              hint={`${Math.round(estimate.savedShare * 100)}% of baseline cost`}
              accent
            />
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[640px] text-xs">
              <thead>
                <tr className="border-b border-border text-[10px] font-mono uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 pr-3 text-left font-normal">Step</th>
                  <th className="py-2 pr-3 text-left font-normal">Model</th>
                  <th className="py-2 pr-3 text-right font-normal">Tokens</th>
                  <th className="py-2 pr-3 text-right font-normal">Rate (in/out)</th>
                  <th className="py-2 pr-3 text-right font-normal">Cost</th>
                  <th className="py-2 pr-3 text-right font-normal">Baseline</th>
                  <th className="py-2 text-right font-normal">Saved</th>
                </tr>
              </thead>
              <tbody>
                {priced.map((s) => {
                  const e = estimate.byStep[s.step_number]!;
                  const platform = getPlatform(s.platform);
                  return (
                    <tr key={s.step_number} className="border-b border-border/50 last:border-0">
                      <td className="py-2 pr-3">
                        <div className="flex items-center gap-2">
                          <span
                            className="inline-block h-2 w-2 shrink-0 rounded-full"
                            style={{ backgroundColor: platform.color }}
                          />
                          <span className="font-mono text-[10px] text-muted-foreground">
                            {s.step_number}
                          </span>
                          <span className="truncate">{platform.name}</span>
                        </div>
                        <div className="mt-0.5 pl-6 text-[10px] text-muted-foreground">
                          {e.profileLabel}
                        </div>
                      </td>
                      <td className="py-2 pr-3 font-mono text-[10px] text-muted-foreground">
                        {e.sourceModelId ?? e.modelId}
                      </td>
                      <td className="py-2 pr-3 text-right tabular-nums">
                        {(e.totalTokens / 1000).toFixed(1)}K
                        <div className="text-[10px] text-muted-foreground">
                          {(e.inputTokens / 1000).toFixed(0)}K / {(e.outputTokens / 1000).toFixed(1)}K
                        </div>
                      </td>
                      <td className="py-2 pr-3 text-right font-mono text-[10px] text-muted-foreground tabular-nums">
                        {rate(e.inputPerMillion)}
                        <div>{rate(e.outputPerMillion)}</div>
                      </td>
                      <td className="py-2 pr-3 text-right tabular-nums">
                        {formatUsd(e.usd)}
                        <div className="text-[10px] text-muted-foreground">
                          {formatCredits(e.credits)} cr · {Math.round(e.costShare * 100)}%
                        </div>
                      </td>
                      <td className="py-2 pr-3 text-right tabular-nums text-muted-foreground">
                        {formatUsd(e.baselineUsd)}
                      </td>
                      <td className="py-2 text-right tabular-nums">
                        {e.savedUsd > 0 ? (
                          <span className="inline-flex items-center gap-1 text-success">
                            <TrendingDown className="h-3 w-3" />
                            {formatUsd(e.savedUsd)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <p className="mt-3 text-xs text-muted-foreground">
            Rates come from the model pricing catalog synced daily
            {estimate.fetchedAt
              ? ` (last updated ${new Date(estimate.fetchedAt).toLocaleDateString()})`
              : ""}
            . Token volumes are typical workloads for each step type, so treat totals as
            close estimates rather than invoices.
          </p>
        </div>
      )}
    </section>
  );
}

function Cell({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border px-3 py-2 ${
        accent ? "border-success/30 bg-success/5" : "border-border bg-background/40"
      }`}
    >
      <div className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className={`mt-1 text-sm font-semibold ${accent ? "text-success" : ""}`}>
        {value}
      </div>
      <div className="text-[10px] text-muted-foreground">{hint}</div>
    </div>
  );
}
