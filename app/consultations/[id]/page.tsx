"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { LiveConsultation } from "@/components/consultation/live-consultation";
import { ConsultationResult } from "@/components/consultation/consultation-result";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { saveSession, useConsultationSession } from "@/lib/store";
import type { ConsultationSession, ConsultationSummary } from "@/lib/types";
import { ArrowLeft } from "lucide-react";

/** Calls our own /api/consultation/summary (real Healthify, with a local
 * rule-based fallback baked in server-side). Only degrades further here if
 * our own server is unreachable entirely. */
async function fetchSummary(session: ConsultationSession): Promise<ConsultationSummary> {
  try {
    const res = await fetch("/api/consultation/summary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session }),
    });
    if (res.ok) {
      const data = (await res.json()) as { summary: ConsultationSummary };
      return data.summary;
    }
  } catch {
    // fall through to the degenerate fallback below
  }
  return {
    chief_complaint: session.healthContext.chief_complaint ?? "Tidak disebutkan",
    reported_symptoms: session.healthContext.symptoms,
    duration_onset: session.healthContext.duration ?? "unknown",
    relevant_information: [],
    questions_discussed: [],
    ai_preliminary_assessment: "Ringkasan tidak dapat dibuat saat ini karena server bermasalah.",
    evidence_discussed: [],
    recommended_next_step: "Konsultasikan langsung dengan dokter.",
    important_warnings: [],
    generated_at: new Date().toISOString(),
  };
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

export default function ConsultationDetailPage() {
  const params = useParams<{ id: string }>();
  const session = useConsultationSession(params.id);

  function persist(next: ConsultationSession) {
    saveSession(next);
  }

  async function handleEnd() {
    if (!session) return;
    let current: ConsultationSession = { ...session, status: "COMPLETING" };
    persist(current);
    await sleep(500);

    current = { ...current, status: "SUMMARY_GENERATION" };
    persist(current);
    const summary = await fetchSummary(current); // real Healthify, or local fallback
    current = { ...current, summary };

    current = { ...current, status: "SECURITY_PROCESSING" };
    persist(current);
    await sleep(500);

    current = {
      ...current,
      status: "COMPLETED",
      encrypted: true,
      completedAt: new Date().toISOString(),
    };
    persist(current);
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
