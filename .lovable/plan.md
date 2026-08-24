# Make the sync grid actually show activity

## What the data says

- `pricing_sync_log` contains exactly **1 row**, from Aug 16. That single day is the only shaded square — everything else is empty because there is no logged history, not because the grid is styled wrong.
- The scheduled job **is** running: 4 successful cron invocations, the latest at Aug 24 00:00 UTC, and the endpoint responded `200 {"ok":true,"openrouter":422,"litellm":2390,"manual":6}`.
- So the sync works and prices are refreshed, but the run is not being recorded in `pricing_sync_log`. The insert is wrapped in a try/catch that only logs to console, so it fails silently. Exact cause is unconfirmed — most likely the published deployment the cron calls cannot write that table (missing/incorrect service credentials in that environment, so the write is refused by row-level security).

## Plan

1. **Confirm the write failure first.** Call the endpoint and inspect the server logs for the "failed to write pricing_sync_log row" message and its error, then verify a row appears. No further work is guessed on top of an unverified cause.
2. **Fix logging so every run records.** Make the log insert surface its error in the response payload (e.g. `logged: true|false` plus the error) instead of swallowing it, and correct whatever blocks the write so each 6-hourly run adds a row. From then on the grid gains ~4 checks/day, ~1 square per day.
3. **Backfill real history from the pricing data itself.** `model_pricing` carries `fetched_at` / `updated_at` per model, so past refresh days can be reconstructed and inserted as historical ledger rows. This fills the grid with genuine activity rather than invented numbers, and nothing is fabricated for days with no evidence.
4. **Make the empty window less of a void.** Add a window switch on the ledger — `12 weeks` (default when history is thin) / `1 year` — so a young dataset reads as dense recent activity instead of a year of blank squares. The heading count follows the selected window.
5. **Include per-run intensity.** Since there are 4 runs/day, shade each day by total models checked that day (already the level logic) and show the run count in the hover readout, so a day with 4 runs looks visibly stronger than a day with 1.

## Technical notes

- `src/routes/api/public/sync-model-pricing.ts`: return the log-insert outcome; keep the always-log-one-row contract for success and failure.
- Backfill via a one-off SQL migration that derives distinct refresh timestamps from `model_pricing` and inserts matching `pricing_sync_log` rows with a status marking them as reconstructed.
- `src/lib/sync-ledger.ts`: make `LEDGER_DAYS` a parameter so `buildLedger`/`toWeeks`/`monthLabels` can render 84 days or 371 days.
- `src/components/pricing-sync-ledger.tsx`: add the window toggle (mono pill buttons matching the existing style), keep the 11px cell system and colors unchanged; larger cells for the 12-week view so the grid still fills the card width.
- `src/lib/sync-ledger.functions.ts` and `src/routes/index.tsx`: pass the window through and keep the stat strip numbers consistent with the selected range.
