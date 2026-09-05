"use client";

import { useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { LiveConsultation } from "@/components/consultation/live-consultation";
import { ConsultationResult } from "@/components/consultation/consultation-result";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { saveSession, useConsultationSession } from "@/lib/store";
import { generateSummary } from "@/lib/health-ai";
import type { ConsultationSession } from "@/lib/types";
import { ArrowLeft } from "lucide-react";

const COMPLETION_STAGES: ConsultationSession["status"][] = [
  "COMPLETING",
  "SUMMARY_GENERATION",
  "SECURITY_PROCESSING",
  "COMPLETED",
];

export default function ConsultationDetailPage() {
  const params = useParams<{ id: string }>();
  const session = useConsultationSession(params.id);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
  }, [params.id]);

  function persist(next: ConsultationSession) {
    saveSession(next);
  }

  function handleEnd() {
    if (!session) return;
    let current: ConsultationSession = { ...session, status: "COMPLETING" };
    persist(current);

    COMPLETION_STAGES.slice(1).forEach((stage, i) => {
      const timer = setTimeout(() => {
        current = { ...current, status: stage };
        if (stage === "SUMMARY_GENERATION") {
          current.summary = generateSummary(current);
        }
        if (stage === "COMPLETED") {
          current.encrypted = true;
          current.completedAt = new Date().toISOString();
        }
        persist(current);
      }, (i + 1) * 700);
      timers.current.push(timer);
    });
  }

  if (session === undefined) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-14">
        <Skeleton className="mb-4 h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (session === null) {
    return (
      <div className="mx-auto max-w-md px-6 py-24 text-center">
        <h1 className="font-heading text-xl font-semibold text-foreground">
          Sesi tidak ditemukan
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Sesi konsultasi ini tidak ada di perangkat Anda.
        </p>
        <Button className="mt-6" render={<Link href="/consultations" />}>
          Mulai Konsultasi Baru
        </Button>
      </div>
    );
  }

  const isLive = session.status !== "COMPLETED";

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <Link
        href="/consultations/history"
        className="mb-4 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
      >
        <ArrowLeft className="size-3.5" /> Riwayat Konsultasi
      </Link>
      <PageHeader
        eyebrow={isLive ? "Phase 1 · Understand" : "Phase 1 Selesai"}
        title={isLive ? "Konsultasi Berlangsung" : "Ringkasan Konsultasi"}
        description={
          isLive
            ? "Bicara atau ketik keluhan Anda. Health context akan tersusun otomatis di panel kanan."
            : "Konsultasi telah selesai dan diringkas. Bawa ringkasan ini ke dokter."
        }
      />

      {session.status === "COMPLETING" ||
      session.status === "SUMMARY_GENERATION" ||
      session.status === "SECURITY_PROCESSING" ? (
        <TransitionState status={session.status} />
      ) : isLive ? (
        <LiveConsultation session={session} onUpdate={persist} onEnd={handleEnd} />
      ) : (
        <ConsultationResult session={session} onUpdate={persist} />
      )}
    </div>
  );
}

function TransitionState({ status }: { status: ConsultationSession["status"] }) {
  const label =
    status === "COMPLETING"
      ? "Menyelesaikan sesi…"
      : status === "SUMMARY_GENERATION"
        ? "Menyusun ringkasan konsultasi…"
        : "Mengenkripsi & menyimpan rekam kesehatan…";

  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-border py-24">
      <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}
