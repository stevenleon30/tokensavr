import { createServerFn } from "@tanstack/react-start";
import { LIVE_PRICING_MODEL_IDS } from "@/lib/live-pricing";

export type SyncSourceStatus = {
  source: string;
  total: number;
  updatedLast24h: number;
  lastFetchedAt: string | null;
};

export type PricingSyncStatus = {
  checkedAt: string;
  totalModels: number;
  updatedLast24h: number;
  lastFetchedAt: string | null;
  trackedModelsPriced: number;
  trackedModelsTotal: number;
  sources: SyncSourceStatus[];
};

const SOURCES = ["openrouter", "litellm", "manual"] as const;

/**
 * Aggregate `model_pricing` sync health, computed server-side. Only counts and
 * timestamps are returned — never raw pricing rows.
 */
export const getPricingSyncStatus = createServerFn({ method: "GET" }).handler(
  async (): Promise<PricingSyncStatus> => {
    const { supabaseAdmin: supabase } = await import(
      "@/integrations/supabase/client.server"
    );


    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const countFor = async (
      apply: (q: any) => any,
    ): Promise<number> => {
      const { count, error } = await apply(
        supabase.from("model_pricing").select("id", { count: "exact", head: true }),
      );
      if (error) throw new Error(error.message);
      return count ?? 0;
    };

    const lastFetchedFor = async (source?: string): Promise<string | null> => {
      let q = supabase
        .from("model_pricing")
        .select("fetched_at")
        .order("fetched_at", { ascending: false })
        .limit(1);
      if (source) q = q.eq("source", source);
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      return (data?.[0]?.fetched_at as string | undefined) ?? null;
    };

    const [totalModels, updatedLast24h, lastFetchedAt] = await Promise.all([
      countFor((q) => q),
      countFor((q) => q.gte("fetched_at", since)),
      lastFetchedFor(),
    ]);

    const sources = await Promise.all(
      SOURCES.map(async (source) => ({
        source,
        total: await countFor((q) => q.eq("source", source)),
        updatedLast24h: await countFor((q) =>
          q.eq("source", source).gte("fetched_at", since),
        ),
        lastFetchedAt: await lastFetchedFor(source),
      })),
    );

    const { data: tracked, error: trackedError } = await supabase
      .from("model_pricing")
      .select("model_id")
      .in("model_id", LIVE_PRICING_MODEL_IDS)
      .not("input_cost_per_token", "is", null);
    if (trackedError) throw new Error(trackedError.message);

    const trackedModelsPriced = new Set(
      (tracked ?? []).map((r) => r.model_id as string),
    ).size;

    return {
      checkedAt: new Date().toISOString(),
      totalModels,
      updatedLast24h,
      lastFetchedAt,
      trackedModelsPriced,
      trackedModelsTotal: LIVE_PRICING_MODEL_IDS.length,
      sources,
    };
  },
);
