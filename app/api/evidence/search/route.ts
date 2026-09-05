import { NextRequest, NextResponse } from "next/server";
import { queryRagApi } from "@/lib/server/rag-client";
import { searchEvidence } from "@/lib/kb";

/**
 * Evidence retrieval endpoint used by Phase 1 (docs/prd.md Section 14-19).
 * Tries the team's real RAG service first (see lib/server/rag-client.ts for
 * the expected contract); if `RAG_API_URL` isn't set, or the service is
 * unreachable/times out, falls back to the local demo KB so a consultation
 * can still be completed end-to-end (PRD Section 49 Availability: "harus
 * tetap dapat menyelesaikan journey apabila salah satu non-critical feature
 * gagal").
 */
export async function POST(req: NextRequest) {
  const body = (await req.json()) as { query?: string };
  const query = body.query?.trim();
  if (!query) {
    return NextResponse.json({ error: "missing_query" }, { status: 400 });
  }

  const ragResult = await queryRagApi(query);
  if (ragResult !== null) {
    return NextResponse.json({ evidence: ragResult, source: "rag" });
  }

  const fallback = searchEvidence(query);
  return NextResponse.json({ evidence: fallback, source: "local_fallback" });
}
