
The user is questioning whether collecting/storing the Anthropic API key in Settings makes sense. As I noted in my previous reply, this field is currently a non-functional placeholder — it's saved to localStorage but never read or sent to the backend. Strategy generation only uses the server-side `LOVABLE_API_KEY` via the Lovable AI Gateway.

So storing it serves no purpose today and is actively misleading. Three sensible directions:

## Recommendation

Remove the field. It collects sensitive-looking data, suggests functionality that doesn't exist, and adds support burden ("why isn't my key being used?"). If BYOK is wanted later, it should be wired through properly with multiple providers.

## Plan: Remove the unused API keys section

**File: `src/routes/settings.tsx`**

1. Delete the entire "API keys (optional)" `<Section>` block (the Anthropic input).
2. Remove `anthropicKey` state and its `useState`.
3. Remove the `localStorage.getItem("ts:anthropicKey")` read in the load effect.
4. Remove the `localStorage.setItem/removeItem("ts:anthropicKey")` writes in `onSave`.
5. Keep the calibration toggle's localStorage logic untouched — that one is actually wired up.

Net effect: the Settings page becomes shorter and honest. No backend or schema changes needed since the key was never persisted server-side.

## Alternative (only if you want BYOK to actually work)

If you'd rather keep the field and make it real, that's a bigger change:
- Add OpenAI key field alongside Anthropic
- Pass the chosen key from client → `/api/generate-strategy` (in a header, not the body)
- In the route handler, branch: if user key present, call Anthropic/OpenAI directly; otherwise use Lovable Gateway
- Add provider/model selector in the UI
- Document the security tradeoff (key in localStorage is readable by any XSS)

This is roughly a half-day of work versus a 2-minute deletion. I'd lean toward deletion unless you have users actively asking for BYOK.

## My suggestion

Go with the removal. It's the cleanest fix to the misleading UI, and we can revisit BYOK as a proper feature when there's real demand.
