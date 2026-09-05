"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import DashboardHeader from "@/components/DashboardHeader";
import { PrescriptionVerify } from "@/components/prescription/prescription-verify";
import { MedicationInfoCard } from "@/components/prescription/medication-info-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  savePrescription,
  useConsultationSession,
  usePrescription,
} from "@/lib/store";
import { getMedicationInfo, needsVerification } from "@/lib/prescription-ai";
import { recognizePrescription } from "@/lib/ocr-client";
import { takePendingImage } from "@/lib/pending-image";
import {
  conditionOf,
  CONDITION_KIND_LABEL,
  assessmentOf,
} from "@/lib/consultation-condition";
import type { MedicationInfo, PrescriptionRecord } from "@/lib/types";
import {
  ArrowLeft,
  ScanLine,
  ArrowRight,
  ImageOff,
  Stethoscope,
} from "lucide-react";

export default function PrescriptionDetailPage() {
  const params = useParams<{ id: string }>();
  return <PrescriptionDetailBody key={params.id} id={params.id} />;
}

function PrescriptionDetailBody({ id }: { id: string }) {
  const record = usePrescription(id);
  const consultation = useConsultationSession(record?.consultationId ?? "");
  const ranOcr = useRef(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageGone, setImageGone] = useState(false);
  const [finalizing, setFinalizing] = useState(false);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function persist(next: PrescriptionRecord) {
    savePrescription(next);
  }

  useEffect(() => {
    if (!record || record.status !== "UPLOADED" || ranOcr.current) return;
    ranOcr.current = true;

    const file = takePendingImage(record.id);
    if (!file) {
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
        setImageGone(true);
      });
  }, [record?.id, record?.status]);

  async function finalizeMedications() {
    if (!record || finalizing) return;
    setFinalizing(true);
    const localFallback = () => record.items.map(getMedicationInfo);
    try {
      const res = await fetch("/api/medication-info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: record.items }),
      });
      const data = res.ok
        ? ((await res.json()) as { medications: MedicationInfo[] })
        : null;
      persist({
        ...record,
        status: "COMPLETED",
        medications: data?.medications ?? localFallback(),
      });
    } catch {
      persist({ ...record, status: "COMPLETED", medications: localFallback() });
    } finally {
      setFinalizing(false);
    }
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
          Kembali ke Resep
        </Button>
      </div>
    );
  }

  const backToConsultation = `/consultations/${record.consultationId}`;
  const cond = conditionOf(consultation ?? null);
  const assessment = assessmentOf(consultation ?? null);

  return (
    <div className="mx-auto max-w-6xl px-6 py-26 space-y-6 ">
      <DashboardHeader
        heading="Resep Untuk Kondisi"
        subHeading={cond.kind === "unknown" ? "Pemahaman Resep" : cond.label}
      />

      {consultation && (
        <Card className="mb-6 border-primary/20 bg-primary/5">
          <CardContent className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Stethoscope className="size-4 text-primary" />
              <span className="text-xs font-semibold tracking-wide text-primary uppercase">
                Kondisi / Pra-diagnosa
              </span>
            </div>
            <p className="font-heading text-base font-medium text-foreground">
              {cond.label}
            </p>
            {assessment && (
              <p className="text-sm text-muted-foreground">{assessment}</p>
            )}
            <Link
              href={backToConsultation}
              className="w-fit text-xs text-primary underline-offset-2 hover:underline"
            >
              <Button>Lihat konsultasi asal</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {imageGone ? (
        <Alert variant="destructive">
          <ImageOff className="size-4" />
          <AlertTitle>Gambar tidak lagi tersedia</AlertTitle>
          <AlertDescription>
            Foto resep hanya diproses sekali di perangkat Anda dan tidak
            disimpan — sepertinya halaman ini dibuka ulang. Silakan unggah ulang
            dari konsultasinya.
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
          busy={finalizing}
          onChangeItems={(items) => persist({ ...record, items })}
          onConfirmAll={finalizeMedications}
        />
      ) : record.status === "VERIFIED" ? (
        <div className="flex flex-col items-center gap-4 py-10">
          <p className="text-sm text-muted-foreground">
            {finalizing
              ? "Menyusun penjelasan obat…"
              : "Semua field terverifikasi."}
          </p>
          <Button onClick={finalizeMedications} disabled={finalizing}>
            {finalizing ? "Menyusun…" : "Lihat Informasi Obat"}
            {!finalizing && <ArrowRight className="size-4" />}
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {record.medications.map((med, i) => (
            <MedicationInfoCard key={i} medication={med} />
          ))}
          <p className="text-center text-[11px] text-muted-foreground">
            Healthalk berfungsi sebagai Prescription Understanding Layer, bukan
            prescribing system — resep ini tidak diubah oleh AI.
          </p>
        </div>
      )}
    </div>
  );
}
