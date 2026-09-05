# RAG Evidence API — contract for the frontend integration

The frontend calls its own proxy at `POST /api/evidence/search`, which in
turn calls your service at `${RAG_API_URL}/search`. Set `RAG_API_URL` in
`.env.local` (server-only, no `NEXT_PUBLIC_` prefix) once your service has
an address — until then, the proxy silently falls back to a small local demo
KB so the rest of the app keeps working.

## Request (from our proxy to your service)

```
POST {RAG_API_URL}/search
Content-Type: application/json

{ "query": "demam sudah 3 hari, apakah perlu diperiksa?", "top_k": 3 }
```

## Expected response

```json
{
  "results": [
    {
      "id": "source-id",
      "title": "...",
      "authors": "A, B, C",
      "year": 2023,
      "publisher": "...",
      "doi": "...",
      "url": "https://...",
      "abstract": "...",
      "source_type": "journal",
      "score": 0.87
    }
  ]
}
```

Only `title` and `abstract` (or `snippet`) are strictly required — everything
else is defaulted defensively on our side. `authors` may be a string or an
array of strings. `source_type` should be one of `journal`,
`systematic_review`, `clinical_guideline`, `authoritative_health_source`
(anything else falls back to `authoritative_health_source`).

If your service's response ends up shaped differently, ping us — the
adapter lives in one place ([lib/server/rag-client.ts](../lib/server/rag-client.ts) `normalizeResult()`)
and only that function needs to change, nothing else in the app.

## Behavior when unavailable

- `RAG_API_URL` unset → proxy always uses the local fallback KB.
- Request errors, non-2xx response, bad JSON, or takes longer than 5s →
  proxy silently falls back to the local KB (never throws to the caller).

## Where this is used

`app/api/evidence/search/route.ts` (our proxy) → `lib/server/rag-client.ts`
(`queryRagApi`) → your service. Called from the consultation flow in
`lib/health-ai.ts` (`generateAssistantTurn`).
