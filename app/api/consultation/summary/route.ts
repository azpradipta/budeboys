import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { summarizeRagSession } from "@/lib/server/rag-client";
import { mapRagSummary } from "@/lib/server/rag-mapping";
import { generateSummary } from "@/lib/health-ai";
import type { ConsultationSession } from "@/lib/types";

// Ringkasan penutup konsultasi, RAG dulu lalu fallback ke generator lokal.
export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await req.json()) as { session: ConsultationSession };
  if (!body?.session?.id) {
    return NextResponse.json({ error: "missing_session" }, { status: 400 });
  }

  const ragSummary = await summarizeRagSession(body.session.id, true);
  if (ragSummary) {
    return NextResponse.json({
      summary: mapRagSummary(ragSummary),
      source: "rag",
    });
  }

  return NextResponse.json({ summary: generateSummary(body.session), source: "local_fallback" });
}
