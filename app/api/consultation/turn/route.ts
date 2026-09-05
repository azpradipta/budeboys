import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { queryHealthify } from "@/lib/server/healthify-client";
import {
  mapHealthifyContext,
  mapHealthifyEvidence,
  mapHealthifyIntent,
  mapHealthifyRisk,
  toHealthifyContext,
} from "@/lib/server/healthify-mapping";
import { detectSmallTalk, generateLocalTurn, smallTalkReply } from "@/lib/health-ai";
import type { HealthContext } from "@/lib/types";

/**
 * Satu giliran konsultasi. Healthify dicoba lebih dulu; bila tidak
 * dikonfigurasi atau gagal, generator lokal di lib/health-ai.ts yang menjawab
 * agar percakapan tetap jalan.
 *
 * Wajib login karena memanggil API pihak ketiga yang berbayar per request.
 */

interface TurnRequestBody {
  query: string;
  sessionId: string;
  healthContext: HealthContext;
  hasPriorContext: boolean;
  lastAssistantText?: string;
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

  // Basa-basi dijawab langsung tanpa retrieval dan tanpa memakai kuota
  // Healthify, jadi evidence hanya muncul saat memang ditanyakan.
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

  const result = await queryHealthify({
    query: body.query,
    sessionId: body.sessionId,
    healthContext: toHealthifyContext(body.healthContext),
  });

  if (result) {
    return NextResponse.json({
      text: result.answer,
      intent: mapHealthifyIntent(result.intent),
      evidence: mapHealthifyEvidence(result.evidence),
      risk: mapHealthifyRisk(result.safety),
      insufficientEvidence: result.evidence_status === "INSUFFICIENT_EVIDENCE",
      healthContext: mapHealthifyContext(result.health_context, body.healthContext),
      source: "healthify",
    });
  }

  const local = generateLocalTurn(
    body.query,
    body.healthContext,
    body.hasPriorContext,
    body.lastAssistantText ?? ""
  );
  return NextResponse.json({ ...local, source: "local_fallback" });
}
