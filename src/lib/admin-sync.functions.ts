import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type SyncRunResult = {
  ok: boolean;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  counts?: { openrouter: number; litellm: number; manual: number };
  total?: number;
  error?: string;
};

/** True when the signed-in caller holds the admin role. */
export const getIsPricingAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ isAdmin: boolean }> => {
    const { data, error } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    if (error) return { isAdmin: false };
    return { isAdmin: !!data };
  });

/** Admin-only manual run of the model pricing sync. */
export const runPricingSyncNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SyncRunResult> => {
    const { data: adminRow, error: roleError } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    if (roleError || !adminRow) {
      throw new Error("Forbidden: admin role required");
    }


    const started = Date.now();
    const startedAt = new Date(started).toISOString();

    try {
      const { syncModelPricing } = await import("@/lib/sync-model-pricing.server");
      const counts = await syncModelPricing();
      const finished = Date.now();
      return {
        ok: true,
        startedAt,
        finishedAt: new Date(finished).toISOString(),
        durationMs: finished - started,
        counts,
        total: counts.openrouter + counts.litellm + counts.manual,
      };
    } catch (err) {
      const finished = Date.now();
      console.error("manual sync-model-pricing failed", err);
      return {
        ok: false,
        startedAt,
        finishedAt: new Date(finished).toISOString(),
        durationMs: finished - started,
        error: err instanceof Error ? err.message : "Sync failed",
      };
    }
  });
