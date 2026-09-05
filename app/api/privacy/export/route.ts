import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { decryptFromStorage } from "@/lib/server/crypto";
import type { ConsultationSession, StoredPrescriptionRecord } from "@/lib/types";

/**
 * Unduh seluruh data milik pengguna sebagai satu file JSON (hak portabilitas
 * data). Isinya sudah didekripsi, jadi respons ini tidak boleh di-cache di
 * mana pun.
 */
export async function GET() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const [consultations, prescriptions] = await Promise.all([
    supabase.from("consultations").select("data").order("created_at", { ascending: false }),
    supabase.from("prescriptions").select("data").order("created_at", { ascending: false }),
  ]);

  const error = consultations.error ?? prescriptions.error;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Record-nya sudah membawa createdAt sendiri, jadi kolom timestamp di tabel
  // tidak perlu ikut diekspor.
  const payload = {
    exportedAt: new Date().toISOString(),
    account: { id: user.id, email: user.email },
    consultations: (consultations.data ?? []).map((row) =>
      decryptFromStorage(row.data as ConsultationSession, user.id)
    ),
    prescriptions: (prescriptions.data ?? []).map((row) =>
      decryptFromStorage(row.data as StoredPrescriptionRecord, user.id)
    ),
  };

  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="healthalk-data-${stamp}.json"`,
      "cache-control": "no-store, max-age=0",
    },
  });
}
