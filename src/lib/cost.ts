/**
 * Cost parsing helpers for TokenSavr.
 *
 * The AI returns free-form cost strings like "~1 credit", "~$0.02 in tokens",
 * "free", "2-3 credits", "$0.50". We normalize them to a single comparable
 * unit ("credit equivalents") so we can compute estimated vs. real spend.
 *
 * The credit <-> USD peg lives in src/lib/pricing.ts (the pricing catalog) so
 * every conversion in the app shares one maintained number.
 */

import { CREDIT_USD, creditsToUsd, formatUsd } from "@/lib/pricing";

const DOLLARS_PER_CREDIT = CREDIT_USD;

/** Parse an AI-generated cost string into approximate credit-equivalents. */
export function parseCostToCredits(input: string | null | undefined): number {
  if (!input) return 0;
  const s = input.toLowerCase().trim();
  if (!s || s === "—" || s === "-") return 0;
  if (/\bfree\b|\$0\b|^0\b/.test(s)) return 0;

  // Pull every number out (handles "2-3 credits" → uses average).
  const nums = Array.from(s.matchAll(/(\d+(?:\.\d+)?)/g)).map((m) =>
    parseFloat(m[1]),
  );
  if (nums.length === 0) return 0;
  const avg = nums.reduce((a, b) => a + b, 0) / nums.length;

  // Dollar amount → convert to credits.
  if (s.includes("$") || s.includes("usd") || /\bdollar/.test(s)) {
    return avg / DOLLARS_PER_CREDIT;
  }

  // Token counts (rare, but be safe): 1k tokens ≈ $0.001 ≈ 0.01 credits.
  if (/\btokens?\b/.test(s) && !s.includes("credit")) {
    // If the number looks like a raw token count, scale it.
    if (avg >= 100) return (avg / 1000) * 0.01;
  }

  // Default: assume the number is already in credits.
  return avg;
}

/** Format a credits number for compact display. */
export function formatCredits(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "0";
  if (n < 1) return n.toFixed(2);
  if (n < 10) return n.toFixed(1);
  return Math.round(n).toString();
}

/** Parse an AI-generated cost string into approximate USD. */
export function parseCostToUsd(input: string | null | undefined): number {
  return creditsToUsd(parseCostToCredits(input));
}

/** "~12 credits" → "~12 credits (≈$3)" style suffix for display. */
export function formatCreditsWithUsd(credits: number): string {
  if (!Number.isFinite(credits) || credits <= 0) return "0 cr";
  return `${formatCredits(credits)} cr (≈${formatUsd(creditsToUsd(credits))})`;
}

/** Append a dollar equivalent to an AI-generated cost string, when parseable. */
export function withUsd(costString: string | null | undefined): string {
  const label = costString?.trim();
  if (!label || label === "—") return "—";
  const usd = parseCostToUsd(label);
  if (usd <= 0) return label;
  return `${label} (≈${formatUsd(usd)})`;
}
