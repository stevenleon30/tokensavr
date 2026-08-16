/**
 * TokenSavr pricing catalog.
 *
 * Single source of truth for:
 *  - per-model API token prices (USD per million tokens)
 *  - per-platform plan pricing (monthly price, included credits/messages)
 *  - the credit <-> USD peg used everywhere in the app
 *
 * Every entry carries a `lastVerified` date and a `source` URL so the numbers
 * are auditable and obviously refreshable. Prices change frequently — treat
 * these as best-effort published list prices, not billing truth.
 */

export const PRICING_VERSION = "2026-08-16";

/** Lovable Pro: $25/mo → 100 monthly credits ⇒ $0.25/credit list price.
 *  Historically the app assumed $0.10/credit; we keep the peg explicit and in
 *  one place so it can be corrected without hunting call sites. */
export const CREDIT_USD = 0.25;

export type ModelPricing = {
  id: string;
  name: string;
  vendor: string;
  /** USD per 1M input tokens. */
  inputPerMTok: number;
  /** USD per 1M output tokens. */
  outputPerMTok: number;
  lastVerified: string;
  source: string;
};

export const MODEL_PRICING: Record<string, ModelPricing> = {
  "claude-sonnet-4.5": {
    id: "claude-sonnet-4.5",
    name: "Claude Sonnet 4.5",
    vendor: "Anthropic",
    inputPerMTok: 3,
    outputPerMTok: 15,
    lastVerified: PRICING_VERSION,
    source: "https://www.anthropic.com/pricing",
  },
  "claude-haiku-4.5": {
    id: "claude-haiku-4.5",
    name: "Claude Haiku 4.5",
    vendor: "Anthropic",
    inputPerMTok: 1,
    outputPerMTok: 5,
    lastVerified: PRICING_VERSION,
    source: "https://www.anthropic.com/pricing",
  },
  "claude-opus-4.1": {
    id: "claude-opus-4.1",
    name: "Claude Opus 4.1",
    vendor: "Anthropic",
    inputPerMTok: 15,
    outputPerMTok: 75,
    lastVerified: PRICING_VERSION,
    source: "https://www.anthropic.com/pricing",
  },
  "gpt-5": {
    id: "gpt-5",
    name: "GPT-5",
    vendor: "OpenAI",
    inputPerMTok: 1.25,
    outputPerMTok: 10,
    lastVerified: PRICING_VERSION,
    source: "https://openai.com/api/pricing/",
  },
  "gpt-5-mini": {
    id: "gpt-5-mini",
    name: "GPT-5 mini",
    vendor: "OpenAI",
    inputPerMTok: 0.25,
    outputPerMTok: 2,
    lastVerified: PRICING_VERSION,
    source: "https://openai.com/api/pricing/",
  },
  "gpt-4o-mini": {
    id: "gpt-4o-mini",
    name: "GPT-4o mini",
    vendor: "OpenAI",
    inputPerMTok: 0.15,
    outputPerMTok: 0.6,
    lastVerified: PRICING_VERSION,
    source: "https://openai.com/api/pricing/",
  },
  "gemini-2.5-flash": {
    id: "gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
    vendor: "Google",
    inputPerMTok: 0.3,
    outputPerMTok: 2.5,
    lastVerified: PRICING_VERSION,
    source: "https://ai.google.dev/pricing",
  },
  "gemini-2.5-pro": {
    id: "gemini-2.5-pro",
    name: "Gemini 2.5 Pro",
    vendor: "Google",
    inputPerMTok: 1.25,
    outputPerMTok: 10,
    lastVerified: PRICING_VERSION,
    source: "https://ai.google.dev/pricing",
  },
};

export const MODEL_LIST = Object.values(MODEL_PRICING);

export type PlanTier = {
  name: string;
  /** USD per month (0 for a free tier). */
  monthlyUsd: number;
  /** Included billable units per month, if the platform meters them. */
  includedUnits: number | null;
  /** What one unit is called on that platform. */
  unit: "credit" | "message" | "request" | "seat" | "premium request";
};

export type PlatformPricing = {
  /** Matches PlatformId in src/lib/platforms.ts. */
  id: string;
  name: string;
  tiers: PlanTier[];
  /** Free allowance description, if any. */
  freeTier: string | null;
  /** Models the platform is known to run. */
  models: string[];
  notes: string;
  lastVerified: string;
  source: string;
};

export const PLATFORM_PRICING: Record<string, PlatformPricing> = {
  lovable: {
    id: "lovable",
    name: "Lovable",
    tiers: [
      { name: "Free", monthlyUsd: 0, includedUnits: 30, unit: "credit" },
      { name: "Pro", monthlyUsd: 25, includedUnits: 100, unit: "credit" },
      { name: "Pro 200", monthlyUsd: 50, includedUnits: 200, unit: "credit" },
      { name: "Business", monthlyUsd: 50, includedUnits: 200, unit: "credit" },
    ],
    freeTier: "5 daily credits, capped at 30/month",
    models: ["claude-sonnet-4.5", "gemini-2.5-flash"],
    notes: "Chat Mode is 1 credit/message; Build Mode is usage-based per message.",
    lastVerified: PRICING_VERSION,
    source: "https://lovable.dev/pricing",
  },
  claude: {
    id: "claude",
    name: "Claude",
    tiers: [
      { name: "Free", monthlyUsd: 0, includedUnits: null, unit: "message" },
      { name: "Pro", monthlyUsd: 20, includedUnits: null, unit: "seat" },
      { name: "Max", monthlyUsd: 100, includedUnits: null, unit: "seat" },
    ],
    freeTier: "Free web chat with daily message limits",
    models: ["claude-sonnet-4.5", "claude-haiku-4.5", "claude-opus-4.1"],
    notes: "Best free option for planning, schema design, and prompt drafting.",
    lastVerified: PRICING_VERSION,
    source: "https://www.anthropic.com/pricing",
  },
  chatgpt: {
    id: "chatgpt",
    name: "ChatGPT",
    tiers: [
      { name: "Free", monthlyUsd: 0, includedUnits: null, unit: "message" },
      { name: "Plus", monthlyUsd: 20, includedUnits: null, unit: "seat" },
      { name: "Pro", monthlyUsd: 200, includedUnits: null, unit: "seat" },
    ],
    freeTier: "Free tier with rate-limited GPT-5 access",
    models: ["gpt-5", "gpt-5-mini", "gpt-4o-mini"],
    notes: "Free tier is enough for copywriting and planning steps.",
    lastVerified: PRICING_VERSION,
    source: "https://openai.com/chatgpt/pricing/",
  },
  cursor: {
    id: "cursor",
    name: "Cursor",
    tiers: [
      { name: "Hobby", monthlyUsd: 0, includedUnits: null, unit: "request" },
      { name: "Pro", monthlyUsd: 20, includedUnits: null, unit: "seat" },
      { name: "Ultra", monthlyUsd: 200, includedUnits: null, unit: "seat" },
    ],
    freeTier: "Limited agent requests on Hobby",
    models: ["claude-sonnet-4.5", "gpt-5", "gemini-2.5-pro"],
    notes: "Pro includes ~$20 of model usage; overage is billed at API rates.",
    lastVerified: PRICING_VERSION,
    source: "https://cursor.com/pricing",
  },
  bolt: {
    id: "bolt",
    name: "Bolt",
    tiers: [
      { name: "Free", monthlyUsd: 0, includedUnits: null, unit: "message" },
      { name: "Pro", monthlyUsd: 20, includedUnits: 10_000_000, unit: "credit" },
      { name: "Pro 50", monthlyUsd: 50, includedUnits: 26_000_000, unit: "credit" },
    ],
    freeTier: "Daily token allowance on the free plan",
    models: ["claude-sonnet-4.5"],
    notes: "Bolt meters raw tokens; each build message typically costs ~1 credit-equivalent.",
    lastVerified: PRICING_VERSION,
    source: "https://bolt.new/",
  },
  replit: {
    id: "replit",
    name: "Replit Agent",
    tiers: [
      { name: "Starter", monthlyUsd: 0, includedUnits: null, unit: "credit" },
      { name: "Core", monthlyUsd: 25, includedUnits: 25, unit: "credit" },
      { name: "Teams", monthlyUsd: 40, includedUnits: 40, unit: "credit" },
    ],
    freeTier: "Limited free agent trial",
    models: ["claude-sonnet-4.5"],
    notes: "Core includes $25/mo of usage credits; agent checkpoints bill per task.",
    lastVerified: PRICING_VERSION,
    source: "https://replit.com/pricing",
  },
  windsurf: {
    id: "windsurf",
    name: "Windsurf",
    tiers: [
      { name: "Free", monthlyUsd: 0, includedUnits: 25, unit: "credit" },
      { name: "Pro", monthlyUsd: 15, includedUnits: 500, unit: "credit" },
      { name: "Teams", monthlyUsd: 30, includedUnits: 500, unit: "credit" },
    ],
    freeTier: "25 prompt credits per month",
    models: ["claude-sonnet-4.5", "gpt-5"],
    notes: "Cheapest per-credit of the IDE agents at list price.",
    lastVerified: PRICING_VERSION,
    source: "https://windsurf.com/pricing",
  },
  claudecode: {
    id: "claudecode",
    name: "Claude Code",
    tiers: [
      { name: "Pro", monthlyUsd: 20, includedUnits: null, unit: "seat" },
      { name: "Max 5x", monthlyUsd: 100, includedUnits: null, unit: "seat" },
      { name: "API (pay-as-you-go)", monthlyUsd: 0, includedUnits: null, unit: "request" },
    ],
    freeTier: null,
    models: ["claude-sonnet-4.5", "claude-opus-4.1", "claude-haiku-4.5"],
    notes: "Included in Claude Pro/Max seats, or billed at raw API token rates.",
    lastVerified: PRICING_VERSION,
    source: "https://www.anthropic.com/pricing",
  },
  githubcopilot: {
    id: "githubcopilot",
    name: "GitHub Copilot",
    tiers: [
      { name: "Free", monthlyUsd: 0, includedUnits: 50, unit: "premium request" },
      { name: "Pro", monthlyUsd: 10, includedUnits: 300, unit: "premium request" },
      { name: "Pro+", monthlyUsd: 39, includedUnits: 1500, unit: "premium request" },
    ],
    freeTier: "50 premium requests + 2,000 completions per month",
    models: ["claude-sonnet-4.5", "gpt-5", "gemini-2.5-pro"],
    notes: "Overage premium requests bill at $0.04 each.",
    lastVerified: PRICING_VERSION,
    source: "https://github.com/features/copilot/plans",
  },
  gemini: {
    id: "gemini",
    name: "Gemini",
    tiers: [
      { name: "Free", monthlyUsd: 0, includedUnits: null, unit: "message" },
      { name: "Google AI Pro", monthlyUsd: 20, includedUnits: null, unit: "seat" },
      { name: "Google AI Ultra", monthlyUsd: 250, includedUnits: null, unit: "seat" },
    ],
    freeTier: "Free Gemini app access with daily limits",
    models: ["gemini-2.5-flash", "gemini-2.5-pro"],
    notes: "Flash is the cheapest capable model per token in the catalog.",
    lastVerified: PRICING_VERSION,
    source: "https://ai.google.dev/pricing",
  },
};

export const PLATFORM_PRICING_LIST = Object.values(PLATFORM_PRICING);

/** USD cost of a call with the given token counts on a catalog model. */
export function usdForTokens(
  modelId: string,
  inputTokens: number,
  outputTokens: number,
): number {
  const m = MODEL_PRICING[modelId];
  if (!m) return 0;
  return (
    (inputTokens / 1_000_000) * m.inputPerMTok +
    (outputTokens / 1_000_000) * m.outputPerMTok
  );
}

export function usdToCredits(usd: number): number {
  if (!Number.isFinite(usd) || usd <= 0) return 0;
  return usd / CREDIT_USD;
}

export function creditsToUsd(credits: number): number {
  if (!Number.isFinite(credits) || credits <= 0) return 0;
  return credits * CREDIT_USD;
}

/** Format a USD amount compactly: $0.04, $1.20, $18 */
export function formatUsd(usd: number): string {
  if (!Number.isFinite(usd) || usd <= 0) return "$0";
  if (usd < 1) return `$${usd.toFixed(2)}`;
  if (usd < 100) return `$${usd.toFixed(2).replace(/\.00$/, "")}`;
  return `$${Math.round(usd)}`;
}

/** Effective USD per metered unit for a tier (null when not metered). */
export function tierUsdPerUnit(tier: PlanTier): number | null {
  if (!tier.includedUnits || tier.includedUnits <= 0) return null;
  if (tier.monthlyUsd <= 0) return 0;
  return tier.monthlyUsd / tier.includedUnits;
}

/** Cheapest metered USD-per-unit across a platform's tiers (null if unmetered). */
export function platformUsdPerUnit(platformId: string): number | null {
  const p = PLATFORM_PRICING[platformId];
  if (!p) return null;
  const rates = p.tiers
    .map(tierUsdPerUnit)
    .filter((r): r is number => r !== null && r > 0);
  if (!rates.length) return null;
  return Math.min(...rates);
}

/** Lowest monthly price that isn't free, used for budget ranking. */
export function platformEntryPriceUsd(platformId: string): number | null {
  const p = PLATFORM_PRICING[platformId];
  if (!p) return null;
  const paid = p.tiers.map((t) => t.monthlyUsd).filter((v) => v > 0);
  if (!paid.length) return null;
  return Math.min(...paid);
}

/**
 * Rank platforms by projected cost of a workload, given a monthly USD budget.
 * Platforms with a free tier that covers the work rank first, then cheapest
 * effective per-unit cost within budget.
 */
export function cheapestPlatformFor(
  monthlyBudgetUsd: number,
  creditsNeeded: number,
): PlatformPricing[] {
  return [...PLATFORM_PRICING_LIST]
    .map((p) => {
      const perUnit = platformUsdPerUnit(p.id);
      const entry = platformEntryPriceUsd(p.id) ?? 0;
      const projected = perUnit !== null ? perUnit * creditsNeeded : entry;
      const overBudget = entry > monthlyBudgetUsd && monthlyBudgetUsd > 0;
      return { p, score: projected + (overBudget ? 1_000 : 0) };
    })
    .sort((a, b) => a.score - b.score)
    .map((x) => x.p);
}

/** Prompt-ready pricing summary so the AI prompt can never drift from the catalog. */
export function buildPricingGuide(): string {
  const lines = PLATFORM_PRICING_LIST.map((p) => {
    const perUnit = platformUsdPerUnit(p.id);
    const tiers = p.tiers
      .map(
        (t) =>
          `${t.name} ${t.monthlyUsd === 0 ? "free" : `$${t.monthlyUsd}/mo`}${
            t.includedUnits ? ` incl. ${t.includedUnits.toLocaleString()} ${t.unit}s` : ""
          }`,
      )
      .join("; ");
    const rate =
      perUnit !== null && perUnit > 0
        ? ` — effective ~$${perUnit.toFixed(3)} per metered unit (~${(
            perUnit / CREDIT_USD
          ).toFixed(2)} credits)`
        : "";
    return `- ${p.name}: ${tiers}${rate}. ${p.notes}`;
  });

  const models = MODEL_LIST.map(
    (m) =>
      `- ${m.name} (${m.vendor}): $${m.inputPerMTok}/M input, $${m.outputPerMTok}/M output tokens`,
  );

  return `PRICING CATALOG (verified ${PRICING_VERSION}) — use these as your estimating baseline.
Credit peg: $${CREDIT_USD.toFixed(2)} ≈ 1 credit. Convert any dollar figure with this peg (e.g. a $0.50 API call → "~2 credits").

Platform pricing:
${lines.join("\n")}

Model API token pricing:
${models.join("\n")}`;
}
