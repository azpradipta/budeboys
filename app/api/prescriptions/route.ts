import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { decryptFromStorage, encryptForStorage } from "@/lib/server/crypto";
import type { PrescriptionRecord, StoredPrescriptionRecord } from "@/lib/types";

/** The server never stores the raw prescription image — only the OCR'd
 * structured fields. Always add back `imageDataUrl: null` for the client's
 * PrescriptionRecord shape. */
function toClientShape(record: StoredPrescriptionRecord): PrescriptionRecord {
  return { ...record, imageDataUrl: null };
}

export async function GET(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const consultationId = req.nextUrl.searchParams.get("consultationId");
  let query = supabase.from("prescriptions").select("data").order("created_at", { ascending: false });
  if (consultationId) query = query.eq("consultation_id", consultationId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const records = data.map((row) =>
    toClientShape(decryptFromStorage(row.data as StoredPrescriptionRecord))
  );
  return NextResponse.json(records);
}

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await req.json()) as PrescriptionRecord;
  if (!body?.id || !body?.consultationId) {
    return NextResponse.json({ error: "missing_id_or_consultationId" }, { status: 400 });
  }

  const { imageDataUrl, ...toStore } = body;
  void imageDataUrl; // never persisted server-side — raw image stays client-only

  const { data, error } = await supabase
    .from("prescriptions")
    .upsert({
      id: body.id,
      user_id: user.id,
      consultation_id: body.consultationId,
      data: encryptForStorage(toStore),
      updated_at: new Date().toISOString(),
    })
    .select("data")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(
    toClientShape(decryptFromStorage(data.data as StoredPrescriptionRecord)),
    { status: 201 }
  );
}
