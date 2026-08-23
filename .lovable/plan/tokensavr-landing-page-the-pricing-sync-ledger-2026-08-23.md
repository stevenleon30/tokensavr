# TokenSavr landing page — the pricing sync ledger

A quiet, paper-and-ink landing page whose centerpiece is a year-long ledger grid of real pricing sync activity. Site shell (nav + footer) moves to the same light paper identity.

## What I found in the current backend (verified)

- There is **no** sync-log table. `public` holds only `model_pricing`, `model_pricing_per_million`, `profiles`, `strategies`, `strategy_shares`, `step_progress`, `user_roles`.
- `model_pricing` has **2,749 rows but only one distinct fetch day**: 2026-08-16.
- The scheduled job `sync-model-pricing-daily` (`0 6 * * *`) is **active but failing every night since Aug 17** — it calls `extensions.http_post`, which does not exist on this database. Every run since the first has errored.
- So today's honest ledger shows one filled day out of 371, and "last sync" is ~6 days ago.

You chose real data only, no invented history. That means the ledger launches almost empty and fills in over time — the page will say so honestly rather than faking density.

## Backend work

1. Create `pricing_sync_log` (run_at, status success/partial/failed, models_updated, models_checked, duration_ms, error_message) with an index on `run_at`, public read access for the anonymous role, and no public writes.
2. Repair the cron job: switch to `net.http_post`, and change the schedule from daily to **every 6 hours** (`0 */6 * * *`) so the headline claim is true.
3. Make the sync endpoint write exactly one `pricing_sync_log` row per attempt — including failures — so gaps in the grid reflect real gaps in coverage.
4. Backfill one historical row for the 2026-08-16 run that did succeed, derived from `model_pricing` itself. Nothing else is invented.
5. Trigger one sync immediately after the fix so the page opens with a fresh, green status line.

## Page build

Route: `src/routes/index.tsx` replaced. New light shell in `site-header.tsx` / `site-footer.tsx` / `__root.tsx`.

- **Nav** — `tokensavr` wordmark in Fraunces with `savr` in amber; links Pricing, Docs, Changelog; dark filled "Get your API key".
- **Status line** — mono row, green dot when the newest run succeeded within 6h plus a grace window, warning colour otherwise, plus "last sync X min ago". Reads live from `pricing_sync_log`.
- **Hero** — Fraunces headline "Every model's price, checked every six hours." capped near 600px, one plain-language Inter paragraph, amber "Start routing free" and outlined "View live sync log →".
- **Ledger card** — white card, hairline border, 12px radius, no shadow. Header: mono label `pricing sync ledger`, big Fraunces count of checks in the last year, and a mono hover readout of the hovered day's update count. 53×7 grid of ticket-stub cells (2px top / 3px bottom radius), five-step ramp from `#EFECE4` through amber to `#8A5A16`, buckets computed from the data's own distribution by percentile — not fixed thresholds. Mono month labels on top, Mon/Wed/Fri on the left, "fewer checks / more checks" legend bottom right.
- **Live sync feed** — mono `recent sync activity`, last 8 runs, hairline-separated rows, no card. Price deltas per model are not logged today, so notes render status + models updated/checked; the note formatter is written so per-model deltas drop in later without a rewrite.
- **Stat strip** — four borderless columns: models tracked (real count from `model_pricing`), sync interval, checks in the last year, sync uptime (successes ÷ attempts).

Copy is sentence case, active voice, no exclamation points, no round marketing numbers.

## Technical notes

- Fonts Fraunces / Inter / JetBrains Mono loaded via a `<link>` in `__root.tsx` (Tailwind v4 cannot `@import` a remote URL).
- The paper palette, amber accent, success/warning colours and the five ledger ramp steps become semantic tokens in `src/styles.css`; no hardcoded colour utilities in components. Light becomes the default theme for this shell.
- Reads go through a public server function using the publishable key against a narrow anonymous-read policy, primed in the route loader with `ensureQueryData` and consumed with `useSuspenseQuery`, so the ledger is server-rendered.
- Day grouping and percentile bucketing live in a small pure module with the query shaped exactly as specified (371-day window, ascending by `run_at`).
- Hover-only interactivity, opacity/background hover states, no scale or bounce.
- Route `head()` gets a TokenSavr-specific title, description and OG tags.

## Out of scope

Pricing, docs, dashboard, results and other existing pages keep their current look for now; only the shared nav and footer change. Retheming those pages is a follow-up.
