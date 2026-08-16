# Fix: bounced to sign-in when returning to the dashboard

## What's happening

The dashboard doesn't check the session on the server — it renders, then a
client-side effect redirects to `/auth` as soon as it sees "not loading, no user".

In the auth provider, `loading` is set to `false` by whichever fires first:
the auth-state listener or the stored-session lookup. The listener can fire
with an empty session before the stored session has been read back, so the
dashboard briefly sees "signed out" and navigates away — the user lands on
`/auth` even though the session is still valid.

## The fix

1. **Settle the session before reporting "signed out"**
   - Only clear `loading` after the stored-session lookup resolves.
   - Ignore early listener events that carry no session while that lookup is
     still in flight; keep updating on real sign-in / sign-out / token refresh.
   - Track this with a ref so late events can't flip the state back.

2. **Make the dashboard guard patient**
   - Render a lightweight loading state while auth is unsettled instead of
     redirecting.
   - Redirect to `/auth` only once the session is confirmed absent.

3. **Keep the return trip intact**
   - When the dashboard does redirect, pass `redirect: "/dashboard"` so signing
     in returns the user to the dashboard rather than dumping them elsewhere.

## Technical notes

- Files: `src/lib/auth.tsx` (add a `settled` ref, gate `setLoading(false)` on
  `getSession()`), `src/routes/dashboard.tsx` (loading branch + guard
  condition), `src/routes/auth.tsx` (honor a `/dashboard` redirect param).
- No schema, policy, or data changes; purely client session-state handling.
- Verification: sign in, navigate away to another page, return to the
  dashboard, and hard-refresh `/dashboard` — no bounce to `/auth` in either case.
