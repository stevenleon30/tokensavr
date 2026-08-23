import { createFileRoute } from "@tanstack/react-router";

/**
 * POST /api/public/sync-model-pricing
 *
 * Refreshes the model_pricing table from OpenRouter + LiteLLM + manual
 * overrides. Protected by a shared secret so only a scheduler can run it:
 *   Authorization: Bearer $SYNC_PRICING_SECRET   (or x-sync-secret header)
 *
 * Every attempt writes exactly one pricing_sync_log row — success or failure —
 * so the public sync ledger reflects real coverage, gaps included.
 */
export const Route = createFileRoute("/api/public/sync-model-pricing")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const expected = process.env["SYNC_PRICING_SECRET"];
        if (!expected) {
          return Response.json(
            { ok: false, error: "Sync secret not configured" },
            { status: 500 },
          );
        }

        const provided =
          request.headers.get("x-sync-secret") ??
          request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
          "";

        if (provided !== expected) {
          return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
        }

        const startedAt = Date.now();
        const logRun = async (row: {
          status: "success" | "partial" | "failed";
          models_updated: number;
          models_checked: number;
          error_message?: string;
        }) => {
          try {
            const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
            await supabaseAdmin.from("pricing_sync_log").insert({
              status: row.status,
              models_updated: row.models_updated,
              models_checked: row.models_checked,
              duration_ms: Date.now() - startedAt,
              error_message: row.error_message ?? null,
            });
          } catch (logErr) {
            console.error("failed to write pricing_sync_log row", logErr);
          }
        };

        try {
          const { syncModelPricing } = await import("@/lib/sync-model-pricing.server");
          const summary = await syncModelPricing();
          const total = summary.openrouter + summary.litellm + summary.manual;

          await logRun({
            status: "success",
            models_updated: total,
            models_checked: total,
          });

          return Response.json({ ok: true, ...summary });
        } catch (err) {
          console.error("sync-model-pricing failed", err);
          await logRun({
            status: "failed",
            models_updated: 0,
            models_checked: 0,
            error_message: (err as Error).message,
          });
          return Response.json(
            { ok: false, error: (err as Error).message },
            { status: 500 },
          );
        }
      },
    },
  },
});
