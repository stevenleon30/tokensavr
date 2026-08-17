# Homepage hero: arched fan of platform cards

Replace the current centered hero with an arched fan of tall rounded cards — one per LLM/vibe-coding platform — instead of the people cards in the reference. Everything below the hero (How it works, Tips teaser, logo strip) stays as is.

## What it looks like

```text
        Stop burning credits.
        Start building smart.
      [ idea input + Generate ]

   ╭─╮ ╭─╮ ╭─╮ ╭─╮ ╭─╮ ╭─╮ ╭─╮
   │L│ │C│ │G│ │U│ │W│ │B│ │R│      <- tall portrait cards, fanned in an arc
   ╰─╯ ╰─╯ ╰─╯ ╰─╯ ╰─╯ ╰─╯ ╰─╯         outer cards rotated & pushed down
```

- Each card: platform logo tile, platform name, and a one-word cost hint (e.g. "cheapest planner", "best builder").
- Cards fan symmetrically: center card upright and tallest, outer cards rotated a few degrees and offset downward, with a slight z-order overlap.
- Hover lifts a card out of the arc (straightens rotation, raises it, adds shadow/glow).
- Selected card stays lifted with an accent ring so the choice is obvious.

## Interaction

- Clicking a card preselects that platform. The selection is passed to `/generate` alongside the idea via the existing `platforms` search param, so the generate flow starts with that platform checked.
- Multiple cards can be toggled on/off (the generate route already accepts a platform list).
- Submitting with no cards selected behaves exactly as today.

## Responsive

- Desktop: full arc of all 10 platforms.
- Tablet: arc flattens, cards shrink, two rows if needed.
- Mobile: horizontal scroll-snap rail of the same cards, no rotation, so nothing clips.

## Technical notes

- New component `src/components/platform-fan.tsx`: takes the platform list, `selected` ids, and an `onToggle` callback; computes rotation/offset per index from the array length so the arc stays balanced.
- Reuse `PLATFORM_LIST` and the existing logo map. The logo map currently lives inline in `src/components/platform-badge.tsx` — extract it to `src/lib/platform-logos.ts` so both the badge and the fan import it.
- `src/routes/index.tsx`: hold `selected` platform state next to the existing `idea` state, render `<PlatformFan />` under the form, and include `platforms: selected.join(",")` in the `navigate` search when non-empty.
- Card visuals use existing semantic tokens (`bg-card`, `border-border`, `shadow-card`, `shadow-elegant`, `bg-gradient-primary` for the selected ring) — no new hardcoded colors. Brand color per platform comes from `PLATFORMS[id].color`, used only as a subtle accent glow.
- Rotation/translate via Tailwind arbitrary values in inline style; hover/lift transitions use CSS transitions (no new animation dependency).
- The existing "Optimizes across" inline platform row under the form is removed, since the fan replaces it.
- Keeps current head metadata and the auth-optional generate flow untouched.
