import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { queryRag } from "@/lib/server/rag-client";
import {
  mapRagContext,
  mapRagEvidence,
  mapRagIntent,
  mapRagRisk,
  toRagContext,
} from "@/lib/server/rag-mapping";
import { generateAgentTurn } from "@/lib/server/consultation-agent";
import { detectSmallTalk, generateLocalTurn, smallTalkReply } from "@/lib/health-ai";
import type { HealthContext } from "@/lib/types";

// Satu giliran konsultasi. Urutan: basa-basi, lalu RAG (evidence),
// lalu agen OpenAI (paham keluhan apa pun), lalu generator rule-based.
// Wajib login karena memanggil API pihak ketiga yang berbayar per request.

interface TurnRequestBody {
  query: string;
  sessionId: string;
  healthContext: HealthContext;
  hasPriorContext: boolean;
  lastAssistantText?: string;
  history?: { role: "user" | "assistant"; text: string }[];
}

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await req.json()) as TurnRequestBody;
  if (!body?.query?.trim()) {
    return NextResponse.json({ error: "missing_query" }, { status: 400 });
  }

  // Basa-basi dijawab langsung, tanpa retrieval dan tanpa memakai kuota RAG.
  const social = detectSmallTalk(body.query);
  if (social) {
    return NextResponse.json({
      text: smallTalkReply(social),
      intent: "NON_MEDICAL",
      evidence: [],
      risk: "LOW_RISK",
      insufficientEvidence: false,
      healthContext: body.healthContext,
      source: "smalltalk",
    });
  }

  const result = await queryRag({
    query: body.query,
    sessionId: body.sessionId,
    healthContext: toRagContext(body.healthContext),
  });

  if (result) {
    const risk = mapRagRisk(result.safety);
    // Pakai RAG hanya bila jawabannya benar-benar berlandasan evidence
    // dan masih dalam cakupannya; sinyal darurat selalu diprioritaskan.
    // Selain itu, keluhan sehari-hari yang tak tercakup literatur (sakit gigi,
    // kaki pegal, radang gusi) diserahkan ke agen OpenAI di bawah.
    const grounded =
      result.answer?.trim().length > 0 &&
      result.evidence.length > 0 &&
      result.intent !== "UNSUPPORTED";

    if (grounded || risk === "EMERGENCY_SIGNAL") {
      return NextResponse.json({
        text: result.answer,
        intent: mapRagIntent(result.intent),
        evidence: mapRagEvidence(result.evidence),
        risk,
        insufficientEvidence: result.evidence_status === "INSUFFICIENT_EVIDENCE",
        healthContext: mapRagContext(result.health_context, body.healthContext),
        source: "rag",
      });
    }
  }

  const agentTurn = await generateAgentTurn({
    query: body.query,
    healthContext: body.healthContext,
    history: body.history ?? [],
    lastAssistantText: body.lastAssistantText ?? "",
  });
  if (agentTurn) {
    return NextResponse.json({ ...agentTurn, source: "openai" });
  }

  const local = generateLocalTurn(
    body.query,
    body.healthContext,
    body.hasPriorContext,
    body.lastAssistantText ?? ""
  );
  return NextResponse.json({ ...local, source: "local_fallback" });
}
