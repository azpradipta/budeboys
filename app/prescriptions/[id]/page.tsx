"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { PrescriptionVerify } from "@/components/prescription/prescription-verify";
import { MedicationInfoCard } from "@/components/prescription/medication-info-card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { savePrescription, usePrescription } from "@/lib/store";
import { getMedicationInfo, needsVerification } from "@/lib/prescription-ai";
import { recognizePrescription } from "@/lib/ocr-client";
import { takePendingImage } from "@/lib/pending-image";
import type { PrescriptionRecord } from "@/lib/types";
import { ArrowLeft, ScanLine, ArrowRight, ImageOff } from "lucide-react";

export default function PrescriptionDetailPage() {
  const params = useParams<{ id: string }>();
  // Keyed so every field of local state (previewUrl, imageGone, the ranOcr
  // guard) naturally resets via remount when navigating between different
  // prescriptions — no manual "reset state on id change" effect needed.
  return <PrescriptionDetailBody key={params.id} id={params.id} />;
}

function PrescriptionDetailBody({ id }: { id: string }) {
  const record = usePrescription(id);
  const ranOcr = useRef(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageGone, setImageGone] = useState(false);

  // Revoke the blob URL when it changes or the page unmounts.
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function persist(next: PrescriptionRecord) {
    savePrescription(next);
  }

  // Run real, client-side OCR once when a freshly uploaded record is opened
  // — consumes the transient in-memory file handed off from Phase 3.
  useEffect(() => {
    if (!record || record.status !== "UPLOADED" || ranOcr.current) return;
    ranOcr.current = true;

    const file = takePendingImage(record.id);
    if (!file) {
      // Deferred (not a bare setState-then-return in the effect body) —
      // consistent with the async continuations below.
      Promise.resolve().then(() => setImageGone(true));
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    savePrescription({ ...record, status: "PROCESSING" });

    recognizePrescription(file)
      .then((items) => {
        setPreviewUrl(objectUrl);
        savePrescription({
          ...record,
          status: needsVerification(items) ? "NEEDS_VERIFICATION" : "VERIFIED",
          items,
        });
      })
      .catch(() => {
        URL.revokeObjectURL(objectUrl);
        savePrescription({ ...record, status: "UPLOADED" });
        setImageGone(true); // OCR failed — treat like "needs a fresh photo"
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [record?.id, record?.status]);

  function finalizeMedications() {
    if (!record) return;
    const medications = record.items.map(getMedicationInfo);
    persist({ ...record, status: "COMPLETED", medications });
  }

  if (record === undefined) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-14">
        <Skeleton className="mb-4 h-8 w-64" />
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  if (record === null) {
    return (
      <div className="mx-auto max-w-md px-6 py-24 text-center">
        <h1 className="font-heading text-xl font-semibold text-foreground">
          Resep tidak ditemukan
        </h1>
        <Button className="mt-6" render={<Link href="/prescriptions" />}>
          Kembali ke Riwayat Resep
        </Button>
      </div>
    );
  }

  const backToConsultation = `/consultations/${record.consultationId}`;

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <Link
        href={backToConsultation}
        className="mb-4 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
      >
        <ArrowLeft className="size-3.5" /> Kembali ke Konsultasi
      </Link>
      <PageHeader
        title="Pemahaman Resep"
        description="Verifikasi hasil pembacaan resep, lalu lihat penjelasan tiap obat."
        actions={<StatusBadge status={record.status as "PROCESSING"} />}
      />

      {imageGone ? (
        <Alert variant="destructive">
          <ImageOff className="size-4" />
          <AlertTitle>Gambar tidak lagi tersedia</AlertTitle>
          <AlertDescription>
            Foto resep hanya diproses sekali di perangkat Anda dan tidak disimpan — sepertinya
            halaman ini dibuka ulang. Silakan unggah ulang dari konsultasinya.
            <div className="mt-3">
              <Button size="sm" render={<Link href={backToConsultation} />}>
                Kembali ke Konsultasi
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      ) : record.status === "PROCESSING" || record.status === "UPLOADED" ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-border py-24">
          <ScanLine className="size-8 animate-pulse text-primary" />
          <p className="text-sm text-muted-foreground">
            Memproses gambar & membaca teks resep di perangkat Anda…
          </p>
        </div>
      ) : record.status === "NEEDS_VERIFICATION" ? (
        <PrescriptionVerify
          items={record.items}
          previewUrl={previewUrl}
          retakeHref={backToConsultation}
          onChangeItems={(items) => persist({ ...record, items })}
          onConfirmAll={finalizeMedications}
        />
      ) : record.status === "VERIFIED" ? (
        <div className="flex flex-col items-center gap-4 py-10">
          <p className="text-sm text-muted-foreground">Semua field terverifikasi.</p>
          <Button onClick={finalizeMedications}>
            Lihat Informasi Obat
            <ArrowRight className="size-4" />
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {record.medications.map((med, i) => (
            <MedicationInfoCard key={i} medication={med} />
          ))}
          <p className="text-center text-[11px] text-muted-foreground">
            Healthalk berfungsi sebagai Prescription Understanding Layer, bukan prescribing
            system — resep ini tidak diubah oleh AI.
          </p>
        </div>
      )}
    </div>
  );
}
