import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const InputSchema = z.object({
  idea: z.string().trim().min(10).max(4000),
  budget: z.string().trim().min(1).max(200),
  platforms: z.array(z.string().min(1).max(40)).min(1).max(20),
});

const SYSTEM_PROMPT = `You are a token-optimization expert for AI coding platforms (Lovable, Claude, Cursor, ChatGPT, Bolt, v0).

Your job: take a user's idea + their budget + which platforms they have access to, and produce the cheapest possible build sequence.

Rules:
- Use FREE Claude.ai chat or ChatGPT free tier for planning, brainstorming, copywriting, schema design, and prompt drafting whenever possible.
- Use Lovable Chat Mode (1 credit per message) for architecture decisions and reviews — NOT for building.
- Use Lovable Build Mode only for final assembly of UI/code that requires a working preview.
- Use Cursor Chat for local file edits when the user has it.
- Batch related changes into a single Lovable Build Mode message — never send 5 small messages where 1 will do.
- Use the cheapest model that can do the task (e.g. GPT-4o-mini for simple text).
- Be specific about costs: "~1 credit", "~$0.02 in tokens", "free", etc.
- Each prompt_to_use must be a complete, copy-pasteable prompt the user sends to that platform — not a description.
- Estimate savings vs. doing the entire project in Lovable Build Mode alone.
- Only suggest platforms from the user's available list.

You MUST respond by calling the return_strategy tool with the structured plan.`;

const TOOL = {
  type: "function" as const,
  function: {
    name: "return_strategy",
    description: "Return the optimized build plan as structured JSON.",
    parameters: {
      type: "object",
      properties: {
        total_estimated_cost: { type: "string" },
        estimated_savings: { type: "string" },
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
              estimated_cost: { type: "string" },
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
        const { idea, budget, platforms } = parsed.data;

        const userMessage = `User's idea:
${idea}

Daily budget: ${budget}
Available platforms: ${platforms.join(", ")}

Produce a token-optimized build plan with 5–10 steps.`;

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
