"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { StatusBadge } from "@/components/shared/status-badge";
import { checkImageQuality } from "@/lib/prescription-ai";
import { stashPendingImage } from "@/lib/pending-image";
import { savePrescription, usePrescriptionsForConsultation } from "@/lib/store";
import { genId, type PrescriptionRecord } from "@/lib/types";
import {
  UploadCloud,
  ImageOff,
  ScanLine,
  ChevronRight,
  Pill,
  ShieldCheck,
} from "lucide-react";

export function PrescriptionPhase({
  consultationId,
}: {
  consultationId: string;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const prescriptions = usePrescriptionsForConsultation(consultationId);

  function handleFile(file: File) {
    setError(null);
    const quality = checkImageQuality(file);
    if (!quality.ok) {
      setError(quality.reason ?? "Kualitas gambar kurang baik.");
      return;
    }

    setLoading(true);
    const id = genId("rx");
    stashPendingImage(id, file);

    const record: PrescriptionRecord = {
      id,
      consultationId,
      status: "UPLOADED",
      imageDataUrl: null,
      fileName: file.name,
      createdAt: new Date().toISOString(),
      items: [],
      medications: [],
    };
    savePrescription(record);
    router.push(`/prescriptions/${id}`);
  }

  return (
    <Card className="border-primary/20 shadow-md relative overflow-hidden ring-1 ring-primary/5 mt-6">
      {/* Aksen garis vertikal penanda Tahap Akhir */}
      <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-primary"></div>

      <CardContent className="p-6 pl-8 flex flex-col gap-5">
        {/* Header Section */}
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 p-2.5 rounded-full">
            <Pill className="size-5 text-primary" />
          </div>
          <div>
            <p className="text-xs font-bold tracking-wide text-primary uppercase">
              Tahap 3
            </p>
            <h3 className="font-heading text-lg font-bold text-foreground">
              Pahami Resep & Perawatan
            </h3>
          </div>
        </div>

        <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
          Jika dokter memberikan resep obat, unggah fotonya di sini. AI kami
          akan membantu menjabarkan fungsi, dosis, dan efek samping setiap obat
          agar Anda tidak kebingungan saat masa pemulihan.
        </p>

        {/* Error State */}
        {error && (
          <Alert
            variant="destructive"
            className="bg-destructive/5 border-destructive/20"
          >
            <ImageOff className="size-4" />
            <AlertTitle className="font-semibold">
              Kualitas gambar kurang
            </AlertTitle>
            <AlertDescription className="text-xs mt-1">
              {error} Silakan foto ulang dengan pencahayaan yang cukup.
            </AlertDescription>
          </Alert>
        )}

        {/* List of Uploaded Prescriptions */}
        {prescriptions.length > 0 && (
          <div className="flex flex-col gap-3 mt-2">
            <p className="text-[11px] font-bold text-muted-foreground uppercase">
              Resep Tersimpan
            </p>
            {prescriptions.map((p) => (
              <Link
                key={p.id}
                href={`/prescriptions/${p.id}`}
                className="group flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/30 hover:bg-accent/30 hover:shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-muted p-2 rounded-lg group-hover:bg-primary/10 transition-colors">
                    <ScanLine className="size-4 text-muted-foreground group-hover:text-primary" />
                  </div>
                  <span className="text-sm font-semibold text-foreground">
                    {p.items[0]?.medicine_name.value ?? p.fileName}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={p.status as "PROCESSING"} />
                  <ChevronRight className="size-4 text-muted-foreground group-hover:text-primary" />
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Upload Action */}
        <div className="pt-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />
          <Button
            size="lg"
            className="w-full sm:w-fit font-semibold"
            onClick={() => inputRef.current?.click()}
            disabled={loading}
          >
            <UploadCloud className="size-5 mr-2" />
            {loading ? "Memproses Gambar..." : "Unggah Foto Resep"}
          </Button>
        </div>

        {/* Privacy Info */}
        <div className="flex gap-2 items-start bg-muted/40 p-3 rounded-lg border border-border mt-2">
          <ShieldCheck className="size-4 text-muted-foreground shrink-0 mt-0.5" />
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            <strong className="text-foreground">Privasi Terjamin:</strong> Foto
            diproses langsung di perangkat Anda (OCR client-side). Gambar asli
            tidak pernah dikirim atau disimpan di server, hanya hasil bacaan
            teks yang diamankan.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
