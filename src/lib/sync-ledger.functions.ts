import { createServerFn } from "@tanstack/react-start";
import { LEDGER_DAYS, type SyncRun } from "@/lib/sync-ledger";

export type SyncLedgerData = {
  runs: SyncRun[];
  recent: SyncRun[];
  modelsTracked: number;
  providersTracked: number;
  checksLastYear: number;
  uptimePct: number | null;
};

/**
 * Server-side read of pricing_sync_log (+ a models-tracked count). Aggregated
 * on the server so `model_pricing` needs no client-readable policy.
 */
export const getSyncLedger = createServerFn({ method: "GET" }).handler(
  async (): Promise<SyncLedgerData> => {
    const { supabaseAdmin: supabase } = await import(
      "@/integrations/supabase/client.server"
    );


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
