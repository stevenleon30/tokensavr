import { createServerFn } from "@tanstack/react-start";
import { LEDGER_DAYS, type SyncRun } from "@/lib/sync-ledger";

export type SyncLedgerData = {
  runs: SyncRun[];
  recent: SyncRun[];
  modelsTracked: number;
  checksLastYear: number;
  uptimePct: number | null;
};

/**
 * Public read of pricing_sync_log (+ a models-tracked count). The table has a
 * public SELECT policy, so the publishable key is enough — safe on public
 * routes and during SSR.
 */
export const getSyncLedger = createServerFn({ method: "GET" }).handler(
  async (): Promise<SyncLedgerData> => {
    const { createClient } = await import("@supabase/supabase-js");

    const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
    const supabase = createClient(process.env["SUPABASE_URL"]!, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input, init) => {
          const h = new Headers(init?.headers);
          if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) {
            h.delete("Authorization");
          }
          h.set("apikey", key);
          return fetch(input, { ...init, headers: h });
        },
      },
    });

    const since = new Date(Date.now() - LEDGER_DAYS * 24 * 60 * 60 * 1000).toISOString();

    const [logRes, countRes] = await Promise.all([
      supabase
        .from("pricing_sync_log")
        .select("run_at, status, models_updated, models_checked")
        .gte("run_at", since)
        .order("run_at", { ascending: false }),
      supabase.from("model_pricing").select("id", { count: "exact", head: true }),
    ]);

    if (logRes.error) throw new Error(logRes.error.message);

    const runs: SyncRun[] = (logRes.data ?? []).map((r) => ({
      run_at: r.run_at as string,
      status: r.status as SyncRun["status"],
      models_updated: Number(r.models_updated ?? 0),
      models_checked: Number(r.models_checked ?? 0),
    }));

    const checksLastYear = runs.reduce((sum, r) => sum + r.models_checked, 0);
    const succeeded = runs.filter((r) => r.status !== "failed").length;

    return {
      runs,
      recent: runs.slice(0, 8),
      modelsTracked: countRes.count ?? 0,
      checksLastYear,
      uptimePct: runs.length ? (succeeded / runs.length) * 100 : null,
    };
  },
);
