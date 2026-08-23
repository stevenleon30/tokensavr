/**
 * Pure helpers for the pricing sync ledger.
 *
 * No Supabase, no React — just shaping sync-log rows into a 53x7
 * contribution grid and bucketing daily volume into five intensity levels.
 */

export const LEDGER_DAYS = 371;
export const SYNC_INTERVAL_HOURS = 6;

export type SyncRun = {
  run_at: string;
  status: "success" | "partial" | "failed";
  models_updated: number;
  models_checked: number;
};

export type LedgerDay = {
  /** ISO calendar date, e.g. "2026-08-16" */
  date: string;
  /** Sum of models_updated across every run that day */
  updated: number;
  /** Number of sync attempts that day */
  runs: number;
  /** true when at least one attempt that day failed */
  hadFailure: boolean;
  /** 0 = no sync recorded, 1..4 = increasing intensity */
  level: 0 | 1 | 2 | 3 | 4;
};

export function toDateKey(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(
    d.getUTCDate(),
  ).padStart(2, "0")}`;
}

/**
 * Bucket thresholds derived from the data itself (25/50/75/90th percentile of
 * non-empty days), so the ramp keeps working as sync volume grows.
 */
export function computeBuckets(values: number[]): number[] {
  const nonEmpty = values.filter((v) => v > 0).sort((a, b) => a - b);
  if (nonEmpty.length === 0) return [1, 2, 3, 4];

  const at = (p: number) => {
    const idx = Math.min(nonEmpty.length - 1, Math.floor(p * nonEmpty.length));
    return nonEmpty[idx] ?? 1;
  };

  // Ascending, de-duplicated so tiny datasets still map to distinct levels.
  const raw = [at(0.25), at(0.5), at(0.75), at(0.9)];
  const out: number[] = [];
  for (const v of raw) {
    const prev = out[out.length - 1];
    out.push(prev === undefined ? Math.max(1, v) : Math.max(prev, v));
  }
  return out;
}

function levelFor(updated: number, buckets: number[]): LedgerDay["level"] {
  if (updated <= 0) return 0;
  if (updated < (buckets[1] ?? 1)) return 1;
  if (updated < (buckets[2] ?? 2)) return 2;
  if (updated < (buckets[3] ?? 3)) return 3;
  return 4;
}

/**
 * Builds one entry per calendar day for the trailing `LEDGER_DAYS` window,
 * ending on `today`. Days without a logged attempt stay at level 0 so gaps in
 * coverage stay visible.
 */
export function buildLedger(runs: SyncRun[], today = new Date()): LedgerDay[] {
  const grouped = new Map<string, { updated: number; runs: number; hadFailure: boolean }>();

  for (const run of runs) {
    const key = toDateKey(new Date(run.run_at));
    const entry = grouped.get(key) ?? { updated: 0, runs: 0, hadFailure: false };
    entry.updated += Number(run.models_updated ?? 0);
    entry.runs += 1;
    entry.hadFailure = entry.hadFailure || run.status === "failed";
    grouped.set(key, entry);
  }

  const end = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()),
  );
  // Align the last column to a Saturday so weeks read Sun..Sat like a calendar.
  end.setUTCDate(end.getUTCDate() + (6 - end.getUTCDay()));

  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - (LEDGER_DAYS - 1));

  const dates: string[] = [];
  for (let i = 0; i < LEDGER_DAYS; i++) {
    const d = new Date(start);
    d.setUTCDate(start.getUTCDate() + i);
    dates.push(toDateKey(d));
  }

  const buckets = computeBuckets(dates.map((d) => grouped.get(d)?.updated ?? 0));

  return dates.map((date) => {
    const entry = grouped.get(date);
    const updated = entry?.updated ?? 0;
    return {
      date,
      updated,
      runs: entry?.runs ?? 0,
      hadFailure: entry?.hadFailure ?? false,
      level: levelFor(updated, buckets),
    };
  });
}

/** Splits a flat day list into 7-row columns (one column per week). */
export function toWeeks(days: LedgerDay[]): LedgerDay[][] {
  const weeks: LedgerDay[][] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));
  return weeks;
}

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

/** Month label for each week column, blank unless the month changes. */
export function monthLabels(weeks: LedgerDay[][]): string[] {
  let last = -1;
  return weeks.map((week) => {
    const first = week[0];
    if (!first) return "";
    const m = new Date(`${first.date}T00:00:00Z`).getUTCMonth();
    if (m !== last) {
      last = m;
      return MONTHS[m] ?? "";
    }
    return "";
  });
}

export function relativeTime(iso: string, now = Date.now()): string {
  const diff = Math.max(0, now - new Date(iso).getTime());
  const min = Math.round(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  const hours = Math.round(min / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} d ago`;
  const months = Math.round(days / 30);
  return `${months} mo ago`;
}

export type SyncHealth = {
  operational: boolean;
  lastRunAt: string | null;
  label: string;
};

/** Green when the newest run succeeded inside the interval plus a 30 min grace. */
export function syncHealth(runs: SyncRun[], now = Date.now()): SyncHealth {
  const latest = runs[0];
  if (!latest) {
    return { operational: false, lastRunAt: null, label: "no sync runs recorded yet" };
  }
  const ageMs = now - new Date(latest.run_at).getTime();
  const windowMs = (SYNC_INTERVAL_HOURS * 60 + 30) * 60 * 1000;
  const fresh = ageMs <= windowMs;
  const ok = latest.status !== "failed" && fresh;

  return {
    operational: ok,
    lastRunAt: latest.run_at,
    label: ok
      ? "all sync jobs operational"
      : latest.status === "failed"
        ? "last sync job failed"
        : "sync job behind schedule",
  };
}

/** Feed note for a run, coloured by outcome. */
export function runNote(run: SyncRun): { text: string; tone: "muted" | "success" | "warning" } {
  if (run.status === "failed") {
    return { text: "sync failed, prices not refreshed", tone: "warning" };
  }
  if (run.status === "partial") {
    return { text: `partial run · ${run.models_updated} of ${run.models_checked} models written`, tone: "warning" };
  }
  if (run.models_updated === 0) {
    return { text: `${run.models_checked} models checked, no price changes`, tone: "muted" };
  }
  return { text: `${run.models_updated} model prices written`, tone: "success" };
}
