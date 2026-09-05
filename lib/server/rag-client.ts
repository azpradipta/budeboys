// Client RAG API (https://ragai.twenti.studio/docs).
// Selalu mengembalikan null saat gagal agar pemanggil bisa fallback.

const BASE_URL = (process.env.RAG_API_BASE_URL || "https://ragai.twenti.studio").replace(
  /\/+$/,
  ""
);

function isConfigured(): boolean {
  return Boolean(process.env.RAG_API_KEY);
}

export interface RagHealthContext {
  chief_complaint: string | null;
  symptoms: string[];
  duration: string | null;
  severity: string | null;
  onset: string | null;
  progression: string | null;
  associated_symptoms: string[];
  medications: string[];
  allergies: string[];
  relevant_history: string[];
  provenance?: Record<string, string>;
}

export interface RagEvidence {
  source_id: string;
  chunk_id: string;
  title: string;
  doi: string | null;
  url: string | null;
  publisher: string | null;
  published_year: number | null;
  source_type: string;
  relevance: number;
  snippet: string;
  origin: string;
  doi_verified: boolean;
  link_status: string;
}

export interface RagSafetyFlag {
  code: string;
  severity: "info" | "warning" | "critical";
  message: string;
}

export interface RagQueryResult {
  answer: string;
  intent: string;
  mode: string;
  conversation_id: string | null;
  health_context: RagHealthContext;
  evidence: RagEvidence[];
  evidence_status: "SUFFICIENT" | "PARTIAL" | "INSUFFICIENT_EVIDENCE";
  uncertainty: string | null;
  safety: { decision: "PASS" | "MODIFY" | "BLOCK"; flags: RagSafetyFlag[] };
  preliminary_assessment: {
    urgency: "routine" | "elevated" | "emergency";
    recommended_next_step: string[];
  } | null;
  request_id?: string | null;
}

// Satu giliran percakapan. Id konsultasi kita dipakai sebagai session_id RAG.
export async function queryRag(params: {
  query: string;
  sessionId: string;
  healthContext?: Partial<RagHealthContext>;
}): Promise<RagQueryResult | null> {
  if (!isConfigured()) {
    console.warn(
      "[rag] RAG_API_KEY not set, using local fallback. " +
        "Add it to .env.local and restart `npm run dev`."
    );
    return null;
  }

  const controller = new AbortController();
  // RAG meminta timeout minimal 30 detik.
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const res = await fetch(`${BASE_URL}/api/v1/intelligence/query`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": process.env.RAG_API_KEY!,
      },
      body: JSON.stringify({
        query: params.query,
        mode: "consultation",
        context: {
          session_id: params.sessionId,
          health_context: params.healthContext,
        },
        options: { format: "full", max_evidence: 5, language: "id" },
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.warn(
        `[rag] query ${res.status} ${res.statusText}, using local fallback. ${detail.slice(0, 300)}`
      );
      return null;
    }
    return (await res.json()) as RagQueryResult;
  } catch (err) {
    console.warn(
      `[rag] query request failed (${
        err instanceof Error ? err.message : String(err)
      }), using local fallback.`
    );
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export interface RagSummaryField<T = string> {
  value: T | null;
  provenance: "USER_REPORTED" | "AI_INFERRED" | "EVIDENCE_SUPPORTED" | "SYSTEM_GENERATED";
  detail: string | null;
}

export interface RagSummary {
  session_id: string;
  chief_complaint: RagSummaryField | null;
  symptoms: RagSummaryField[];
  duration: RagSummaryField | null;
  relevant_information: RagSummaryField[];
  preliminary_assessment: RagSummaryField | null;
  evidence_discussed: { title: string; doi: string | null }[];
  recommended_next_step: RagSummaryField[];
  safety_notes: RagSummaryField[];
  health_context: RagHealthContext;
}

export async function summarizeRagSession(
  sessionId: string,
  closeSession = true
): Promise<RagSummary | null> {
  if (!isConfigured()) return null;

  try {
    const res = await fetch(`${BASE_URL}/api/v1/intelligence/summary`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": process.env.RAG_API_KEY!,
      },
      body: JSON.stringify({ session_id: sessionId, close_session: closeSession }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.warn(
        `[rag] summary ${res.status} ${res.statusText}, using local fallback. ${detail.slice(0, 300)}`
      );
      return null;
    }
    const data = (await res.json()) as { summary: RagSummary };
    return data.summary;
  } catch (err) {
    console.warn(
      `[rag] summary request failed (${
        err instanceof Error ? err.message : String(err)
      }), using local fallback.`
    );
    return null;
  }
}
