# Make accounts optional — zero-friction pricing and strategy

Short answer: no, you don't need login for the core value. Comparing prices and generating a strategy can be fully anonymous. Accounts stay, but only as an upgrade ("save this, track progress, share it"), never a gate.

## What changes for visitors

- Landing page: typing an idea and pressing "Generate My Strategy" goes straight to generation. No detour to sign-up.
- Pricing page and docs/tips: unchanged, already public.
- Results page: full dashboard, cost breakdown, and copy/export work signed out. The strategy lives in browser storage for that session.
- Signed-out results show one soft banner: "Create a free account to save this strategy, track your progress, and share it" — dismissible, never blocking.
- Sharing and step-progress checkboxes are the only features that ask for an account, and they ask inline at the moment of use.
- Dashboard and settings stay account-only (there's nothing to show without one), and the header links to them only when signed in.

## Current gate being removed

The landing form currently redirects anyone without an account to `/auth` with the idea stashed, then bounces back to `/generate`. That's the single hard blocker; generation itself already works without an account.

## Technical notes

- `src/routes/index.tsx`: drop the `if (!user)` branch in `onSubmit`; always navigate to `/generate` with the idea. Keep `useAuth` only if still needed for other UI.
- `src/routes/generate.tsx`: no behavior change needed — it already saves to `sessionStorage` and only writes to `strategies` when a user exists. Reword the existing footnote as a soft value prompt.
- `src/routes/results.tsx`: verify every read path tolerates `user === null` (progress upsert, share, saved-strategy fetch) and replaces those controls with inline sign-in CTAs instead of erroring or hiding the whole card.
- `src/routes/auth.tsx`: keep the `redirect`/`idea` search params so an account created mid-flow still returns to the right place.
- No database or RLS changes. `strategies` and `step_progress` remain user-scoped; anonymous strategies simply aren't persisted.
- Admin pricing sync (`/pricing-sync`) keeps its role check unchanged.
