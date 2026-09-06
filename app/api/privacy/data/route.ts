import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/** Menghapus seluruh konsultasi dan resep milik pengguna; akunnya sendiri tidak
 * ikut. Resep dihapus eksplisit lebih dulu, walau sudah `on delete cascade`,
 * agar kegagalannya terlihat sebagai error. */
export async function DELETE() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const prescriptions = await supabase
    .from("prescriptions")
    .delete({ count: "exact" })
    .eq("user_id", user.id);
  if (prescriptions.error) {
    return NextResponse.json({ error: prescriptions.error.message }, { status: 500 });
  }

  const consultations = await supabase
    .from("consultations")
    .delete({ count: "exact" })
    .eq("user_id", user.id);
  if (consultations.error) {
    return NextResponse.json({ error: consultations.error.message }, { status: 500 });
  }

  return NextResponse.json({
    deletedConsultations: consultations.count ?? 0,
    deletedPrescriptions: prescriptions.count ?? 0,
  });
}
