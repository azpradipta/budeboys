import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { explainMedication } from "@/lib/server/medication-explainer";
import { getMedicationInfo } from "@/lib/prescription-ai";
import type { MedicationInfo, PrescriptionItem } from "@/lib/types";

/** Penjelasan obat untuk item resep yang sudah diverifikasi. OpenAI dulu
 * (khasiat umum, tanpa saran dosis), lalu fallback per item ke drug KB
 * lokal. Wajib login karena memanggil API berbayar. */
export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await req.json()) as { items: PrescriptionItem[] };
  if (!Array.isArray(body?.items) || body.items.length === 0) {
    return NextResponse.json({ error: "missing_items" }, { status: 400 });
  }

  const medications: MedicationInfo[] = await Promise.all(
    body.items.map(async (item) => {
      const viaOpenai = await explainMedication({
        name: item.medicine_name.value,
        strength: item.strength.value,
        frequency: item.frequency.value,
        route: item.route.value,
        instruction: item.instruction.value,
      });
      if (viaOpenai) return viaOpenai;
      return { ...getMedicationInfo(item), source: "local_kb" as const };
    })
  );

  return NextResponse.json({ medications });
}
