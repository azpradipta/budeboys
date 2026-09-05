"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { StatusBadge } from "@/components/shared/status-badge";
import { ImageCropper } from "@/components/prescription/image-cropper";
import { checkImageQuality } from "@/lib/prescription-ai";
import { stashPendingImage } from "@/lib/pending-image";
import { savePrescription, usePrescriptionsForConsultation } from "@/lib/store";
import { genId, type PrescriptionRecord } from "@/lib/types";
import { UploadCloud, ImageOff, ScanLine, ChevronRight, Pill } from "lucide-react";

/** Fase 3 menempel pada konsultasinya: resep hanya bisa diunggah dari sini,
 * tidak pernah sebagai aksi lepas. */
export function PrescriptionPhase({ consultationId }: { consultationId: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [toCrop, setToCrop] = useState<File | null>(null);
  const prescriptions = usePrescriptionsForConsultation(consultationId);

  function handleFile(file: File) {
    setError(null);
    const quality = checkImageQuality(file);
    if (!quality.ok) {
      setError(quality.reason ?? "Kualitas gambar kurang baik.");
      return;
    }
    // Crop first so OCR only sees the relevant part of the photo.
    setToCrop(file);
  }

  function handleCropped(file: File) {
    setToCrop(null);
    setLoading(true);
    const id = genId("rx");
    // File-nya hanya ada di memori, dioper ke tahap OCR di halaman berikut
    // dan tidak dikirim ke mana pun (lib/pending-image.ts).
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
    <Card>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Pill className="size-4 text-primary" />
          <p className="text-xs font-semibold tracking-wide text-primary uppercase">
            Phase 3 · Understand Treatment
          </p>
        </div>

        {error && (
          <Alert variant="destructive">
            <ImageOff className="size-4" />
            <AlertTitle>Kualitas gambar kurang</AlertTitle>
            <AlertDescription>
              {error} Silakan foto ulang dengan pencahayaan cukup.
            </AlertDescription>
          </Alert>
        )}

        {prescriptions.length > 0 && (
          <div className="flex flex-col gap-2">
            {prescriptions.map((p) => (
              <Link
                key={p.id}
                href={`/prescriptions/${p.id}`}
                className="flex items-center justify-between gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-muted/50"
              >
                <div className="flex items-center gap-2">
                  <ScanLine className="size-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">
                    {p.items[0]?.medicine_name.value ?? p.fileName}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={p.status as "PROCESSING"} />
                  <ChevronRight className="size-4 text-muted-foreground" />
                </div>
              </Link>
            ))}
          </div>
        )}

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
          variant="outline"
          className="w-fit"
          onClick={() => inputRef.current?.click()}
          disabled={loading}
        >
          <UploadCloud className="size-4" />
          {loading ? "Mengunggah…" : "Unggah Resep dari Konsultasi Ini"}
        </Button>

        <p className="text-[11px] text-muted-foreground">
          Gambar dibaca (OCR) langsung di perangkat Anda dan tidak pernah dikirim ke server.
          Hanya teks hasil bacaannya yang dipakai untuk menyusun resep.
        </p>
      </CardContent>

      {toCrop && (
        <ImageCropper
          file={toCrop}
          onDone={handleCropped}
          onCancel={() => setToCrop(null)}
        />
      )}
    </Card>
  );
}
