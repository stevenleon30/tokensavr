# Fill the empty space beside the sync ledger

The ledger grid only spans about two-thirds of the card, leaving a wide blank column on the right. Plan: turn that space into a compact metrics rail fed by data already available server-side.

## Layout

```text
+-----------------------------------------------------------+
| pricing sync ledger            | LEDGER RAIL              |
| 2,749                          | last sync   2h ago       |
| price checks in the last year   | streak      41 days     |
|                                | busiest day 1,204 checks |
| [ ][ ][ ][ ][ ][ ][ ]  ...     | providers   7 tracked    |
| [ ][ ][ ][ ][ ][ ][ ]  ...     | price moves 18 (30d)     |
|                                | ------------------------ |
| fewer -> more checks           | hover readout / day info |
+-----------------------------------------------------------+
```

On mobile the rail stacks under the grid as a 2-column mini stat block.

## Metrics in the rail

1. **Last sync** — relative time of the newest run, plus next-run estimate from the 6h interval.
2. **Sync streak** — consecutive days with at least one successful run (from ledger days).
3. **Busiest day** — highest single-day check count and its date.
4. **Providers tracked** — distinct providers in the pricing table (new count, cheap query).
5. **Price moves (30d)** — models whose price changed in the last 30 days (rows with recent `updated_at`).
6. **Median input price** — median input cost per 1M tokens across tracked models, as a market-level anchor.

The hover readout for a day moves into the rail's lower slot so hovering fills the space instead of leaving a floating line of text.

## Technical notes

- Extend `getSyncLedger` in `src/lib/sync-ledger.functions.ts` to also return `providersTracked`, `priceMoves30d`, `medianInputPer1M`, and `lastSyncAt`; all are `model_pricing` / `pricing_sync_log` aggregates read with the existing admin client, so no new client-readable policies.
- Add pure helpers in `src/lib/sync-ledger.ts`: `syncStreakDays(days)` and `busiestDay(days)` derived from the existing `buildLedger` output.
- `src/components/pricing-sync-ledger.tsx`: wrap content in a `lg:grid-cols-[1fr_220px]` grid, add a `RailStat` subcomponent (mono label, tabular-nums value), keep the existing type scale, colors, and 11px cell system unchanged.
- `src/routes/index.tsx` passes the new fields through; stat strip below stays as-is (no duplicated metrics — "models tracked" and "checks in the last year" stay there, the rail uses different ones).
