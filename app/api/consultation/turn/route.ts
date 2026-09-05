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
 * One turn of a consultation (docs/prd.md Section 14 pipeline). Tries the
 * real Healthify Intelligence API first; if it's unconfigured, unreachable,
 * or errors, falls back to the local rule-based generator in
 * lib/health-ai.ts so the conversation can still continue.
 *
 * Requires auth — this calls a rate-limited, paid-per-request third-party
 * API, shared across every user of the app.
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

  // Social / non-substantive turns ("terima kasih", "oke", "halo") get a
  // natural reply without running retrieval or spending a Healthify call —
  // the conversation stays two-way, evidence only shows up when asked.
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
