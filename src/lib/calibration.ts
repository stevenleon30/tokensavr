// Compute a calibration signal from the user's historical strategies +
// step_progress so the AI can nudge future credit estimates.
//
// Signed average error: positive = AI underestimated (real > est).
// We mirror the dashboard's accuracy logic so the prompt and the UI agree.

import { supabase } from "@/integrations/supabase/client";
import { parseCostToCredits } from "@/lib/cost";

export type Calibration = {
  /** Signed avg error as a fraction. 0.20 = real spend was 20% higher than estimates. */
  avgErrorPct: number;
  /** Number of past strategies that contributed to this signal. */
  sampleSize: number;
};

type StrategyRow = {
  id: string;
  steps: unknown;
};

type ProgressRow = {
  strategy_id: string;
  actual_cost_credits: number | null;
};

type StoredStep = { estimated_cost?: string };

/**
 * Pull the user's saved strategies + tracked progress and reduce them to a
 * single signed deviation. Returns null when there is no usable signal
 * (no strategies, or none with logged actuals).
 */
export async function loadUserCalibration(
  userId: string,
): Promise<Calibration | null> {
  const [strategiesRes, progressRes] = await Promise.all([
    supabase
      .from("strategies")
      .select("id,steps")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("step_progress")
      .select("strategy_id,actual_cost_credits")
      .eq("user_id", userId),
  ]);

  if (strategiesRes.error || !strategiesRes.data?.length) return null;

  const actualByStrategy = new Map<string, number>();
  for (const row of (progressRes.data ?? []) as ProgressRow[]) {
    if (row.actual_cost_credits == null || row.actual_cost_credits <= 0) continue;
    actualByStrategy.set(
      row.strategy_id,
      (actualByStrategy.get(row.strategy_id) ?? 0) + row.actual_cost_credits,
    );
  }

  const deviations: number[] = [];
  for (const s of strategiesRes.data as StrategyRow[]) {
    const actual = actualByStrategy.get(s.id);
    if (actual == null || actual <= 0) continue;
    const steps = Array.isArray(s.steps) ? (s.steps as StoredStep[]) : [];
    const estimated = steps.reduce(
      (sum, step) => sum + parseCostToCredits(step?.estimated_cost),
      0,
    );
    if (estimated <= 0) continue;
    // Signed deviation: +0.2 = real was 20% higher than estimate.
    deviations.push(actual / estimated - 1);
  }

  if (deviations.length === 0) return null;

  const avg =
    deviations.reduce((a, b) => a + b, 0) / deviations.length;

  return {
    avgErrorPct: avg,
    sampleSize: deviations.length,
  };
}
