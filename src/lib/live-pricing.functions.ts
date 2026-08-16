import { createServerFn } from "@tanstack/react-start";
import { LIVE_PRICING_MODEL_IDS, type LiveModelPrice } from "@/lib/live-pricing";

/**
 * Public read of the daily-synced `model_pricing` table for the models the app
 * estimates against. Uses the publishable key (table has a public SELECT
 * policy), so this is safe to call from public routes.
 */
export const getLiveModelPricing = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ prices: LiveModelPrice[] }> => {
    const { createClient } = await import("@supabase/supabase-js");

    const supabase = createClient(
      process.env["SUPABASE_URL"]!,
      process.env["SUPABASE_PUBLISHABLE_KEY"]!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );

    const { data, error } = await supabase
      .from("model_pricing")
      .select("model_id,input_cost_per_token,output_cost_per_token,fetched_at")
      .in("model_id", LIVE_PRICING_MODEL_IDS)
      .not("input_cost_per_token", "is", null);

    if (error) throw new Error(error.message);

    const prices: LiveModelPrice[] = (data ?? []).map((row) => ({
      model_id: row.model_id as string,
      input_cost_per_token: Number(row.input_cost_per_token),
      output_cost_per_token: Number(row.output_cost_per_token ?? 0),
      fetched_at: row.fetched_at as string,
    }));

    return { prices };
  },
);
