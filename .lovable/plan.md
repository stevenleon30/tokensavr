

## Turn the strategy into a visual dashboard

Right now the results page is mostly text: a header, two charts, then a long vertical list of step cards. I'll convert it into a dashboard-style view where every step has its own mini-visualization, plus add new top-level charts that summarize the whole build at a glance. Copy/export still works exactly as today — every prompt stays one-click copyable, and "Copy all prompts" + PDF export remain unchanged.

### What you'll see at the top (new dashboard hero)

Replaces the current 3 summary cards with a richer 4-panel grid:

1. **Cost composition donut** — shares of estimated credits per platform (already have `PlatformDonut`, just promote it up here).
2. **Build timeline bar** — horizontal stacked bar where each segment = one step, colored by platform, width proportional to estimated cost. Hover/tap a segment → scrolls to that step. Gives an instant "where does the money go" read.
3. **Mode mix mini bar chart** — vertical bars for Plan / Build / Review / Debug step counts, so users see if the plan is balanced or build-heavy.
4. **Progress ring** — radial gauge showing % steps complete + actual vs estimated credits inside.

### What changes on every step card

Each step gets a compact visual strip underneath the title (left-aligned, ~64px tall):

- **Cost gauge** — small horizontal bar showing this step's estimated cost as a share of the total strategy cost (so step 3 visibly takes 22% of the budget, etc.).
- **Platform chip with brand color dot** — already there, kept.
- **Mode pill** with a tiny icon (Plan/Build/Review/Debug get distinct icons).
- **Actual vs estimated mini-bar** — when the user logs actual spend, a second bar appears underneath the estimate bar so over/under is visually obvious without reading numbers.
- **Step position dot-strip** — row of N dots (one per step in the strategy), the current step highlighted, completed steps filled green. Lets users see "step 4 of 11" visually inside every card.

### New "Copy entire dashboard" affordance

Adds a button next to "Copy all prompts": **"Copy dashboard summary"** → copies a clean markdown block with:
- Idea, budget, totals
- Platform cost breakdown table
- Numbered list of steps with platform, mode, estimated cost, and the prompt
- Footer with TokenSavr attribution

So the user can paste the whole strategy into Notion / Linear / a doc and have a readable, structured dashboard — not just prompts.

### Layout and polish

- Top dashboard hero collapses to a 2×2 grid on tablet, single column on mobile.
- Step cards stay vertically stacked but feel denser and more "dashboard-y" thanks to the visual strip.
- Reuses existing tokens and `PlatformDonut`; no new chart libraries.
- All visuals use the brand greens + per-platform brand colors already defined in `src/lib/platforms.ts`.

### Technical details

- New components in `src/components/`:
  - `strategy-timeline-bar.tsx` — stacked horizontal bar, click-to-scroll
  - `mode-mix-chart.tsx` — small vertical bars, pure SVG
  - `progress-ring.tsx` — SVG radial gauge
  - `step-visual-strip.tsx` — per-step cost gauge + dot-strip + actual-vs-estimate bar
- Edit `src/routes/results.tsx`:
  - Replace the existing 3-card `SummaryCard` row with the new 4-panel hero (donut moves up; existing "Cost by platform" section deleted since it's now redundant with the hero donut + timeline).
  - Insert `<StepVisualStrip>` inside `StepCard` between the title row and the prompt.
  - Add `copyDashboardMarkdown()` handler + button in both desktop and mobile action bars (mobile bar gets a 5th slot or swaps "Share" into an overflow menu).
- No DB schema changes. No new dependencies. All charts are inline SVG, consistent with the existing `PlatformDonut` pattern.

### Out of scope (ask if you want these next)

- Saving "actual cost" per step from the dashboard hero (already supported per-step today).
- Exporting the dashboard as a PNG image.
- Editable step reordering.

