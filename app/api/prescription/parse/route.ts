import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { parsePrescriptionWithLLM } from "@/lib/server/prescription-parser";
import { parsePrescriptionText } from "@/lib/prescription-ai";

/** Raw OCR text → structured prescription items. LLM does the parsing
 * (see lib/server/prescription-parser.ts); falls back to a rule-based
 * parser when OpenAI is unavailable. Text only — no image involved. */
export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await req.json()) as { rawText?: string };
  const rawText = (body.rawText ?? "").trim();
  if (!rawText) return NextResponse.json({ error: "missing_text" }, { status: 400 });

  const viaLLM = await parsePrescriptionWithLLM(rawText);
  if (viaLLM) {
    return NextResponse.json({ items: viaLLM, source: "openai" });
  }
  return NextResponse.json({ items: parsePrescriptionText(rawText), source: "local_fallback" });
}
