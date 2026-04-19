
This is a research/explanation request — no code changes needed. Let me explain how the Generate page works in simple terms.

# How the Generate Page Works

The Generate page (`src/routes/generate.tsx`) is a 4-step form that turns your app idea into a token-saving plan, with a live AI streaming preview.

## Step-by-step flow

**1. Describe your idea (Step 01)**
You type what you want to build into a textarea (e.g. "a Notion-style note app"). Must be at least 10 characters.

**2. Pick your budget (Step 02)**
Click one of four cards: Free, Starter ($20/mo), Pro ($50/mo), or Custom. If you pick Custom, an extra input appears so you can type your own budget.

**3. Pick your platforms (Step 03)**
Click pill buttons (Lovable, Claude, ChatGPT, Cursor, Bolt, v0) to toggle which AI tools you have access to. Lovable + Claude are pre-selected.

**4. Click "Generate Strategy" (Step 04)**
Validates your inputs, then kicks off the AI request.

## What happens when you click Generate

```text
You click Generate
       ↓
Validate idea length + at least 1 platform
       ↓
Open streaming connection to /api/generate-strategy
       ↓
AI starts sending back tokens piece-by-piece
       ↓
Live preview section appears below the button
       ↓
Steps render one-by-one as they arrive (LiveStep cards)
       ↓
When done: save to database (if signed in)
       ↓
Redirect to /results page
```

## The live streaming part (the cool bit)

- `streamStrategy()` in `src/lib/strategy-stream.ts` opens a fetch to the API.
- The AI sends back **SSE chunks** (server-sent events) — small pieces of JSON.
- A tolerant JSON parser closes any half-finished brackets so we can preview incomplete data.
- Each time a new chunk arrives, `onPartial` fires → React re-renders the step list.
- You see steps appear with placeholders ("Writing action…", "picking platform…") that fill in as more tokens arrive.

## What gets saved

When streaming finishes, the page:
1. Validates the plan is complete (cost, savings, at least 1 step).
2. Stores it in `sessionStorage` as a fallback.
3. If signed in: inserts a row into the `strategies` table in Supabase.
4. Navigates to `/results` (with the saved ID if available).

## Key pieces in the file

| Piece | What it does |
|---|---|
| `idea`, `budgetId`, `platforms` state | Form values |
| `partial` state | Holds the streaming AI response as it grows |
| `abortRef` | Cancels the stream if you leave the page |
| `LiveStep` component | Renders each AI step card with platform badge + cost + prompt |
| `MiniStat` component | The 3 small "Cost / Savings / Time" tiles above the steps |
| `StepHeader` component | The "01", "02"… numbered section labels |

That's it — a form, a streaming fetch, and live-rendering cards.
