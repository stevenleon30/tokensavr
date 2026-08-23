/**
 * Live model pricing → token + credit estimates.
 *
 * The `model_pricing` table is refreshed daily from OpenRouter + LiteLLM plus
 * manual provider overrides. This module turns those raw per-token prices into
 * a per-step token workload and cost estimate for a generated strategy, so the
 * numbers shown on the results page track real published model prices.
 *
 * Token volume is the headline unit: how many tokens a step will burn on the
 * platform it runs on. Cost is derived from that, never the other way around.
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

/* ------------------------------------------------------------------ *
 * Token sizing
 * ------------------------------------------------------------------ */

export type TokenProfile = { input: number; output: number; label: string };

/** Base token workload per kind of work, for a medium-complexity project. */
const PROFILES: Record<string, TokenProfile> = {
  plan: { input: 8_000, output: 3_000, label: "Planning turn" },
  chat: { input: 14_000, output: 2_500, label: "Chat turn" },
  review: { input: 30_000, output: 5_000, label: "Review pass" },
  test: { input: 24_000, output: 4_000, label: "Test pass" },
  build: { input: 55_000, output: 10_000, label: "Build / agent turn" },
};

/**
 * Pick the base token profile from the step's mode + action text.
 * Handles the modes the generator actually emits (Build, Agent, IDE, CLI,
 * Chat, Plan) as well as free-form action wording, with an explicit fallback.
 */
export function tokenProfileFor(mode: string, action = ""): TokenProfile {
  const s = `${mode} ${action}`.toLowerCase();
  if (/\b(test|qa|e2e|unit)\b/.test(s)) return PROFILES.test;
  if (/review|debug|audit|refactor|fix|polish/.test(s)) return PROFILES.review;
  if (/build|agent|ide|cli|compose|implement|assemble|scaffold|generate code|develop|deploy|wire/.test(s))
    return PROFILES.build;
  if (/plan|brainstorm|spec|schema|architect|copy|prompt|research|design/.test(s))
    return PROFILES.plan;
  if (/chat/.test(s)) return PROFILES.chat;
  return PROFILES.chat;
}

const COMPLEXITY_SIGNALS = [
  /auth|login|sign ?up|account/,
  /payment|stripe|checkout|billing|subscription/,
  /realtime|websocket|live updates|streaming/,
  /database|schema|postgres|sql|supabase/,
  /api|integration|third-?party|webhook/,
  /dashboard|chart|analytics|report/,
  /mobile|ios|android|responsive/,
  /ai|llm|model|embedding|ml/,
  /map|geo|location/,
  /admin|role|permission|multi-?tenant/,
];

/**
 * Scale factor for how much context a project of this size drags into each
 * turn. 1.0 = a medium single-purpose app; below 1 = a tiny one-screen idea;
 * above 1 = a multi-surface product with integrations.
 */
export function deriveComplexity(idea: string | null | undefined): number {
  const text = (idea ?? "").toLowerCase().trim();
  if (!text) return 1;
  const words = text.split(/\s+/).length;

  let factor = 0.8;
  if (words > 25) factor += 0.1;
  if (words > 60) factor += 0.15;
  if (words > 140) factor += 0.15;

  const hits = COMPLEXITY_SIGNALS.filter((re) => re.test(text)).length;
  factor += Math.min(0.55, hits * 0.08);

  return Math.max(0.7, Math.min(1.9, Number(factor.toFixed(3))));
}

export type SizingContext = {
  /** Output of `deriveComplexity` for the strategy's idea. */
  complexity: number;
  /** 0-based position of this step in the plan. */
  index: number;
  /** Total number of steps in the plan. */
  total: number;
};

/**
 * Later coding steps carry accumulated project context, so their input token
 * volume grows through the plan. Planning-style steps don't.
 */
function contextGrowth(profile: TokenProfile, ctx: SizingContext): number {
  if (profile === PROFILES.plan) return 1;
  const share = ctx.total > 1 ? ctx.index / (ctx.total - 1) : 0;
  return 1 + share * 0.5;
}

export type SizedTokens = {
  input: number;
  output: number;
  total: number;
  label: string;
  /** True when the generator supplied token counts for this step. */
  fromModel: boolean;
};

/** Round to a readable granularity so the UI doesn't show false precision. */
function roundTokens(n: number): number {
  if (n <= 0) return 0;
  const step = n >= 20_000 ? 1_000 : n >= 2_000 ? 500 : 100;
  return Math.max(step, Math.round(n / step) * step);
}

export type SizableStep = {
  step_number: number;
  platform: string;
  mode: string;
  action?: string;
  /** Optional per-step token estimates returned by the generator. */
  estimated_input_tokens?: number | null;
  estimated_output_tokens?: number | null;
};

/** Token workload for one step: generator-supplied when present, else sized. */
export function sizeStepTokens(step: SizableStep, ctx: SizingContext): SizedTokens {
  const profile = tokenProfileFor(step.mode, step.action);
  const modelIn = Number(step.estimated_input_tokens ?? 0);
  const modelOut = Number(step.estimated_output_tokens ?? 0);

  if (Number.isFinite(modelIn) && Number.isFinite(modelOut) && modelIn + modelOut > 500) {
    const input = roundTokens(modelIn);
    const output = roundTokens(modelOut);
    return { input, output, total: input + output, label: profile.label, fromModel: true };
  }

  const growth = contextGrowth(profile, ctx);
  const input = roundTokens(profile.input * ctx.complexity * growth);
  const output = roundTokens(profile.output * ctx.complexity);
  return { input, output, total: input + output, label: profile.label, fromModel: false };
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
  platformId: string;
  modelId: string;
  /** Model id actually matched in the pricing table, when found. */
  sourceModelId: string | null;
  profileLabel: string;
  /** True when token counts came from the generator rather than the sizer. */
  tokensFromModel: boolean;
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
  /** Share of the strategy's total tokens, 0-1. */
  tokenShare: number;
};

/** Compute a live-priced estimate for one step. */
export function estimateStepFromLivePricing(
  step: SizableStep,
  prices: LivePriceMap,
  ctx: SizingContext = { complexity: 1, index: 0, total: 1 },
): LiveStepEstimate | null {
  const modelId = modelForPlatform(step.platform);
  const row = resolveLivePrice(modelId, prices);
  const tokens = sizeStepTokens(step, ctx);
  if (!row) return null;

  const usd =
    tokens.input * row.input_cost_per_token + tokens.output * row.output_cost_per_token;

  const baseline = resolveBaseline(prices);
  const baselineUsd = baseline
    ? tokens.input * baseline.row.input_cost_per_token +
      tokens.output * baseline.row.output_cost_per_token
    : 0;
  const savedUsd = Math.max(0, baselineUsd - usd);

  return {
    stepNumber: step.step_number,
    platformId: step.platform,
    modelId,
    sourceModelId: row.model_id,
    profileLabel: tokens.label,
    tokensFromModel: tokens.fromModel,
    inputTokens: tokens.input,
    outputTokens: tokens.output,
    totalTokens: tokens.total,
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
    tokenShare: 0,
  };
}

export type PlatformTokenTotal = {
  platformId: string;
  steps: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  usd: number;
  credits: number;
  /** Share of the plan's total tokens, 0-1. */
  tokenShare: number;
  /** Share of the plan's total cost, 0-1. */
  costShare: number;
};

export type LiveStrategyEstimate = {
  byStep: Record<number, LiveStepEstimate>;
  /** Ordered list, cheapest-first ranking available via sorting on the caller. */
  steps: LiveStepEstimate[];
  /** Per-platform token + cost rollup, largest first. */
  byPlatform: PlatformTokenTotal[];
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
  /** Complexity factor used to size token volumes. */
  complexity: number;
};

/** Compute live-priced estimates for every step of a strategy. */
export function estimateStrategyFromLivePricing(
  steps: SizableStep[],
  prices: LivePriceMap,
  options: { idea?: string | null } = {},
): LiveStrategyEstimate {
  const complexity = deriveComplexity(options.idea);
  const byStep: Record<number, LiveStepEstimate> = {};
  const list: LiveStepEstimate[] = [];
  let totalUsd = 0;
  let baselineUsd = 0;
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let fetchedAt: string | null = null;

  steps.forEach((step, index) => {
    const est = estimateStepFromLivePricing(step, prices, {
      complexity,
      index,
      total: steps.length,
    });
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

  const totalTokens = totalInputTokens + totalOutputTokens;

  // Shares per step, now that the totals are known.
  list.forEach((est) => {
    est.costShare = totalUsd > 0 ? est.usd / totalUsd : 0;
    est.tokenShare = totalTokens > 0 ? est.totalTokens / totalTokens : 0;
  });

  // Per-platform rollup.
  const platformMap: Record<string, PlatformTokenTotal> = {};
  list.forEach((est) => {
    const key = est.platformId || "unknown";
    const entry = (platformMap[key] ??= {
      platformId: key,
      steps: 0,
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      usd: 0,
      credits: 0,
      tokenShare: 0,
      costShare: 0,
    });
    entry.steps += 1;
    entry.inputTokens += est.inputTokens;
    entry.outputTokens += est.outputTokens;
    entry.totalTokens += est.totalTokens;
    entry.usd += est.usd;
    entry.credits += est.credits;
  });
  const byPlatform = Object.values(platformMap)
    .map((p) => ({
      ...p,
      tokenShare: totalTokens > 0 ? p.totalTokens / totalTokens : 0,
      costShare: totalUsd > 0 ? p.usd / totalUsd : 0,
    }))
    .sort((a, b) => b.totalTokens - a.totalTokens);

  const savedUsd = Math.max(0, baselineUsd - totalUsd);

  return {
    byStep,
    steps: list,
    byPlatform,
    totalUsd,
    totalCredits: usdToCredits(totalUsd),
    totalTokens,
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
    complexity,
  };
}

/** Compact token label, e.g. "72K tok". */
export function formatTokens(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "0";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return Math.round(n).toString();
}
