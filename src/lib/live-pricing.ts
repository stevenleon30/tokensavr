/**
 * Live model pricing → accurate credit estimates.
 *
 * The `model_pricing` table is refreshed daily from OpenRouter + LiteLLM plus
 * manual provider overrides. This module turns those raw per-token prices into
 * a per-step credit estimate for a generated strategy, so the numbers shown on
 * the results page track real published model prices instead of only the AI's
 * guess.
 *
 * Pure functions only — safe on client and server.
 */

import { CREDIT_USD, PLATFORM_PRICING, usdToCredits } from "@/lib/pricing";

export type LiveModelPrice = {
  model_id: string;
  input_cost_per_token: number;
  output_cost_per_token: number;
  fetched_at: string;
};

/**
 * Catalog model id → candidate ids as they appear in `model_pricing`
 * (OpenRouter uses `vendor/model`, LiteLLM uses bare or `vendor/model`).
 * First match wins.
 */
export const MODEL_ID_ALIASES: Record<string, string[]> = {
  "claude-sonnet-4.6": ["anthropic/claude-sonnet-4.6", "claude-sonnet-4-6", "anthropic/claude-sonnet-4.5"],
  "claude-haiku-4.5": ["anthropic/claude-haiku-4.5", "claude-haiku-4-5"],
  "claude-opus-4.8": ["anthropic/claude-opus-4.8", "claude-opus-4-8", "anthropic/claude-opus-4.5"],
  "gpt-5.4": ["openai/gpt-5.4", "gpt-5.4", "openai/gpt-5.2"],
  "gpt-5.4-mini": ["openai/gpt-5.4-mini", "gpt-5.4-mini", "openai/gpt-5-mini"],
  "gpt-5.4-nano": ["openai/gpt-5.4-nano", "gpt-5.4-nano", "openai/gpt-4o-mini"],
  "gemini-3.7-flash": ["google/gemini-3.7-flash", "gemini/gemini-3.7-flash", "google/gemini-2.5-flash"],
  "gemini-3.1-pro": ["google/gemini-3.1-pro-preview", "gemini/gemini-3.1-pro", "google/gemini-2.5-pro"],
};

/** Every id we need to pull out of the table. */
export const LIVE_PRICING_MODEL_IDS = Object.values(MODEL_ID_ALIASES).flat();

export type LivePriceMap = Record<string, LiveModelPrice>;

/** Resolve a catalog model id against live rows, following aliases. */
export function resolveLivePrice(
  catalogModelId: string,
  prices: LivePriceMap,
): LiveModelPrice | null {
  for (const id of MODEL_ID_ALIASES[catalogModelId] ?? [catalogModelId]) {
    const row = prices[id];
    if (row && row.input_cost_per_token > 0) return row;
  }
  return null;
}

/**
 * Token workload assumed for one step, keyed off the step's mode/action text.
 * These are conservative averages for agentic coding turns (large context in,
 * moderate diff out).
 */
type TokenProfile = { input: number; output: number; label: string };

const PROFILES: Record<string, TokenProfile> = {
  free: { input: 0, output: 0, label: "Free tier" },
  planning: { input: 6_000, output: 2_000, label: "Planning turn" },
  chat: { input: 15_000, output: 2_500, label: "Chat turn" },
  review: { input: 35_000, output: 5_000, label: "Review pass" },
  build: { input: 70_000, output: 9_000, label: "Build message" },
};

/** Pick a token profile from the step's mode + action text. */
export function tokenProfileFor(mode: string, action = ""): TokenProfile {
  const s = `${mode} ${action}`.toLowerCase();
  if (/\bfree\b/.test(s) && !/build/.test(s)) return PROFILES.free;
  if (/build|implement|assemble|generate code|scaffold/.test(s)) return PROFILES.build;
  if (/review|debug|audit|refactor|test/.test(s)) return PROFILES.review;
  if (/plan|brainstorm|spec|schema|copy|prompt|research/.test(s)) return PROFILES.planning;
  return PROFILES.chat;
}

/** Model a platform most likely runs for this work. */
export function modelForPlatform(platformId: string): string {
  const p = PLATFORM_PRICING[platformId?.toLowerCase?.() ?? ""];
  return p?.models?.[0] ?? "claude-sonnet-4.6";
}

/**
 * Baseline for savings: what the same workload would cost if every step ran on
 * a top-tier frontier model (the naive "just use the best model for everything"
 * approach). Savings shown to the user are the delta against this.
 */
export const BASELINE_MODEL_CANDIDATES = ["claude-opus-4.8", "gpt-5.4", "claude-sonnet-4.6"];

/** First baseline model that has a live price, with its row. */
export function resolveBaseline(
  prices: LivePriceMap,
): { modelId: string; row: LiveModelPrice } | null {
  for (const modelId of BASELINE_MODEL_CANDIDATES) {
    const row = resolveLivePrice(modelId, prices);
    if (row) return { modelId, row };
  }
  return null;
}

export type LiveStepEstimate = {
  stepNumber: number;
  modelId: string;
  /** Model id actually matched in the pricing table, when found. */
  sourceModelId: string | null;
  profileLabel: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  /** Per-million-token rates used, for display. */
  inputPerMillion: number;
  outputPerMillion: number;
  usd: number;
  credits: number;
  /** Same tokens costed on the frontier baseline model. */
  baselineModelId: string | null;
  baselineUsd: number;
  baselineCredits: number;
  savedUsd: number;
  savedCredits: number;
  /** Share of the strategy's total token cost, 0-1 (filled in by the strategy pass). */
  costShare: number;
};

/** Compute a live-priced estimate for one step. */
export function estimateStepFromLivePricing(
  step: { step_number: number; platform: string; mode: string; action?: string },
  prices: LivePriceMap,
): LiveStepEstimate | null {
  const modelId = modelForPlatform(step.platform);
  const row = resolveLivePrice(modelId, prices);
  const profile = tokenProfileFor(step.mode, step.action);
  if (!row) return null;

  const usd =
    profile.input * row.input_cost_per_token +
    profile.output * row.output_cost_per_token;

  const baseline = resolveBaseline(prices);
  const baselineUsd = baseline
    ? profile.input * baseline.row.input_cost_per_token +
      profile.output * baseline.row.output_cost_per_token
    : 0;
  const savedUsd = Math.max(0, baselineUsd - usd);

  return {
    stepNumber: step.step_number,
    modelId,
    sourceModelId: row.model_id,
    profileLabel: profile.label,
    inputTokens: profile.input,
    outputTokens: profile.output,
    totalTokens: profile.input + profile.output,
    inputPerMillion: row.input_cost_per_token * 1_000_000,
    outputPerMillion: row.output_cost_per_token * 1_000_000,
    usd,
    credits: usdToCredits(usd),
    baselineModelId: baseline?.modelId ?? null,
    baselineUsd,
    baselineCredits: usdToCredits(baselineUsd),
    savedUsd,
    savedCredits: usdToCredits(savedUsd),
    costShare: 0,
  };
}

export type LiveStrategyEstimate = {
  byStep: Record<number, LiveStepEstimate>;
  /** Ordered list, cheapest-first ranking available via sorting on the caller. */
  steps: LiveStepEstimate[];
  totalUsd: number;
  totalCredits: number;
  totalTokens: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  baselineModelId: string | null;
  baselineUsd: number;
  baselineCredits: number;
  savedUsd: number;
  savedCredits: number;
  /** 0-1 share of baseline cost avoided. */
  savedShare: number;
  pricedSteps: number;
  fetchedAt: string | null;
  creditUsd: number;
};

/** Compute live-priced estimates for every step of a strategy. */
export function estimateStrategyFromLivePricing(
  steps: { step_number: number; platform: string; mode: string; action?: string }[],
  prices: LivePriceMap,
): LiveStrategyEstimate {
  const byStep: Record<number, LiveStepEstimate> = {};
  const list: LiveStepEstimate[] = [];
  let totalUsd = 0;
  let baselineUsd = 0;
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let fetchedAt: string | null = null;

  steps.forEach((step) => {
    const est = estimateStepFromLivePricing(step, prices);
    if (!est) return;
    byStep[step.step_number] = est;
    list.push(est);
    totalUsd += est.usd;
    baselineUsd += est.baselineUsd;
    totalInputTokens += est.inputTokens;
    totalOutputTokens += est.outputTokens;
    const row = est.sourceModelId ? prices[est.sourceModelId] : null;
    if (row && (!fetchedAt || row.fetched_at > fetchedAt)) fetchedAt = row.fetched_at;
  });

  // Cost share per step, now that the total is known.
  list.forEach((est) => {
    est.costShare = totalUsd > 0 ? est.usd / totalUsd : 0;
  });

  const savedUsd = Math.max(0, baselineUsd - totalUsd);

  return {
    byStep,
    steps: list,
    totalUsd,
    totalCredits: usdToCredits(totalUsd),
    totalTokens: totalInputTokens + totalOutputTokens,
    totalInputTokens,
    totalOutputTokens,
    baselineModelId: resolveBaseline(prices)?.modelId ?? null,
    baselineUsd,
    baselineCredits: usdToCredits(baselineUsd),
    savedUsd,
    savedCredits: usdToCredits(savedUsd),
    savedShare: baselineUsd > 0 ? savedUsd / baselineUsd : 0,
    pricedSteps: list.length,
    fetchedAt,
    creditUsd: CREDIT_USD,
  };
}

