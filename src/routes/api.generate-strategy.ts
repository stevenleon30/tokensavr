import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { buildPricingGuide } from "@/lib/pricing";

const InputSchema = z.object({
  idea: z.string().trim().min(10).max(4000),
  budget: z.string().trim().min(1).max(200),
  optimizationGoal: z.string().trim().min(1).max(80),
  existingAccess: z.array(z.string().min(1).max(40)).max(20).default([]),
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

const SYSTEM_PROMPT = `You are a recommendation engine and token-optimization expert for AI coding platforms (Lovable, Claude, Cursor, ChatGPT, Bolt, Replit Agent, Windsurf, Claude Code, GitHub Copilot, Gemini).

Your job: take a user's idea + budget + optimization priority + platforms they already pay for, recommend the best build path, and produce a visual-dashboard-ready build sequence.

Rules:
- Recommend the best platform mix based on budget, output quality, speed, beginner-friendliness, and project fit — do not require the user to choose the build platform.
- Honor the optimization goal. If it says cheapest, aggressively prefer free planning and fewer paid build steps. If it says best output, accept more credits for higher quality.
- Use existing paid access as a cost advantage, but still recommend a better platform if it materially improves the plan.
- Use FREE Claude.ai chat or ChatGPT free tier for planning, brainstorming, copywriting, schema design, and prompt drafting whenever possible.
- Use Lovable Chat Mode (1 credit per message) for architecture decisions and reviews — NOT for building.
- Use Lovable Build Mode only for final assembly of UI/code that requires a working preview.
- Use Cursor Chat for local file edits when the user has it.
- Batch related changes into a single Lovable Build Mode message — never send 5 small messages where 1 will do.
- Use the cheapest model that can do the task (e.g. GPT-4o-mini for simple text).
- Each prompt_to_use must be a complete, copy-pasteable prompt the user sends to that platform — not a description.
- Estimate savings vs. doing the entire project in Lovable Build Mode alone.
- Return platform_scores for at least 4 platforms that are relevant to the request.

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

${buildPricingGuide()}

Additional estimating baselines:
- Lovable Build Mode: ~1-3 credits per non-trivial build message; complex multi-file refactors 3-5.
- Lovable Chat Mode: 1 credit per message, flat.
- Claude.ai free chat / ChatGPT free tier: "0 credits" (free).
- A step running on a paid platform the user ALREADY subscribes to is NOT free: still give its real credit/message cost and set "covered_by_subscription": true so the app can show that it comes out of an existing plan. Only use "0 credits" for genuinely free tiers.

TOKEN ESTIMATES — REQUIRED PER STEP:
- Every step MUST include "estimated_input_tokens" and "estimated_output_tokens": the realistic token volume that step will consume on that platform.
- Input tokens include the prompt plus the project context the tool will read (existing files, schema, prior steps). Output tokens are the generated code/text.
- Typical ranges for a medium project: planning/brainstorm turn 5K-15K in / 1K-4K out; chat/architecture turn 10K-25K in / 2K-4K out; review/debug pass 20K-50K in / 3K-8K out; full build or agent turn 40K-120K in / 6K-20K out.
- Scale these up for a large, multi-surface project with integrations, and down for a tiny single-screen app. Later build steps should carry more input tokens than early ones because more project context exists.

CONFIDENCE:
- "confidence_score" is a PERCENTAGE from 0 to 100 (e.g. 85 for high confidence). Never return a 0-1 probability like 0.85.

Sanity check before responding: the sum of every step's estimated_cost (using the midpoint of any range) should be within ±20% of total_estimated_cost. If they don't match, fix the per-step numbers — do not silently inflate the total. estimated_savings must be smaller than the cost of building the whole thing in Lovable Build Mode alone.

You MUST respond by calling the return_strategy tool with the structured plan.`;


const TOOL = {
  type: "function" as const,
  function: {
    name: "return_strategy",
    description: "Return the optimized build plan as structured JSON.",
    parameters: {
      type: "object",
      properties: {
        recommended_platform: { type: "string" },
        recommendation_reason: { type: "string" },
        optimization_goal: { type: "string" },
        confidence_score: { type: "number", minimum: 0, maximum: 100 },
        platform_scores: {
          type: "array",
          items: {
            type: "object",
            properties: {
              platform: { type: "string" },
              overall: { type: "number", minimum: 0, maximum: 100 },
              cost: { type: "number", minimum: 0, maximum: 100 },
              output_quality: { type: "number", minimum: 0, maximum: 100 },
              speed: { type: "number", minimum: 0, maximum: 100 },
              beginner_friendly: { type: "number", minimum: 0, maximum: 100 },
              reason: { type: "string" },
            },
            required: ["platform", "overall", "cost", "output_quality", "speed", "beginner_friendly", "reason"],
            additionalProperties: false,
          },
        },
        recommended_stack: { type: "array", items: { type: "string" } },
        tradeoffs: { type: "array", items: { type: "string" } },
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
              estimated_input_tokens: {
                type: "number",
                minimum: 0,
                description:
                  "Realistic input/context tokens this step consumes on that platform.",
              },
              estimated_output_tokens: {
                type: "number",
                minimum: 0,
                description: "Realistic output tokens this step generates.",
              },
              covered_by_subscription: {
                type: "boolean",
                description:
                  "True when this step runs on a paid plan the user already subscribes to (cost is not additional out-of-pocket).",
              },
              prompt_to_use: { type: "string" },
            },
            required: [
              "step_number",
              "action",
              "platform",
              "mode",
              "estimated_cost",
              "estimated_input_tokens",
              "estimated_output_tokens",
              "covered_by_subscription",
              "prompt_to_use",
            ],
            additionalProperties: false,
          },

        },
      },
      required: [
        "recommended_platform",
        "recommendation_reason",
        "optimization_goal",
        "confidence_score",
        "platform_scores",
        "recommended_stack",
        "tradeoffs",
        "total_estimated_cost",
        "estimated_savings",
        "time_estimate",
        "steps",
      ],
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
        const { idea, budget, optimizationGoal, existingAccess, calibration } = parsed.data;

        const calibrationNote = buildCalibrationNote(calibration);

        const userMessage = `User's idea:
${idea}

Budget: ${budget}
Optimization goal: ${optimizationGoal}
Platforms already paid for or preferred: ${existingAccess.length ? existingAccess.join(", ") : "None specified"}

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
