import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { decryptFromStorage, encryptForStorage } from "@/lib/server/crypto";
import type { ConsultationSession } from "@/lib/types";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("consultations")
    .select("data")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const sessions = data.map((row) =>
    decryptFromStorage(row.data as ConsultationSession, user.id)
  );
  return NextResponse.json(sessions);
}

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await req.json()) as ConsultationSession;
  if (!body?.id) {
    return NextResponse.json({ error: "missing_id" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("consultations")
    .upsert({
      id: body.id,
      user_id: user.id,
      data: encryptForStorage(body, user.id),
      updated_at: new Date().toISOString(),
    })
    .select("data")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(
    decryptFromStorage(data.data as ConsultationSession, user.id),
    { status: 201 }
  );
}
