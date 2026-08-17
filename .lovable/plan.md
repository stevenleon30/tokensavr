# Secure the repo before making it public

## Current state
- `.gitignore` correctly ignores `.env` and `.env.*` (except `.env.example`).
- However, a real `.env` file was committed earlier and remains in Git history:
  - Commit `ee77d3e` first added `.env` with `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, and `VITE_SUPABASE_*` values.
  - Commit `5069ed8` still contains the same `.env`.
- No service-role key, `LOVABLE_API_KEY`, or `SYNC_PRICING_SECRET` was found in the history.

## What will be exposed if the repo goes public today
- Supabase project URL and project ID.
- Supabase anon/publishable key.

These are browser-facing keys, but publishing them in Git history still increases attack surface.

## Plan
1. **Purge `.env` from Git history**
   - Use `git-filter-repo` (or BFG Repo-Cleaner) to remove `.env` from all commits.
   - Force-push the rewritten history to GitHub.
   - This will rewrite commit hashes; any open PRs/branches will need rebasing.

2. **Rotate the exposed Supabase anon key**
   - Generate a new anon/public key in Lovable Cloud / Supabase.
   - Update the project secrets/runtime env so the app uses the new key.
   - Old key becomes invalid, neutralizing the exposed copy.

3. **Verify no secrets remain**
   - Re-run history search for `.env` and any key-like strings.
   - Confirm `.env.example` is the only env-related file in the repo and contains only placeholders.

4. **Flip the GitHub repo to public**
   - Only after steps 1–3 are complete.

## Risks / trade-offs
- Rewriting history changes commit hashes; anyone with local clones must re-clone or reset.
- Force-push is required to update the remote.
- Rotating the anon key is a breaking change for any external users/scripts relying on the old key, but that is the point.

## Decision needed
Approve this plan if you want me to proceed with the history purge and key rotation. If you prefer a lighter approach, I can instead document the exposure and leave the repo private.