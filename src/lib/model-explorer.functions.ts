import { createServerFn } from "@tanstack/react-start";

export type ModelPriceRow = {
  id: string;
  model_id: string;
  provider: string | null;
  display_name: string | null;
  source: string;
  input_cost_per_token: number | null;
  output_cost_per_token: number | null;
  context_window: number | null;
  fetched_at: string;
  /** Row was last written (price change) at this time */
  updated_at: string;
};

export type ModelExplorerQuery = {
  q?: string;
  provider?: string;
  page?: number;
};

export type ModelExplorerResult = {
  rows: ModelPriceRow[];
  total: number;
  page: number;
  pageSize: number;
  providers: string[];
};

export const MODEL_PAGE_SIZE = 25;

/**
 * Read-only explorer over `model_pricing`, executed entirely on the server.
 * The table is not readable by clients; only the paginated projection below is
 * returned, and search input is length-clamped and sanitized.
 */
export const searchModelPricing = createServerFn({ method: "GET" })
  .inputValidator((input: ModelExplorerQuery): ModelExplorerQuery => ({
    q: typeof input?.q === "string" ? input.q.slice(0, 80) : undefined,
    provider: typeof input?.provider === "string" ? input.provider.slice(0, 60) : undefined,
    page: Number.isFinite(input?.page) ? Math.max(1, Math.floor(input!.page!)) : 1,
  }))
  .handler(async ({ data }): Promise<ModelExplorerResult> => {
    const { supabaseAdmin: supabase } = await import(
      "@/integrations/supabase/client.server"
    );


    const page = data.page ?? 1;
    const from = (page - 1) * MODEL_PAGE_SIZE;

    let query = supabase
      .from("model_pricing")
      .select(
        "id, model_id, provider, display_name, source, input_cost_per_token, output_cost_per_token, context_window, fetched_at, updated_at",
        { count: "exact" },
      )
      .not("input_cost_per_token", "is", null);

    if (data.provider) query = query.eq("provider", data.provider);
    if (data.q) {
      const term = data.q.replace(/[%,()]/g, " ").trim();
      if (term) {
        query = query.or(
          `model_id.ilike.%${term}%,display_name.ilike.%${term}%,provider.ilike.%${term}%`,
        );
      }
    }

    const { data: rows, count, error } = await query
      .order("updated_at", { ascending: false })
      .order("model_id", { ascending: true })
      .range(from, from + MODEL_PAGE_SIZE - 1);

    if (error) throw new Error(error.message);

    // Provider facet list — small projection over the whole table.
    const { data: providerRows, error: providerError } = await supabase
      .from("model_pricing")
      .select("provider")
      .not("provider", "is", null)
      .limit(5000);
    if (providerError) throw new Error(providerError.message);

    const providers = Array.from(
      new Set((providerRows ?? []).map((r) => r.provider as string).filter(Boolean)),
    ).sort((a, b) => a.localeCompare(b));

    return {
      rows: (rows ?? []).map((r) => ({
        id: r.id as string,
        model_id: r.model_id as string,
        provider: (r.provider as string | null) ?? null,
        display_name: (r.display_name as string | null) ?? null,
        source: r.source as string,
        input_cost_per_token:
          r.input_cost_per_token === null ? null : Number(r.input_cost_per_token),
        output_cost_per_token:
          r.output_cost_per_token === null ? null : Number(r.output_cost_per_token),
        context_window: (r.context_window as number | null) ?? null,
        fetched_at: r.fetched_at as string,
        updated_at: r.updated_at as string,
      })),
      total: count ?? 0,
      page,
      pageSize: MODEL_PAGE_SIZE,
      providers,
    };
  });
