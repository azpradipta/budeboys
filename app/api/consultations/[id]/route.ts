import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { decryptFromStorage, encryptForStorage } from "@/lib/server/crypto";
import type { ConsultationSession } from "@/lib/types";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("consultations")
    .select("data")
    .eq("id", id)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "not_found" }, { status: 404 });

  return NextResponse.json(decryptFromStorage(data.data as ConsultationSession, user.id));
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await req.json()) as ConsultationSession;
  if (body.id !== id) {
    return NextResponse.json({ error: "id_mismatch" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("consultations")
    .upsert({
      id,
      user_id: user.id,
      data: encryptForStorage(body, user.id),
      updated_at: new Date().toISOString(),
    })
    .select("data")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(decryptFromStorage(data.data as ConsultationSession, user.id));
}
