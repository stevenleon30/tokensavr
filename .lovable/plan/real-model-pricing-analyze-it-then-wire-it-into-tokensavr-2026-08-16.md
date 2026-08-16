# Real model pricing: analyze it, then wire it into TokenSavr

Today the app's cost knowledge lives as prose inside the strategy prompt ("Lovable Build ~1-3 credits", "$0.10 ≈ 1 credit") and a single hardcoded `DOLLARS_PER_CREDIT = 0.1` in `src/lib/cost.ts`. Nothing else in the app knows what a model or plan actually costs, so estimates can drift and users never see a dollar figure.

This plan replaces that guesswork with a single maintained pricing catalog and pushes it through generation, the dashboard, the recommendation engine, and a new public pricing page.

## How the cost analysis is done

1. Research current published prices (per-million input/output tokens for API models; per-seat and per-credit/message pricing for the vibe-coding platforms) for the 10 platforms already in the registry plus the underlying models they run on.
2. Convert everything to one comparable unit chain: `tokens -> USD -> credits`, with the credit peg documented in one place instead of being assumed at $0.10.
3. Record, for each entry, a `lastVerified` date and a source URL so the numbers are auditable and obviously refreshable.
4. Sanity-check the catalog against reality already in the database: compare stored `estimated_cost` vs logged `actual_cost_credits` in `step_progress` and note where the peg is off. The existing calibration signal (`src/lib/calibration.ts`) keeps handling per-user drift on top of the catalog.

## What gets built

### 1. Pricing catalog (`src/lib/pricing.ts`)
- `MODEL_PRICING`: per-model input/output USD per million tokens.
- `PLATFORM_PRICING`: per platform — plan tiers, monthly price, included credits/messages, USD per credit or per message, free-tier allowance, and which models it runs.
- `CREDIT_USD` derived from Lovable's real per-credit price rather than a magic constant.
- Helpers: `usdForTokens`, `usdToCredits`, `creditsToUsd`, `platformUsdPerUnit`, `cheapestPlatformFor(budget, goal)`.
- `PRICING_VERSION` + `lastVerified` on every entry.

### 2. Cost math uses the catalog
- `src/lib/cost.ts` keeps its string parser but imports the peg from `pricing.ts`, adds `parseCostToUsd`, and formats dollars alongside credits.

### 3. Generation prompt is generated, not hand-written
- In `src/routes/api.generate-strategy.ts`, the "Credit conversion guide" block is built from the catalog at request time, so prices in the prompt can never fall out of sync with the app. Output contract stays credits-only, so nothing downstream breaks.

### 4. Dollar view in the UI
- Results and dashboard show `~N credits (≈$X)` per step, per strategy total, and for savings — using the same converters, no duplicated math.
- Budget-vs-spend comparisons use dollars where the user picked a dollar budget (`$20/mo`, `$50/mo`).

### 5. Recommendation engine gets real inputs
- `recommendation-hero` / `recommendation-insights` rank platforms with catalog-derived effective cost for the projected workload rather than only the AI's self-reported scores, so "cheapest for your budget" is defensible.

### 6. New `/pricing` route
- Public comparison table: platform, plan, monthly price, included credits, effective cost per credit/message, free tier, models behind it.
- Sortable/filterable by budget, with `lastVerified` shown and a note that prices change.
- Own SEO head metadata; linked from the footer.

## Technical notes

- Catalog is a plain typed module (no DB table, no runtime API calls) — fast, SSR-safe, editable in one file, and versioned in git. If you later want in-app editing, the same shape ports to a table without touching call sites.
- No secrets or provider keys required; nothing new hits the network.
- All conversion goes through `pricing.ts` helpers; no component does its own arithmetic.
- Existing stored strategies keep working: parsing is unchanged and dollar figures are derived at render time.

## Out of scope

- Connecting user API keys to read real billed usage (separate feature).
- Automatic price scraping/refresh jobs.
