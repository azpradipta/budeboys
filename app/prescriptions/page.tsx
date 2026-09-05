"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { JourneyStepper } from "@/components/shared/journey-stepper";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { checkImageQuality } from "@/lib/prescription-ai";
import { savePrescription } from "@/lib/store";
import { genId, type PrescriptionRecord } from "@/lib/types";
import { UploadCloud, Camera, ImageOff, ScanLine } from "lucide-react";

export default function UploadPrescriptionPage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function handleFile(file: File) {
    setError(null);
    const quality = checkImageQuality(file);
    if (!quality.ok) {
      setError(quality.reason ?? "IMAGE_QUALITY_FAILED");
      return;
    }

    setLoading(true);
    const reader = new FileReader();
    reader.onload = () => {
      const record: PrescriptionRecord = {
        id: genId("rx"),
        status: "UPLOADED",
        imageDataUrl: typeof reader.result === "string" ? reader.result : null,
        fileName: file.name,
        createdAt: new Date().toISOString(),
        items: [],
        medications: [],
      };
      savePrescription(record);
      router.push(`/prescriptions/${record.id}`);
    };
    reader.onerror = () => {
      setLoading(false);
      setError("Gagal membaca berkas gambar.");
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-14">
      <PageHeader
        eyebrow="Phase 3 · Understand Treatment"
        title="Unggah Resep"
        description="Foto atau unggah resep dokter Anda. Sistem akan membaca tulisan resep dan menjelaskan obatnya setelah Anda verifikasi."
      />

      <div className="mb-8 flex justify-center">
        <JourneyStepper active="treatment" />
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <ImageOff className="size-4" />
          <AlertTitle>IMAGE_QUALITY_FAILED</AlertTitle>
          <AlertDescription>{error} Silakan foto ulang dengan pencahayaan cukup.</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardContent className="flex flex-col items-center gap-6 py-14 text-center">
          <div className="flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary">
            <ScanLine className="size-7" />
          </div>
          <div>
            <h2 className="font-heading text-lg font-semibold text-foreground">
              Pilih foto resep
            </h2>
            <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
              Pastikan tulisan resep terlihat jelas: tidak buram, tidak silau, dan tidak
              terpotong.
            </p>
          </div>

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

          <div className="flex flex-wrap justify-center gap-3">
            <Button size="lg" onClick={() => inputRef.current?.click()} disabled={loading}>
              <UploadCloud className="size-4" />
              {loading ? "Mengunggah…" : "Unggah Gambar"}
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => inputRef.current?.click()}
              disabled={loading}
            >
              <Camera className="size-4" />
              Ambil Foto
            </Button>
          </div>

          <p className="border-t border-border pt-5 text-[11px] text-muted-foreground">
            Healthalk tidak mengubah dosis, mengganti, menghapus, atau menambah obat — hanya
            membantu Anda memahami resep yang sudah dituliskan dokter.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
