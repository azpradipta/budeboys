import type { EvidenceReference, EvidenceSource, SourceType } from "@/lib/types";

/**
 * Proxy client for the team's RAG (evidence retrieval) service.
 *
 * ## Contract this expects from `RAG_API_URL`
 *
 * `POST {RAG_API_URL}/search`
 *
 * Request body:
 * ```json
 * { "query": "demam sudah 3 hari, apakah perlu diperiksa?", "top_k": 3 }
 * ```
 *
 * Expected response body:
 * ```json
 * {
 *   "results": [
 *     {
 *       "id": "source-id",
 *       "title": "...",
 *       "authors": "A, B, C" | ["A", "B", "C"],
 *       "year": 2023,
 *       "publisher": "...",
 *       "doi": "...",
 *       "url": "https://...",
 *       "abstract": "...",
 *       "source_type": "journal" | "systematic_review" | "clinical_guideline" | "authoritative_health_source",
 *       "score": 0.87
 *     }
 *   ]
 * }
 * ```
 *
 * Only `title` and `abstract` are strictly required — everything else is
 * defaulted defensively so small shape differences on the RAG team's side
 * don't break this. If the actual service ends up shaped differently,
 * adjust only `normalizeResult()` below — nothing else in the app needs to
 * change.
 *
 * This client is server-only (called from app/api/evidence/search/route.ts)
 * so `RAG_API_URL` never needs a `NEXT_PUBLIC_` prefix and is never exposed
 * to the browser.
 */

interface RawRagResult {
  id?: string;
  source_id?: string;
  title?: string;
  authors?: string | string[];
  year?: number;
  publication_year?: number;
  publisher?: string;
  doi?: string;
  url?: string;
  abstract?: string;
  snippet?: string;
  source_type?: string;
  score?: number;
}

const VALID_SOURCE_TYPES: SourceType[] = [
  "journal",
  "systematic_review",
  "clinical_guideline",
  "authoritative_health_source",
];

function normalizeResult(raw: RawRagResult, idx: number): EvidenceReference {
  const source: EvidenceSource = {
    source_id: raw.id ?? raw.source_id ?? `rag-${idx}`,
    title: raw.title ?? "Untitled",
    authors: Array.isArray(raw.authors) ? raw.authors.join(", ") : (raw.authors ?? "Unknown"),
    publication_year: raw.year ?? raw.publication_year ?? new Date().getFullYear(),
    publisher: raw.publisher ?? "Unknown",
    doi: raw.doi ?? "",
    abstract: raw.abstract ?? raw.snippet ?? "",
    url: raw.url ?? "",
    source_type: VALID_SOURCE_TYPES.includes(raw.source_type as SourceType)
      ? (raw.source_type as SourceType)
      : "authoritative_health_source",
  };
  return {
    source,
    snippet: raw.snippet ?? raw.abstract ?? "",
    score: typeof raw.score === "number" ? raw.score : 0.7,
  };
}

/** Returns null (never throws) when the RAG service is unset, unreachable,
 * or times out — callers should fall back to the local KB in that case. */
export async function queryRagApi(
  query: string,
  topK = 3
): Promise<EvidenceReference[] | null> {
  const baseUrl = process.env.RAG_API_URL;
  if (!baseUrl) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const res = await fetch(`${baseUrl.replace(/\/$/, "")}/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, top_k: topK }),
      signal: controller.signal,
    });
    if (!res.ok) return null;

    const data = (await res.json()) as { results?: RawRagResult[] };
    if (!Array.isArray(data.results)) return null;

    return data.results.map(normalizeResult);
  } catch {
    return null; // network error, timeout, bad JSON — fall back silently
  } finally {
    clearTimeout(timeout);
  }
}
