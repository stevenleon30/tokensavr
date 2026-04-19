import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const InputSchema = z.object({
  idea: z.string().trim().min(10).max(4000),
  budget: z.string().trim().min(1).max(200),
  platforms: z.array(z.string().min(1).max(40)).min(1).max(20),
  calibration: z
    .object({
      // Signed fraction: +0.2 = real spend ran 20% over past estimates.
      avgErrorPct: z.number().finite().min(-2).max(5),
      sampleSize: z.number().int().min(1).max(1000),
    })
    .optional(),
});

/**
 * Build a calibration directive from the user's historical accuracy signal.
 * Only emits guidance when there's a meaningful sample and a non-trivial bias
 * — small samples or near-zero deviations are ignored to avoid overfitting.
 */
function buildCalibrationNote(
  cal: { avgErrorPct: number; sampleSize: number } | undefined,
): string {
  if (!cal || cal.sampleSize < 2) return "";
  const pct = Math.round(cal.avgErrorPct * 100);
  if (Math.abs(pct) < 10) return "";
  // Cap the nudge so a few outlier strategies can't blow up estimates.
  const cappedPct = Math.max(-50, Math.min(75, pct));
  const direction = cappedPct > 0 ? "UNDER" : "OVER";
  const adjustVerb = cappedPct > 0 ? "increase" : "decrease";
  const magnitude = Math.abs(cappedPct);
  return `

CALIBRATION FROM THIS USER'S HISTORY (${cal.sampleSize} tracked strategies):
- Your past estimates have been ${direction}-stating real cost by ~${magnitude}% on average for this user.
- Adjust each step's "estimated_cost" by roughly ${adjustVerb}ing baseline credit values by ~${magnitude}% before formatting.
- Apply the same ${adjustVerb} to "total_estimated_cost".
- Do not mention this calibration in any user-visible field; just bake the adjustment into the numbers.`;
}

const SYSTEM_PROMPT = `You are a token-optimization expert for AI coding platforms (Lovable, Claude, Cursor, ChatGPT, Bolt, v0).

Your job: take a user's idea + their budget + which platforms they have access to, and produce the cheapest possible build sequence.

Rules:
- Use FREE Claude.ai chat or ChatGPT free tier for planning, brainstorming, copywriting, schema design, and prompt drafting whenever possible.
- Use Lovable Chat Mode (1 credit per message) for architecture decisions and reviews — NOT for building.
- Use Lovable Build Mode only for final assembly of UI/code that requires a working preview.
- Use Cursor Chat for local file edits when the user has it.
- Batch related changes into a single Lovable Build Mode message — never send 5 small messages where 1 will do.
- Use the cheapest model that can do the task (e.g. GPT-4o-mini for simple text).
- Each prompt_to_use must be a complete, copy-pasteable prompt the user sends to that platform — not a description.
- Estimate savings vs. doing the entire project in Lovable Build Mode alone.
- Only suggest platforms from the user's available list.

COST UNIT — CRITICAL FOR DOWNSTREAM AGGREGATION:
- ALL "estimated_cost" values MUST be expressed in CREDITS, using ONE of these exact formats:
  • "0 credits"            (free tier, no measurable cost)
  • "1 credit"             (single-credit step, singular)
  • "N credits"            (integer ≥ 2, e.g. "3 credits")
  • "N-M credits"          (integer range, e.g. "2-4 credits", with N < M)
  • "~N credits"           (approximate, e.g. "~2 credits")
  • "~0.5 credits"         (decimal, max one decimal place, for sub-credit costs)
- DO NOT use dollars, tokens, messages, hours, or any other unit in estimated_cost.
- DO NOT add prose qualifiers ("about", "roughly", "in tokens", "of API", etc.) — only the formats above.
- "total_estimated_cost" and "estimated_savings" MUST also use the credits unit, e.g. "~12 credits" or "8-10 credits saved".

Credit conversion guide (use these as your baseline when estimating):
- Lovable Build Mode: ~1-3 credits per non-trivial build message; complex multi-file refactors 3-5.
- Lovable Chat Mode: 1 credit per message, flat.
- Claude.ai free chat / ChatGPT free tier: "0 credits" (free).
- Claude API / OpenAI API direct calls: convert at $0.10 ≈ 1 credit (e.g. a $0.02 call → "~0.2 credits", a $0.50 call → "~5 credits").
- Cursor Chat (paid plan, included quota): "0 credits" if within the user's existing subscription.
- Bolt / v0 message-based steps: count each message as ~1 credit unless the platform's pricing clearly differs.

Sanity check before responding: the sum of every step's estimated_cost (using the midpoint of any range) should be within ±20% of total_estimated_cost. If they don't match, fix the per-step numbers — do not silently inflate the total.

You MUST respond by calling the return_strategy tool with the structured plan.`;

const TOOL = {
  type: "function" as const,
  function: {
    name: "return_strategy",
    description: "Return the optimized build plan as structured JSON.",
    parameters: {
      type: "object",
      properties: {
        total_estimated_cost: {
          type: "string",
          description:
            'Total cost in credits across all steps. Format: "~N credits" or "N-M credits" (e.g. "~12 credits", "8-10 credits"). No dollars, tokens, or other units.',
        },
        estimated_savings: {
          type: "string",
          description:
            'Estimated credit savings vs. doing everything in Lovable Build Mode. Format: "~N credits saved" or "N-M credits saved".',
        },
        time_estimate: { type: "string" },
        steps: {
          type: "array",
          items: {
            type: "object",
            properties: {
              step_number: { type: "number" },
              action: { type: "string" },
              platform: { type: "string" },
              mode: { type: "string" },
              estimated_cost: {
                type: "string",
                description:
                  'Cost of THIS step, in credits only. Allowed formats: "0 credits", "1 credit", "N credits", "N-M credits", "~N credits", "~0.5 credits". Never use dollars, tokens, messages, or other units.',
                pattern:
                  "^(0 credits|1 credit|~?\\d+(\\.\\d)? credits|\\d+-\\d+ credits)$",
              },
              prompt_to_use: { type: "string" },
            },
            required: [
              "step_number",
              "action",
              "platform",
              "mode",
              "estimated_cost",
              "prompt_to_use",
            ],
            additionalProperties: false,
          },
        },
      },
      required: ["total_estimated_cost", "estimated_savings", "time_estimate", "steps"],
      additionalProperties: false,
    },
  },
};

export const Route = createFileRoute("/api/generate-strategy")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
        if (!LOVABLE_API_KEY) {
          return Response.json(
            { error: "AI service is not configured." },
            { status: 500 },
          );
        }

        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return Response.json({ error: "Invalid JSON body." }, { status: 400 });
        }
        const parsed = InputSchema.safeParse(body);
        if (!parsed.success) {
          return Response.json({ error: "Invalid input." }, { status: 400 });
        }
        const { idea, budget, platforms, calibration } = parsed.data;

        const calibrationNote = buildCalibrationNote(calibration);

        const userMessage = `User's idea:
${idea}

Daily budget: ${budget}
Available platforms: ${platforms.join(", ")}

Produce a token-optimized build plan with 5–10 steps.${calibrationNote}`;

        const upstream = await fetch(
          "https://ai.gateway.lovable.dev/v1/chat/completions",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash",
              messages: [
                { role: "system", content: SYSTEM_PROMPT },
                { role: "user", content: userMessage },
              ],
              tools: [TOOL],
              tool_choice: { type: "function", function: { name: "return_strategy" } },
              stream: true,
            }),
          },
        );

        if (upstream.status === 429) {
          return Response.json(
            { error: "Rate limit hit. Please wait a moment and try again." },
            { status: 429 },
          );
        }
        if (upstream.status === 402) {
          return Response.json(
            {
              error:
                "AI credits exhausted. Add credits in Settings → Workspace → Usage.",
            },
            { status: 402 },
          );
        }
        if (!upstream.ok || !upstream.body) {
          const text = await upstream.text().catch(() => "");
          console.error("AI gateway error", upstream.status, text);
          return Response.json(
            { error: `AI service error (${upstream.status}).` },
            { status: 502 },
          );
        }

        return new Response(upstream.body, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive",
          },
        });
      },
    },
  },
});
