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
    const { data, error } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (error) return { isAdmin: false };
    return { isAdmin: data === true };
  });

/** Admin-only manual run of the model pricing sync. */
export const runPricingSyncNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SyncRunResult> => {
    const { data: isAdmin, error: roleError } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (roleError || isAdmin !== true) {
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
