# Healthify Intelligence API integration

The consultation feature (Phase 1) is grounded by the team's **Healthify
Intelligence API** — real RAG over peer-reviewed journal literature, with
verified DOIs. Docs: https://healthify.twenti.studio/docs

## Setup

1. On the docs page, click **Request API access**, describe the app and
   expected volume, and you'll get a key like `ht_live_xxxxxxxx`.
2. Put it in `.env.local` (server-only — never `NEXT_PUBLIC_`):

   ```
   HEALTHIFY_API_KEY=ht_live_xxxxxxxx
   HEALTHIFY_API_BASE_URL=https://healthify.twenti.studio
   ```

3. Restart the dev server. That's it — the app switches from the local
   rule-based fallback to the real API automatically.

Until a key is set, everything still works: the routes below fall back to
the local rule-based logic + demo KB in `lib/health-ai.ts` / `lib/kb.ts`.

## How it's wired

| Our route | Calls Healthify | Fallback |
|---|---|---|
| `POST /api/consultation/turn` | `POST /api/v1/intelligence/query` (`mode: consultation`, `format: full`) | `generateLocalTurn()` |
| `POST /api/consultation/summary` | `POST /api/v1/intelligence/summary` | `generateSummary()` |

- `lib/server/healthify-client.ts` — the HTTP client. Returns `null` (never
  throws) on any failure so callers fall back cleanly.
- `lib/server/healthify-mapping.ts` — the only place that knows Healthify's
  field names vs ours. If their shape changes, edit only this file.
- Our consultation id (`cons_xxxx`) is reused directly as Healthify's
  `context.session_id`, so multi-turn context accumulation is handled by
  Healthify server-side across a whole consultation.

## Notes from their docs we honor

- **Never build `https://doi.org/{doi}` ourselves** — we only render a
  source link when Healthify returns a validated `url`.
- **`notice` / `has_evidence: false` / safety flags** — mapped onto our
  `RiskLevel` + `insufficientEvidence` + emergency response text.
- **Latency 2-10s** — the turn route awaits it directly (fine for a
  hackathon); the UI already shows a "thinking" state during the wait.
- Rate limit is 60 req/min **per key, shared across all app users** — which
  is why `/api/consultation/*` require auth.
