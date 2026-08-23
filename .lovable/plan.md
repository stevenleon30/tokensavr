# Fix the cost math and lead with tokens

## What's actually broken (verified)

I read the latest generated strategy in the database plus the results/pricing code. Four real defects:

1. **Confidence is off by 100x.** The last strategy stored `confidence_score: 0.95` on a 0–100 field, so the hero shows "0.95%" and the ring shows "1%". The model is returning a 0–1 probability; nothing normalizes it.

2. **Per-step estimates collapse to "0 credits".** The generation prompt tells the model that any step on a platform the user already pays for costs "0 credits". Since the user had Claude Code / Claude.ai access, most steps stored `"estimated_cost": "0 credits"` — which is why the cards read "Est. 0 credits" and "Estimate: 0 cr". Subscription-covered work is not free in tokens, and it makes tracking useless.

3. **Step sum contradicts the total.** Same strategy: steps sum to ~0 credits while `total_estimated_cost` is "~7-10 credits" and `estimated_savings` is "~15-20 credits saved". The prompt's ±20% sanity check is unenforced, so the header, the ring, and the step list disagree.

4. **Live per-step cost is nearly constant.** `live-pricing.ts` buckets every step into one of five hardcoded token profiles by regex over `mode + action`. Modes like "IDE" match nothing and fall through to the generic "chat" profile, so many different steps all price out at the identical "Live 0.19 cr · $0.05". Token volume also ignores project size and step position.

## What gets built

### 1. Tokens become the headline unit
- Each step card leads with estimated tokens (e.g. `~72K tok · 63K in / 9K out`), with credits and dollars as the secondary line instead of the reverse.
- Per-platform totals gain a token column: tokens, cost, and share of the plan, so "how many tokens will I burn on Claude Code vs Lovable" is answerable at a glance.
- The plan-level strip gets a Total tokens stat alongside token cost.

### 2. Token estimates that respond to the idea
- Replace the five fixed profiles with a sizing pass: base tokens per work type (plan / chat / build / review / test) scaled by a project-complexity factor derived from the idea (length, feature count, whether a backend/integrations are involved) and by step position (later build steps carry more accumulated context).
- Recognize the modes the model actually emits (IDE, Agent, Build, Chat, Plan, CLI) instead of only matching a few keywords, with an explicit fallback.
- Have the generator return `estimated_input_tokens` / `estimated_output_tokens` per step so its own view of workload is used when present, falling back to the sizing heuristic.

### 3. Credits reconcile
- Normalize `confidence_score` on read: values ≤ 1 are treated as a 0–1 probability and scaled, then clamped to 0–100.
- Drop the "subscription = 0 credits" rule. Steps get their true credit/token estimate, and coverage is shown separately as "covered by your Claude Code plan" so the user still sees the out-of-pocket benefit without zeroed data.
- Derive the displayed plan total from the steps rather than trusting the model's free-text total; when the model's total disagrees by more than 20%, show the step-derived number and keep the model's as a footnote.
- Savings are recomputed the same way (all-Lovable-Build baseline vs. the step-derived total) so the savings figure can't exceed the baseline.

### 4. Breakdown table
- `cost-breakdown.tsx` gains input/output token columns per step and a tokens-per-platform summary row, using the same numbers as the cards (single source of truth, no second math path).

## Technical notes

- Sizing logic lives in one exported module (`live-pricing.ts`) consumed by the results page and the breakdown; no component does arithmetic locally.
- Generation prompt and tool schema change: new optional per-step token fields, revised cost rules, explicit 0–100 confidence instruction.
- Existing saved strategies keep rendering: token fields are optional and the heuristic fills in when absent; confidence normalization is read-time so old rows display correctly too.
- No schema migration needed — steps stay in the existing `steps` jsonb (`{ items: [...] }` shape).

## Out of scope

- Reading real billed usage from provider APIs.
- Changing the daily model-pricing sync.
