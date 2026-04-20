

## Plan: Add 5 new platforms (Replit Agent, Windsurf, Claude Code, GitHub Copilot, Gemini)

### 1. Logos (`src/assets/logos/`)
Add 5 new SVG files using each brand's recognizable mark in a square viewBox, designed to render cleanly inside the existing white rounded tile in `PlatformBadge`:
- `replit.svg` — Replit orange "play" hexagon mark
- `windsurf.svg` — Windsurf teal wave/sail mark
- `claude-code.svg` — Claude sunburst with a small terminal `>_` glyph to differentiate from regular Claude
- `copilot.svg` — GitHub Copilot dual-loop mark
- `gemini.svg` — Google Gemini four-point sparkle gradient

All hand-authored as compact inline SVGs (no external fetches, no fonts).

### 2. `src/lib/platforms.ts`
Extend `PlatformId` union and `PLATFORMS` map with 5 new entries:

| id | name | color | initial |
|---|---|---|---|
| `replit` | Replit | oklch(0.70 0.18 35) orange | R |
| `windsurf` | Windsurf | oklch(0.72 0.13 195) teal | W |
| `claudecode` | Claude Code | oklch(0.68 0.16 38) (matches Claude family) | C |
| `copilot` | GitHub Copilot | oklch(0.78 0.04 270) light gray | G |
| `gemini` | Gemini | oklch(0.70 0.16 250) blue | G |

`getPlatform()` already normalizes via `replace(/[^a-z0-9]/g, "")`, so inputs like "Claude Code", "GitHub Copilot", "Replit Agent" map cleanly to `claudecode`, `githubcopilot`… one wrinkle: "GitHub Copilot" normalizes to `githubcopilot`, not `copilot`. I'll use `githubcopilot` as the id to match. Same for `replitagent` vs `replit` — I'll use `replit` as id since the AI may emit either "Replit" or "Replit Agent"; we'll add a tiny alias step in `getPlatform` that strips a trailing "agent" suffix before lookup so both forms resolve.

### 3. `src/components/platform-badge.tsx`
- Import the 5 new SVGs.
- Extend `LOGO_MAP` with entries for `replit`, `windsurf`, `claudecode`, `githubcopilot`, `gemini`.

### 4. `src/routes/tips.tsx`
- Add the 5 new ids to `PLATFORM_FILTERS` so users can filter by them.
- Add 2 starter tips per platform (10 new tips total), following the existing tone (concrete tactic + example):
  - **Replit Agent**: (a) Use Checkpoints to roll back instead of re-prompting fixes; (b) Keep the file tree small — Agent re-reads context each turn.
  - **Windsurf**: (a) Use Cascade's Write mode for surgical edits, Chat for planning; (b) Trim `.windsurfrules` — every line ships every turn.
  - **Claude Code**: (a) Use `/clear` between unrelated tasks to drop context cost; (b) Prefer `Read`+targeted `Edit` over re-pasting whole files into prompts.
  - **GitHub Copilot**: (a) Use inline completions for boilerplate, Chat only for non-obvious logic; (b) Scope `@workspace` queries with file globs to cut context size.
  - **Gemini**: (a) Use Gemini Flash for summarization/classification, Pro only for hard reasoning; (b) Move long reference docs into a single uploaded file rather than pasting into each prompt.

### 5. AI strategy generator (`src/routes/api.generate-strategy.ts`)
Update the system prompt's opening line to mention the new platforms so the model knows it can recommend them. One-line change:
> "…AI coding platforms (Lovable, Claude, Cursor, ChatGPT, Bolt, v0, **Replit Agent, Windsurf, Claude Code, GitHub Copilot, Gemini**)."

No schema changes — `platforms` already accepts arbitrary string ids up to length 40.

### Out of scope (can do next)
- Surfacing the new platforms in any user-facing platform picker UI on `/generate` (haven't checked if that screen has a fixed list — will verify and follow up if it needs wiring).
- Categorization/grouping ("App builders", "IDE agents", etc.) — separate change.

