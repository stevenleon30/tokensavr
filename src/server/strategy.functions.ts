import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const StepSchema = z.object({
  step_number: z.number(),
  action: z.string(),
  platform: z.string(),
  mode: z.string(),
  estimated_cost: z.string(),
  prompt_to_use: z.string(),
});

const StrategySchema = z.object({
  total_estimated_cost: z.string(),
  estimated_savings: z.string(),
  time_estimate: z.string().optional().default("—"),
  steps: z.array(StepSchema).min(1).max(15),
});

export type GeneratedStrategy = z.infer<typeof StrategySchema>;

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

export const generateStrategy = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }) => {
    const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
    if (!LOVABLE_API_KEY) {
      throw new Error("AI service is not configured. Please contact support.");
    }

    const userMessage = `User's idea:
${data.idea}

Daily budget: ${data.budget}
Available platforms: ${data.platforms.join(", ")}

Produce a token-optimized build plan with 5–10 steps.`;

    const tools = [
      {
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
      },
    ];

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
        tools,
        tool_choice: { type: "function", function: { name: "return_strategy" } },
      }),
    });

    if (res.status === 429) {
      throw new Error("Rate limit hit. Please wait a moment and try again.");
    }
    if (res.status === 402) {
      throw new Error("AI credits exhausted. Add credits in Settings → Workspace → Usage.");
    }
    if (!res.ok) {
      const text = await res.text();
      console.error("AI gateway error", res.status, text);
      throw new Error(`AI service error (${res.status}). Please try again.`);
    }

    const json = (await res.json()) as {
      choices?: Array<{
        message?: { tool_calls?: Array<{ function?: { arguments?: string } }> };
      }>;
    };

    const args = json.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!args) {
      throw new Error("AI did not return a structured plan. Please try again.");
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(args);
    } catch {
      throw new Error("AI returned invalid JSON. Please try again.");
    }

    const result = StrategySchema.safeParse(parsed);
    if (!result.success) {
      console.error("Strategy validation failed", result.error.format());
      throw new Error("AI returned an unexpected shape. Please try again.");
    }

    return result.data;
  });
