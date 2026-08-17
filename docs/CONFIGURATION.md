# Configuration & Secrets

TokenSavr reads all configuration from environment variables. Start from
`.env.example`:

```bash
cp .env.example .env
```

`.env` (and `.env.*`, `.dev.vars`) are git-ignored, so real keys never reach the
public repository.

## The two kinds of variables

| Prefix | Where it runs | Safe in a public repo? |
| --- | --- | --- |
| `VITE_*` | Bundled into the browser | Yes — publishable values only |
| everything else | Server only (SSR, server functions, API routes) | No — treat as passwords |

Rule of thumb: if a value must stay private, it must **not** have a `VITE_`
prefix. Anything prefixed `VITE_` is readable by every visitor via
`import.meta.env`; server-only values are read with `process.env` inside a
server function or route handler and are stripped from the client bundle.

## Variable reference

### Public (client-visible)

- `VITE_SUPABASE_URL` — backend API URL.
- `VITE_SUPABASE_PUBLISHABLE_KEY` — publishable/anon key. Safe to expose;
  access is enforced by row-level security policies, not by hiding this key.
- `VITE_SUPABASE_PROJECT_ID` — project reference id.

### Server-only mirrors

- `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_PROJECT_ID` — same
  values as above, used during server rendering and by public server functions
  (live pricing, sync status).

### Secrets

- `SUPABASE_SERVICE_ROLE_KEY` — full-access key that **bypasses row-level
  security**. Used only by privileged server-side helpers. Never import it into
  a component, never log it, never prefix it with `VITE_`.
- `LOVABLE_API_KEY` — authenticates AI strategy generation in
  `POST /api/generate-strategy`.
- `SYNC_PRICING_SECRET` — bearer token required by
  `POST /api/public/sync-model-pricing`. The daily scheduled pricing job sends
  it in an `Authorization: Bearer …` header. Generate with
  `openssl rand -hex 32`.

## Where secrets actually live

On Lovable, secrets are **not** stored in a committed `.env`. They live in the
project's secret store and are injected as environment variables at runtime, so
there is nothing key-bearing in the repo to protect. `.env.example` documents
the names and shapes only — it must never contain a real value.

Managed (Lovable Cloud) projects: the Supabase URL/keys and `LOVABLE_API_KEY`
are provisioned for you. The service-role key and database password are not
retrievable from the dashboard.

Self-hosting or running locally outside Lovable: put values in `.env`, or in
`.dev.vars` for the Cloudflare Worker dev runtime. In production, set them as
environment variables in your host's dashboard — never in a build artifact.

## Rotating a key

1. Issue a new value in the provider (or regenerate the shared secret).
2. Update the secret in the Lovable project settings, or in your host's env
   config for self-hosted deploys.
3. Update any external consumer that holds the same shared value — for
   `SYNC_PRICING_SECRET`, that means the scheduled sync job's `Authorization`
   header.
4. Revoke the old value.

## Checklist before pushing to a public repo

- `git status` shows no `.env`, `.env.local`, or `.dev.vars`.
- No secret is referenced with a `VITE_` prefix anywhere in `src/`.
- No secret appears in a `console.log`, an error message, or a value returned
  to the client from a server function.
- `.env.example` contains placeholders only.
- If a real key was ever committed, rotate it — deleting the file does not
  remove it from git history.
