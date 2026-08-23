// Streaming client for /api/generate-strategy.
// Parses SSE chunks from the Lovable AI Gateway, extracts the tool-call
// `arguments` delta string, and emits incrementally-parseable partials so
// the UI can render steps as they appear.

export type StreamingStep = {
  step_number?: number;
  action?: string;
  platform?: string;
  mode?: string;
  estimated_cost?: string;
  estimated_input_tokens?: number;
  estimated_output_tokens?: number;
  covered_by_subscription?: boolean;
  prompt_to_use?: string;
};


export type PlatformScore = {
  platform: string;
  overall: number;
  cost: number;
  output_quality: number;
  speed: number;
  beginner_friendly: number;
  reason?: string;
};

export type StreamingPartial = {
  recommended_platform?: string;
  recommendation_reason?: string;
  optimization_goal?: string;
  confidence_score?: number;
  platform_scores?: PlatformScore[];
  recommended_stack?: string[];
  tradeoffs?: string[];
  total_estimated_cost?: string;
  estimated_savings?: string;
  time_estimate?: string;
  steps?: StreamingStep[];
};

type Callbacks = {
  onPartial: (partial: StreamingPartial, rawArgs: string) => void;
  onError?: (message: string) => void;
};

export type StrategyInput = {
  idea: string;
  budget: string;
  optimizationGoal: string;
  existingAccess: string[];
  /**
   * Optional historical accuracy signal. The server uses this to nudge the
   * AI's per-step credit estimates up or down based on the user's past
   * over/under pattern. `avgErrorPct` is a signed fraction
   * (e.g. 0.2 = real spend ran 20% over estimates).
   */
  calibration?: {
    avgErrorPct: number;
    sampleSize: number;
  };
};

export async function streamStrategy(
  input: StrategyInput,
  { onPartial, onError }: Callbacks,
  signal?: AbortSignal,
): Promise<{ rawArgs: string } | null> {
  const resp = await fetch("/api/generate-strategy", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
    signal,
  });

  if (!resp.ok) {
    let message = `Request failed (${resp.status}).`;
    try {
      const j = (await resp.json()) as { error?: string };
      if (j?.error) message = j.error;
    } catch {
      /* noop */
    }
    onError?.(message);
    return null;
  }

  if (!resp.body) {
    onError?.("Empty response from AI.");
    return null;
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let textBuffer = "";
  let argsBuffer = "";
  let lastEmittedArgsLen = 0;
  let streamDone = false;

  const flushPartial = () => {
    // Throttle: only re-parse when we've added some bytes since last parse.
    if (argsBuffer.length === lastEmittedArgsLen) return;
    lastEmittedArgsLen = argsBuffer.length;
    const partial = parsePartialJson(argsBuffer);
    if (partial) onPartial(partial, argsBuffer);
  };

  const handleLine = (rawLine: string) => {
    let line = rawLine;
    if (line.endsWith("\r")) line = line.slice(0, -1);
    if (line.startsWith(":") || line.trim() === "") return;
    if (!line.startsWith("data: ")) return;
    const jsonStr = line.slice(6).trim();
    if (jsonStr === "[DONE]") {
      streamDone = true;
      return;
    }
    try {
      const parsed = JSON.parse(jsonStr) as {
        choices?: Array<{
          delta?: {
            tool_calls?: Array<{
              function?: { arguments?: string };
            }>;
          };
          message?: {
            tool_calls?: Array<{ function?: { arguments?: string } }>;
          };
        }>;
      };
      const choice = parsed.choices?.[0];
      const deltaArgs =
        choice?.delta?.tool_calls?.[0]?.function?.arguments ??
        choice?.message?.tool_calls?.[0]?.function?.arguments;
      if (typeof deltaArgs === "string" && deltaArgs.length > 0) {
        argsBuffer += deltaArgs;
        flushPartial();
      }
    } catch {
      /* ignore individual line parse errors */
    }
  };

  while (!streamDone) {
    const { done, value } = await reader.read();
    if (done) break;
    textBuffer += decoder.decode(value, { stream: true });

    let nl: number;
    while ((nl = textBuffer.indexOf("\n")) !== -1) {
      const line = textBuffer.slice(0, nl);
      textBuffer = textBuffer.slice(nl + 1);
      handleLine(line);
    }
  }

  if (textBuffer.trim()) {
    for (const raw of textBuffer.split("\n")) handleLine(raw);
  }

  // Final flush
  flushPartial();
  return { rawArgs: argsBuffer };
}

/**
 * Tolerant partial JSON parser: closes any open string/array/object so we can
 * preview a partially-streamed JSON payload. Strings that are mid-escape are
 * trimmed back to a safe boundary.
 */
function parsePartialJson(src: string): StreamingPartial | null {
  if (!src) return null;
  const stack: Array<"{" | "[" | '"'> = [];
  let inString = false;
  let escape = false;
  let lastSafe = 0;

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inString) {
      if (escape) {
        escape = false;
        continue;
      }
      if (ch === "\\") {
        escape = true;
        continue;
      }
      if (ch === '"') {
        inString = false;
        stack.pop();
        lastSafe = i + 1;
      }
      continue;
    }
    if (ch === '"') {
      inString = true;
      stack.push('"');
      continue;
    }
    if (ch === "{" || ch === "[") {
      stack.push(ch);
      continue;
    }
    if (ch === "}" || ch === "]") {
      stack.pop();
      lastSafe = i + 1;
      continue;
    }
    if (ch === "," || ch === ":" || /\s/.test(ch)) {
      lastSafe = i + 1;
    } else {
      // number / true / false / null in progress — safe-point at last comma/brace
    }
  }

  let candidate = src.slice(0, lastSafe);
  // If we were mid-string when we cut, drop a trailing unterminated string.
  // Rebuild the close stack from `candidate`.
  const closes: string[] = [];
  let inStr = false;
  let esc = false;
  const opens: Array<"{" | "["> = [];
  for (let i = 0; i < candidate.length; i++) {
    const ch = candidate[i];
    if (inStr) {
      if (esc) {
        esc = false;
        continue;
      }
      if (ch === "\\") {
        esc = true;
        continue;
      }
      if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') {
      inStr = true;
      continue;
    }
    if (ch === "{" || ch === "[") opens.push(ch);
    else if (ch === "}" || ch === "]") opens.pop();
  }

  // Trim trailing comma if present
  candidate = candidate.replace(/,\s*$/, "");
  // Close any open structures
  for (let i = opens.length - 1; i >= 0; i--) {
    closes.push(opens[i] === "{" ? "}" : "]");
  }

  const closed = candidate + closes.join("");
  try {
    return JSON.parse(closed) as StreamingPartial;
  } catch {
    return null;
  }
}
