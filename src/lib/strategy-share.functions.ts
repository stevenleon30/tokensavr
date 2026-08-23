import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const shareInput = z.object({
  title: z.string().min(1).max(160),
  payload: z.record(z.string(), z.any()),
});

const idInput = z.object({ id: z.string().uuid() });

/**
 * Creates a public, read-only share record for a strategy.
 * Works for anonymous visitors — no account required.
 */
export const createStrategyShare = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => shareInput.parse(data))
  .handler(async ({ data }): Promise<{ id: string }> => {
    const serialized = JSON.stringify(data.payload);
    if (serialized.length > 400_000) {
      throw new Error("Strategy is too large to share.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: row, error } = await supabaseAdmin
      .from("strategy_shares")
      .insert({ title: data.title, payload: data.payload as never })
      .select("id")
      .single();

    if (error || !row) throw new Error(error?.message ?? "Could not create share link.");
    return { id: row.id as string };
  });

/**
 * Reads a single shared strategy by its unguessable id. Runs server-side and is
 * always scoped to one id, so the table itself stays unreadable by clients and
 * cannot be enumerated.
 */
export const getStrategyShare = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => idInput.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin: supabase } = await import(
      "@/integrations/supabase/client.server"
    );

    const { data: row, error } = await supabase
      .from("strategy_shares")
      .select("id,title,payload,created_at")
      .eq("id", data.id)
      .maybeSingle();


    if (error) throw new Error(error.message);
    if (!row) return null;

    return {
      id: row.id as string,
      title: row.title as string,
      createdAt: row.created_at as string,
      payload: row.payload as Record<string, any>,
    };
  });
