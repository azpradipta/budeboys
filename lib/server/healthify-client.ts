/**
 * Client Healthify Intelligence API (https://healthify.twenti.studio/docs):
 * intent, ekstraksi konteks, retrieval literatur ber-DOI, penyusunan jawaban,
 * dan safety check dalam satu panggilan.
 *
 * Butuh HEALTHIFY_API_KEY. Mengembalikan null (bukan throw) agar pemanggil
 * bisa fallback ke lib/health-ai.ts.
 */

const BASE_URL = (process.env.HEALTHIFY_API_BASE_URL || "https://healthify.twenti.studio").replace(
  /\/+$/,
  ""
);

function isConfigured(): boolean {
  return Boolean(process.env.HEALTHIFY_API_KEY);
}

export interface HealthifyHealthContext {
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

export interface HealthifyEvidence {
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

export interface HealthifySafetyFlag {
  code: string;
  severity: "info" | "warning" | "critical";
  message: string;
}

export interface HealthifyQueryResult {
  answer: string;
  intent: string;
  mode: string;
  conversation_id: string | null;
  health_context: HealthifyHealthContext;
  evidence: HealthifyEvidence[];
  evidence_status: "SUFFICIENT" | "PARTIAL" | "INSUFFICIENT_EVIDENCE";
  uncertainty: string | null;
  safety: { decision: "PASS" | "MODIFY" | "BLOCK"; flags: HealthifySafetyFlag[] };
  preliminary_assessment: {
    urgency: "routine" | "elevated" | "emergency";
    recommended_next_step: string[];
  } | null;
  request_id?: string | null;
}

/** Satu giliran percakapan. Id konsultasi kita dipakai langsung sebagai
 * `session_id` Healthify, yang dibuat atau dilanjutkan otomatis. */
export async function queryHealthify(params: {
  query: string;
  sessionId: string;
  healthContext?: Partial<HealthifyHealthContext>;
}): Promise<HealthifyQueryResult | null> {
  if (!isConfigured()) {
    console.warn(
      "[healthify] HEALTHIFY_API_KEY not set, using local fallback. " +
        "Add it to .env.local and restart `npm run dev`."
    );
    return null;
  }

  const controller = new AbortController();
  // Healthify meminta timeout minimal 30 detik. Respons normal 2-10 detik,
  // tapi retrieval, verifikasi DOI, dan LLM bisa jauh lebih lama.
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const res = await fetch(`${BASE_URL}/api/v1/intelligence/query`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": process.env.HEALTHIFY_API_KEY!,
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
        `[healthify] query ${res.status} ${res.statusText}, using local fallback. ${detail.slice(0, 300)}`
      );
      return null;
    }
    return (await res.json()) as HealthifyQueryResult;
  } catch (err) {
    console.warn(
      `[healthify] query request failed (${
        err instanceof Error ? err.message : String(err)
      }), using local fallback.`
    );
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export interface HealthifySummaryField<T = string> {
  value: T | null;
  provenance: "USER_REPORTED" | "AI_INFERRED" | "EVIDENCE_SUPPORTED" | "SYSTEM_GENERATED";
  detail: string | null;
}

export interface HealthifySummary {
  session_id: string;
  chief_complaint: HealthifySummaryField | null;
  symptoms: HealthifySummaryField[];
  duration: HealthifySummaryField | null;
  relevant_information: HealthifySummaryField[];
  preliminary_assessment: HealthifySummaryField | null;
  evidence_discussed: { title: string; doi: string | null }[];
  recommended_next_step: HealthifySummaryField[];
  safety_notes: HealthifySummaryField[];
  health_context: HealthifyHealthContext;
}

export async function summarizeHealthifySession(
  sessionId: string,
  closeSession = true
): Promise<HealthifySummary | null> {
  if (!isConfigured()) return null;

  try {
    const res = await fetch(`${BASE_URL}/api/v1/intelligence/summary`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": process.env.HEALTHIFY_API_KEY!,
      },
      body: JSON.stringify({ session_id: sessionId, close_session: closeSession }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.warn(
        `[healthify] summary ${res.status} ${res.statusText}, using local fallback. ${detail.slice(0, 300)}`
      );
      return null;
    }
    const data = (await res.json()) as { summary: HealthifySummary };
    return data.summary;
  } catch (err) {
    console.warn(
      `[healthify] summary request failed (${
        err instanceof Error ? err.message : String(err)
      }), using local fallback.`
    );
    return null;
  }
}
