"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { PrescriptionVerify } from "@/components/prescription/prescription-verify";
import { MedicationInfoCard } from "@/components/prescription/medication-info-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { savePrescription, useConsultationSession, usePrescription } from "@/lib/store";
import { getMedicationInfo, parsePrescriptionText } from "@/lib/prescription-ai";
import { recognizeRawText } from "@/lib/ocr-client";
import { takePendingImage } from "@/lib/pending-image";
import {
  conditionOf,
  CONDITION_KIND_LABEL,
  assessmentOf,
} from "@/lib/consultation-condition";
import type { MedicationInfo, PrescriptionItem, PrescriptionRecord } from "@/lib/types";
import { ArrowLeft, ScanLine, ImageOff, Stethoscope, Sparkles } from "lucide-react";

export default function PrescriptionDetailPage() {
  const params = useParams<{ id: string }>();
  // Di-key agar state lokal ter-reset lewat remount saat berpindah resep.
  return <PrescriptionDetailBody key={params.id} id={params.id} />;
}

function PrescriptionDetailBody({ id }: { id: string }) {
  const record = usePrescription(id);
  const consultation = useConsultationSession(record?.consultationId ?? "");
  const ranOcr = useRef(false);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageGone, setImageGone] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [parsing, setParsing] = useState(false);

  // Melepas blob URL saat nilainya berganti atau halaman unmount.
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function persist(next: PrescriptionRecord) {
    savePrescription(next);
  }

  // Menjalankan OCR sekali saat record baru dibuka.
  useEffect(() => {
    if (!record || record.status !== "UPLOADED" || ranOcr.current) return;
    ranOcr.current = true;

    const file = takePendingImage(record.id);
    if (!file) {
      // Ditunda agar tidak setState langsung di badan effect.
      Promise.resolve().then(() => setImageGone(true));
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    savePrescription({ ...record, status: "PROCESSING" });

    recognizeRawText(file)
      .then((rawText) => {
        setPreviewUrl(objectUrl);
        // Berhenti di teks mentah agar pengguna bisa mengoreksi sebelum di-parse.
        savePrescription({ ...record, status: "TEXT_REVIEW", rawText });
      })
      .catch(() => {
        URL.revokeObjectURL(objectUrl);
        savePrescription({ ...record, status: "UPLOADED" });
        setImageGone(true); // OCR gagal, perlakukan seperti gambar hilang
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [record?.id, record?.status]);

  async function handleParse() {
    if (!record || parsing) return;
    const rawText = (textRef.current?.value ?? record.rawText ?? "").trim();
    if (!rawText) return;
    setParsing(true);
    // Selalu lewat tampilan field yang bisa diedit, sekalipun LLM yakin.
    const advance = (items: PrescriptionItem[]) =>
      persist({ ...record, rawText, items, status: "NEEDS_VERIFICATION" });
    try {
      const res = await fetch("/api/prescription/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawText }),
      });
      const data = res.ok
        ? ((await res.json()) as { items?: PrescriptionItem[] })
        : null;
      advance(data?.items?.length ? data.items : parsePrescriptionText(rawText));
    } catch {
      advance(parsePrescriptionText(rawText));
    } finally {
      setParsing(false);
    }
  }

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
    <div className="mx-auto max-w-5xl px-6 py-10">
      <Link
        href="/prescriptions"
        className="mb-4 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
      >
        <ArrowLeft className="size-3.5" /> Resep
      </Link>
      <PageHeader
        eyebrow="Resep untuk kondisi"
        title={cond.kind === "unknown" ? "Pemahaman Resep" : cond.label}
        description="Obat untuk kondisi ini beserta penjelasannya. Dosis & aturan pakai selalu mengikuti yang dituliskan dokter."
        actions={<StatusBadge status={record.status as "PROCESSING"} />}
      />

      {consultation && (
        <Card className="mb-6 border-primary/20 bg-primary/5">
          <CardContent className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Stethoscope className="size-4 text-primary" />
              <span className="text-xs font-semibold tracking-wide text-primary uppercase">
                Kondisi / Pra-diagnosa
              </span>
              <Badge variant="outline">{CONDITION_KIND_LABEL[cond.kind]}</Badge>
            </div>
            <p className="font-heading text-base font-medium text-foreground">{cond.label}</p>
            {assessment && <p className="text-sm text-muted-foreground">{assessment}</p>}
            <Link
              href={backToConsultation}
              className="w-fit text-xs text-primary underline-offset-2 hover:underline"
            >
              Lihat konsultasi asal →
            </Link>
          </CardContent>
        </Card>
      )}

      {imageGone ? (
        <Alert variant="destructive">
          <ImageOff className="size-4" />
          <AlertTitle>Gambar tidak lagi tersedia</AlertTitle>
          <AlertDescription>
            Foto resep hanya diproses sekali di perangkat Anda dan tidak disimpan. Sepertinya
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
            Membaca teks resep di perangkat Anda…
          </p>
        </div>
      ) : record.status === "TEXT_REVIEW" ? (
        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          {previewUrl && (
            <Card className="h-fit">
              <CardContent>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewUrl}
                  alt="Potongan resep"
                  className="w-full rounded-lg border border-border object-cover"
                />
              </CardContent>
            </Card>
          )}
          <div className="flex flex-col gap-3">
            <div>
              <p className="text-xs font-semibold tracking-wide text-primary uppercase">
                Hasil bacaan OCR
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Ini teks mentah dari foto. Perbaiki bila ada yang salah baca (terutama nama
                obat), lalu proses jadi resep terstruktur.
              </p>
            </div>
            <Textarea
              ref={textRef}
              defaultValue={record.rawText ?? ""}
              rows={10}
              className="font-mono text-sm"
              placeholder="Teks tidak terbaca. Ketik ulang isi resep di sini…"
            />
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-4">
              <Button variant="outline" render={<Link href={backToConsultation} />}>
                <ImageOff className="size-3.5" />
                Foto Ulang
              </Button>
              <Button onClick={handleParse} disabled={parsing}>
                <Sparkles className="size-4" />
                {parsing ? "Memproses…" : "Proses jadi Resep"}
              </Button>
            </div>
          </div>
        </div>
      ) : record.status === "NEEDS_VERIFICATION" || record.status === "VERIFIED" ? (
        // Kedua status menampilkan field yang bisa diedit.
        <PrescriptionVerify
          items={record.items}
          previewUrl={previewUrl}
          retakeHref={backToConsultation}
          busy={finalizing}
          onChangeItems={(items) => persist({ ...record, items })}
          onConfirmAll={finalizeMedications}
        />
      ) : (
        <div className="flex flex-col gap-4">
          {record.medications.map((med, i) => (
            <MedicationInfoCard key={i} medication={med} />
          ))}
          <p className="text-center text-[11px] text-muted-foreground">
            Healthalk berfungsi sebagai Prescription Understanding Layer, bukan prescribing
            system. Resep ini tidak diubah oleh AI.
          </p>
        </div>
      )}
    </div>
  );
}
