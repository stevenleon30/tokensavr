/**
 * Model pricing sync.
 *
 * Fetches current LLM pricing from OpenRouter and LiteLLM, applies manual
 * overrides, and upserts into the model_pricing table.
 *
 * Manually maintained direct-from-provider pricing for models TokenSavr calls
 * directly. Anthropic and OpenAI don't expose a pricing API, so these are
 * transcribed from official sources. Update when a price changes.
 */

type ManualOverride = {
  provider: string;
  input_cost_per_token: number;
  output_cost_per_token: number;
  cache_read_cost_per_token?: number;
  cache_write_cost_per_token?: number;
  context_window?: number;
};

const MANUAL_PRICING_OVERRIDES: Record<string, ManualOverride> = {
  "anthropic/claude-opus-5": {
    provider: "anthropic",
    input_cost_per_token: 0.000005,
    output_cost_per_token: 0.000025,
    cache_read_cost_per_token: 0.0000005,
    context_window: 200000,
  },
  "anthropic/claude-sonnet-5": {
    provider: "anthropic",
    input_cost_per_token: 0.000002,
    output_cost_per_token: 0.00001,
    cache_read_cost_per_token: 0.0000002,
    context_window: 1000000,
  },
  "anthropic/claude-haiku-4-5": {
    provider: "anthropic",
    input_cost_per_token: 0.000001,
    output_cost_per_token: 0.000005,
    cache_read_cost_per_token: 0.0000001,
    context_window: 200000,
  },
  "anthropic/claude-fable-5": {
    provider: "anthropic",
    input_cost_per_token: 0.00001,
    output_cost_per_token: 0.00005,
    cache_read_cost_per_token: 0.000001,
    context_window: 200000,
  },
  "openai/gpt-5.6-sol": {
    provider: "openai",
    input_cost_per_token: 0.000005,
    output_cost_per_token: 0.00003,
    context_window: 1050000,
  },
  "openai/gpt-5.6-terra": {
    provider: "openai",
    input_cost_per_token: 0.000002,
    output_cost_per_token: 0.000012,
    context_window: 1050000,
  },
};

const OPENROUTER_MODELS_URL = "https://openrouter.ai/api/v1/models";
const LITELLM_PRICES_URL =
  "https://raw.githubusercontent.com/BerriAI/litellm/main/model_prices_and_context_window.json";

export type ModelPricingRow = {
  source: "openrouter" | "litellm" | "manual";
  model_id: string;
  provider: string | null;
  display_name: string | null;
  input_cost_per_token: number | null;
  output_cost_per_token: number | null;
  cache_read_cost_per_token: number | null;
  cache_write_cost_per_token: number | null;
  request_cost: number | null;
  context_window: number | null;
  max_output_tokens: number | null;
  supports_vision: boolean | null;
  supports_function_calling: boolean | null;
  supports_prompt_caching: boolean | null;
  modalities: string[] | null;
  raw: unknown;
  fetched_at: string;
};

// ---------- OpenRouter ----------

interface OpenRouterModel {
  id: string;
  name?: string;
  context_length?: number;
  pricing?: {
    prompt?: string;
    completion?: string;
    request?: string;
    input_cache_read?: string;
    input_cache_write?: string;
  };
  input_modalities?: string[];
  output_modalities?: string[];
}

async function fetchOpenRouterPricing(): Promise<ModelPricingRow[]> {
  const res = await fetch(OPENROUTER_MODELS_URL);
  if (!res.ok) {
    throw new Error(`OpenRouter fetch failed: ${res.status} ${res.statusText}`);
  }
  const json = (await res.json()) as { data: OpenRouterModel[] };
  const fetchedAt = new Date().toISOString();

  return json.data.map((model): ModelPricingRow => {
    const provider = model.id.includes("/") ? (model.id.split("/")[0] ?? null) : null;
    const toNum = (v?: string) => {
      if (v === undefined) return null;
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    };

    return {
      source: "openrouter",
      model_id: model.id,
      provider,
      display_name: model.name ?? null,
      input_cost_per_token: toNum(model.pricing?.prompt),
      output_cost_per_token: toNum(model.pricing?.completion),
      cache_read_cost_per_token: toNum(model.pricing?.input_cache_read),
      cache_write_cost_per_token: toNum(model.pricing?.input_cache_write),
      request_cost: toNum(model.pricing?.request),
      context_window: model.context_length ?? null,
      max_output_tokens: null,
      supports_vision: model.input_modalities?.includes("image") ?? null,
      supports_function_calling: null,
      supports_prompt_caching:
        model.pricing?.input_cache_read !== undefined ? true : null,
      modalities: model.input_modalities ?? null,
      raw: model,
      fetched_at: fetchedAt,
    };
  });
}

// ---------- LiteLLM ----------

interface LiteLLMModelSpec {
  input_cost_per_token?: number;
  output_cost_per_token?: number;
  input_cost_per_token_cache_hit?: number;
  cache_creation_input_token_cost?: number;
  litellm_provider?: string;
  max_input_tokens?: number;
  max_output_tokens?: number;
  max_tokens?: number;
  mode?: string;
  supports_function_calling?: boolean;
  supports_vision?: boolean;
  supports_prompt_caching?: boolean;
}

async function fetchLiteLLMPricing(): Promise<ModelPricingRow[]> {
  const res = await fetch(LITELLM_PRICES_URL);
  if (!res.ok) {
    throw new Error(`LiteLLM fetch failed: ${res.status} ${res.statusText}`);
  }
  const json = (await res.json()) as Record<string, LiteLLMModelSpec>;
  const fetchedAt = new Date().toISOString();

  return Object.entries(json)
    .filter(([key, spec]) => key !== "sample_spec" && spec.mode === "chat")
    .map(([modelId, spec]): ModelPricingRow => ({
      source: "litellm",
      model_id: modelId,
      provider: spec.litellm_provider ?? null,
      display_name: null,
      input_cost_per_token: spec.input_cost_per_token ?? null,
      output_cost_per_token: spec.output_cost_per_token ?? null,
      cache_read_cost_per_token: spec.input_cost_per_token_cache_hit ?? null,
      cache_write_cost_per_token: spec.cache_creation_input_token_cost ?? null,
      request_cost: null,
      context_window: spec.max_input_tokens ?? spec.max_tokens ?? null,
      max_output_tokens: spec.max_output_tokens ?? spec.max_tokens ?? null,
      supports_vision: spec.supports_vision ?? null,
      supports_function_calling: spec.supports_function_calling ?? null,
      supports_prompt_caching: spec.supports_prompt_caching ?? null,
      modalities: null,
      raw: spec,
      fetched_at: fetchedAt,
    }));
}

// ---------- Manual overrides ----------

function loadManualOverrides(): ModelPricingRow[] {
  const fetchedAt = new Date().toISOString();

  return Object.entries(MANUAL_PRICING_OVERRIDES).map(
    ([modelId, spec]): ModelPricingRow => ({
      source: "manual",
      model_id: modelId,
      provider: spec.provider,
      display_name: null,
      input_cost_per_token: spec.input_cost_per_token,
      output_cost_per_token: spec.output_cost_per_token,
      cache_read_cost_per_token: spec.cache_read_cost_per_token ?? null,
      cache_write_cost_per_token: spec.cache_write_cost_per_token ?? null,
      request_cost: null,
      context_window: spec.context_window ?? null,
      max_output_tokens: null,
      supports_vision: null,
      supports_function_calling: null,
      supports_prompt_caching: spec.cache_read_cost_per_token ? true : null,
      modalities: null,
      raw: spec,
      fetched_at: fetchedAt,
    }),
  );
}

// ---------- Sync ----------

export async function syncModelPricing() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const upsertBatch = async (rows: ModelPricingRow[], label: string) => {
    const BATCH_SIZE = 500;
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);
      const { error } = await supabaseAdmin
        .from("model_pricing")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .upsert(batch as any, { onConflict: "source,model_id" });

      if (error) {
        throw new Error(`Upsert failed for ${label} batch ${i}: ${error.message}`);
      }
      console.log(`  upserted ${batch.length} rows (${label}, offset ${i})`);
    }
  };

  console.log("Fetching OpenRouter pricing...");
  const openRouterRows = await fetchOpenRouterPricing();
  console.log(`  got ${openRouterRows.length} models`);

  console.log("Fetching LiteLLM pricing...");
  const liteLlmRows = await fetchLiteLLMPricing();
  console.log(`  got ${liteLlmRows.length} models`);

  const manualRows = loadManualOverrides();
  console.log(`  got ${manualRows.length} manual entries`);

  await upsertBatch(openRouterRows, "openrouter");
  await upsertBatch(liteLlmRows, "litellm");
  await upsertBatch(manualRows, "manual");

  return {
    openrouter: openRouterRows.length,
    litellm: liteLlmRows.length,
    manual: manualRows.length,
  };
}
