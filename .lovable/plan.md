
Yes — this is possible. I’ll shift TokenSavr from “choose your platforms, then copy a text-heavy plan” into a recommendation-led dashboard where the app chooses the best build route and makes prompts secondary/collapsible.

## Goal

Refactor the strategy flow so users enter:

1. What they want to build
2. Their budget
3. Their priority, such as:
   - Lowest budget
   - Best overall plan
   - Best output quality
   - Fastest build
   - Most beginner-friendly

Then TokenSavr recommends the best platform mix and shows the result as a visual dashboard dominated by graphs, scores, stats, and insights. Prompts remain available, but collapsed by default.

## Changes to the generate page

### Replace platform picker with a recommendation engine input

Remove the current “Which platforms do you have access to?” multi-select as the main decision point.

Add a new step:

```text
What should TokenSavr optimize for?
```

Options:

- Cheapest build
- Best output quality
- Fastest path
- Beginner-friendly
- Balanced recommendation

Optional secondary input:

```text
Any platforms you already pay for?
```

This can remain a smaller “I already have access to…” selector, but it will be supporting context — not the primary workflow.

### Update generation payload

Instead of sending only:

```ts
idea
budget
platforms
```

send:

```ts
idea
budget
optimizationGoal
existingAccess
```

The user no longer has to decide where to plan/build. TokenSavr decides.

## Recommendation engine

### Backend strategy prompt update

Update `/api/generate-strategy` so the AI acts as a platform recommendation engine, not just a step generator.

It should evaluate platforms against criteria like:

- Cost efficiency
- Build quality
- Planning quality
- Speed
- Ease of use
- Fit for project type
- Whether the platform is likely to require paid usage
- Whether free-tier planning can reduce paid build credits

### Structured output additions

Expand the generated strategy shape from:

```ts
total_estimated_cost
estimated_savings
time_estimate
steps
```

to include:

```ts
recommended_platform
recommendation_reason
optimization_goal
confidence_score
platform_scores
recommended_stack
tradeoffs
```

Example:

```ts
{
  recommended_platform: "Lovable",
  recommendation_reason: "Best balance of working preview, fast iteration, and low build complexity for this app.",
  optimization_goal: "Balanced recommendation",
  confidence_score: 87,
  platform_scores: [
    {
      platform: "Lovable",
      overall: 87,
      cost: 72,
      output_quality: 90,
      speed: 88,
      beginner_friendly: 94,
      reason: "Best for full-stack visual build and deployment."
    },
    {
      platform: "Claude",
      overall: 81,
      cost: 95,
      output_quality: 86,
      speed: 70,
      beginner_friendly: 72,
      reason: "Excellent for planning and prompt refinement, but not final app assembly."
    }
  ],
  recommended_stack: [
    "Claude for planning",
    "Lovable for app build",
    "ChatGPT/Gemini for copy review if free"
  ],
  tradeoffs: [
    "Cheapest route may take longer",
    "Best output route may use more Lovable build credits"
  ]
}
```

## Results page dashboard refactor

### Make dashboard visuals dominant

Rework `/results` so the top of the page focuses on:

1. Recommended build platform
2. Confidence score
3. Cost estimate
4. Savings estimate
5. Best-use platform stack
6. Tradeoffs
7. Visual platform comparison

The page should feel like a strategy dashboard first, prompt library second.

### New dashboard sections

Add these visual panels:

#### 1. Recommendation hero

Large card showing:

```text
Recommended build path: Lovable + Claude planning
Confidence: 87%
Best for: Balanced recommendation
Estimated cost: ~12 credits
Estimated savings: ~18 credits saved
```

#### 2. Platform score comparison

A bar chart comparing platforms across:

- Overall score
- Cost
- Quality
- Speed
- Beginner-friendliness

This directly answers “why this platform?”

#### 3. Recommendation matrix

A compact grid:

```text
Platform       Cost   Quality   Speed   Ease   Best use
Lovable        72     90        88      94     Final build
Claude         95     86        70      72     Planning
Cursor         80     82        84      60     Code edits
ChatGPT        90     78        86      85     Copy/research
```

#### 4. Build route timeline

Keep the current visual timeline, but make it represent the recommended workflow:

```text
Plan → Architecture → UI Build → Review → Optimize → Ship
```

#### 5. Savings insights

Show why the route saves money:

- “Use free planning before paid build messages”
- “Batch UI changes into fewer build prompts”
- “Use Lovable only when preview/deployment matters”
- “Use cheaper/free tools for copy, schema, and reviews”

#### 6. Prompt library collapsed by default

Move prompts into a secondary section titled:

```text
Copy-ready prompts
```

Each step card should show:

- Step number
- Action
- Platform
- Estimated cost
- Status/progress visual
- “Copy prompt” button
- Collapsed prompt body

The prompt text should be hidden by default on all screen sizes, not just mobile.

## Prompt collapse behavior

Current behavior:

- Desktop: prompts are always open
- Mobile: prompts are collapsed

New behavior:

- Desktop: prompts collapsed by default
- Mobile: prompts collapsed by default
- User can open individual prompt
- Add “Expand all prompts” / “Collapse all prompts”
- Keep one-click copy available without expanding

This keeps the page from becoming a wall of text.

## Copy/export changes

### Keep existing copy buttons

Keep:

- Copy individual prompt
- Copy all prompts
- Copy dashboard summary
- Download PDF

### Update dashboard summary

The copied dashboard summary should prioritize insights first:

```md
# TokenSavr Build Recommendation

Recommended path: Lovable + Claude planning
Optimization goal: Lowest budget
Confidence: 87%

## Why this route
...

## Platform scorecard
| Platform | Overall | Cost | Quality | Speed | Ease |
...

## Recommended workflow
...

## Copy-ready prompts
...
```

## Data model impact

No required database migration for the first version.

The recommendation metadata can be stored inside the existing `strategies.steps` JSON flow or added to the strategy payload stored in session/database. Since `strategies` already stores flexible JSON for steps and text fields for summary data, this can be implemented without adding tables.

Optional later improvement: add dedicated database columns for `recommended_platform`, `optimization_goal`, and `confidence_score` to make dashboard filtering easier.

## Files to update

### `src/routes/generate.tsx`

- Remove the platform picker as the main Step 3
- Add optimization goal selector
- Optionally keep “platforms you already pay for” as a smaller advanced field
- Update the payload sent to `streamStrategy`
- Update live preview language from “platforms selected” to “recommendation being generated”

### `src/lib/strategy-stream.ts`

- Update `StrategyInput` type
- Add recommendation-related fields to `StreamingPartial`

### `src/routes/api.generate-strategy.ts`

- Update input validation
- Update system prompt
- Update tool schema to return recommendation metadata
- Replace “Only suggest platforms from selected list” with “recommend best platform mix based on budget, goal, and project fit”
- Fix the backend wording that still says “Daily budget”

### `src/routes/results.tsx`

- Add recommendation hero
- Add platform score visual sections
- Make prompts collapsed by default on all devices
- Add expand/collapse all controls
- Update copy dashboard summary to include recommendation rationale and platform scorecard
- De-emphasize raw prompt text visually

### New component candidates

- `src/components/recommendation-hero.tsx`
- `src/components/platform-score-bars.tsx`
- `src/components/platform-score-matrix.tsx`
- `src/components/recommendation-insights.tsx`

## Implementation sequence

1. Update generation input flow to collect optimization goal instead of making users choose build platforms.
2. Update strategy input/output types.
3. Update the backend AI schema and recommendation prompt.
4. Update results page to render recommendation metadata.
5. Collapse all prompt text by default and add expand/collapse controls.
6. Update copy/export text so the dashboard summary reads like an insight report.
7. Test existing saved strategies with missing recommendation metadata and show graceful fallbacks so old results do not break.

## Backward compatibility

Older strategies that do not have recommendation metadata will still load.

For old strategies:

- Use the highest-cost or most-used platform as a fallback “primary platform”
- Hide confidence score if unavailable
- Keep existing charts working
- Keep prompts collapsed by default

## Result

The user experience becomes:

```text
User describes idea + budget + goal
          ↓
TokenSavr recommends the best build platform/path
          ↓
Dashboard explains why with scores, charts, tradeoffs, and savings
          ↓
Prompts are available when needed, but no longer dominate the page
```
