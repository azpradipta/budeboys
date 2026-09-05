"use client";

import { useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { PrescriptionVerify } from "@/components/prescription/prescription-verify";
import { MedicationInfoCard } from "@/components/prescription/medication-info-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { savePrescription, usePrescription } from "@/lib/store";
import { getMedicationInfo, needsVerification, runOcr } from "@/lib/prescription-ai";
import type { PrescriptionRecord } from "@/lib/types";
import { ArrowLeft, ScanLine, ArrowRight } from "lucide-react";

export default function PrescriptionDetailPage() {
  const params = useParams<{ id: string }>();
  const record = usePrescription(params.id);
  const ranOcr = useRef(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    ranOcr.current = false;
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
  }, [params.id]);

  function persist(next: PrescriptionRecord) {
    savePrescription(next);
  }

  // Run OCR once when a freshly uploaded record is opened.
  useEffect(() => {
    if (!record || record.status !== "UPLOADED" || ranOcr.current) return;
    ranOcr.current = true;
    savePrescription({ ...record, status: "PROCESSING" });

    const timer = setTimeout(() => {
      const items = runOcr(record.fileName);
      const afterOcr: PrescriptionRecord = { ...record, status: "PROCESSING", items };
      savePrescription(afterOcr);

      const timer2 = setTimeout(() => {
        savePrescription({
          ...afterOcr,
          status: needsVerification(items) ? "NEEDS_VERIFICATION" : "VERIFIED",
        });
      }, 900);
      timers.current.push(timer2);
    }, 1100);
    timers.current.push(timer);
    // Intentionally keyed on id/status only: `record` itself is a fresh
    // object every store update, so including it would re-run this on every
    // OCR step instead of once per UPLOADED record.
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
          Unggah Resep Baru
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <Link
        href="/prescriptions/history"
        className="mb-4 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
      >
        <ArrowLeft className="size-3.5" /> Riwayat Resep
      </Link>
      <PageHeader
        title="Pemahaman Resep"
        description="Verifikasi hasil pembacaan resep, lalu lihat penjelasan tiap obat."
        actions={<StatusBadge status={record.status as "PROCESSING"} />}
      />

      {record.status === "PROCESSING" || record.status === "UPLOADED" ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-border py-24">
          <ScanLine className="size-8 animate-pulse text-primary" />
          <p className="text-sm text-muted-foreground">
            Memproses gambar & membaca teks resep…
          </p>
        </div>
      ) : record.status === "NEEDS_VERIFICATION" ? (
        <PrescriptionVerify
          items={record.items}
          imageDataUrl={record.imageDataUrl}
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
