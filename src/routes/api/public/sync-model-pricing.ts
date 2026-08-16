import { createFileRoute } from "@tanstack/react-router";

/**
 * POST /api/public/sync-model-pricing
 *
 * Refreshes the model_pricing table from OpenRouter + LiteLLM + manual
 * overrides. Protected by a shared secret so only a scheduler can run it:
 *   Authorization: Bearer $SYNC_PRICING_SECRET   (or x-sync-secret header)
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

        try {
          const { syncModelPricing } = await import("@/lib/sync-model-pricing.server");
          const summary = await syncModelPricing();
          return Response.json({ ok: true, ...summary });
        } catch (err) {
          console.error("sync-model-pricing failed", err);
          return Response.json(
            { ok: false, error: (err as Error).message },
            { status: 500 },
          );
        }
      },
    },
  },
});
