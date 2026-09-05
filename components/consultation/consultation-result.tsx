"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { EvidenceList } from "@/components/shared/evidence-list";
import { StatusBadge } from "@/components/shared/status-badge";
import { DoctorValidationCard } from "./doctor-validation-card";
import { PrescriptionPhase } from "./prescription-phase";
import { formatDuration } from "@/lib/format";
import type { ConsultationSession, DoctorValidation } from "@/lib/types";
import {
  CheckCircle2,
  ShieldCheck,
  Share2,
  AlertTriangle,
  Clock,
  Bot,
} from "lucide-react";

/** Sembunyikan field jika data kosong atau tidak relevan */
function isBlank(value: string | null | undefined): boolean {
  if (!value) return true;
  const t = value.trim().toLowerCase();
  return (
    t === "" || t === "unknown" || t === "-" || t.includes("tidak disebutkan")
  );
}

function Section({
  title,
  children,
  isHighlight = false,
}: {
  title: string;
  children: React.ReactNode;
  isHighlight?: boolean;
}) {
  return (
    <div
      className={`space-y-2 ${isHighlight ? "bg-primary/5 p-4 rounded-xl border border-primary/20" : ""}`}
    >
      <p className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
        {title}
      </p>
      <div className="text-sm md:text-base font-medium text-foreground leading-relaxed">
        {children}
      </div>
    </div>
  );
}

export function ConsultationResult({
  session,
  onUpdate,
}: {
  session: ConsultationSession;
  onUpdate: (session: ConsultationSession) => void;
}) {
  const [shareOpen, setShareOpen] = useState(false);
  const summary = session.summary;

  if (!summary) return null;

  function saveValidation(validation: DoctorValidation) {
    onUpdate({ ...session, doctorValidation: validation });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="flex flex-col gap-0">
        {/* KARTU TAHAP 1: Analisis AI */}
        <Card className="border-primary/20 shadow-sm relative overflow-hidden">
          {/* Garis timeline vertikal */}
          <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-primary/60"></div>

          <CardContent className="flex flex-col gap-7 p-6 pl-8">
            {/* Header Status - Diselaraskan dengan gaya Tahap 2 & 3 */}
            <div className="flex flex-wrap items-start sm:items-center justify-between flex-col sm:flex-row gap-4">
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 p-2.5 rounded-full">
                  <Bot className="size-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs font-bold tracking-wide text-primary uppercase">
                    Tahap 1 · Selesai
                  </p>
                  <h3 className="font-heading text-lg font-bold text-foreground">
                    Ringkasan Analisis AI
                  </h3>
                </div>
              </div>
              <StatusBadge status="COMPLETED" />
            </div>

            {/* Meta Data Waktu */}
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-lg bg-muted/40 px-4 py-2.5 text-sm text-muted-foreground border border-border">
              <span className="flex items-center gap-2">
                <Clock className="size-4 text-primary" />
                Durasi:{" "}
                <strong className="text-foreground font-semibold">
                  {session.completedAt
                    ? formatDuration(
                        new Date(session.completedAt).getTime() -
                          new Date(session.createdAt).getTime(),
                      )
                    : "—"}
                </strong>
              </span>
              <span className="text-muted/60">|</span>
              <span className="font-medium text-foreground">
                {new Date(session.createdAt).toLocaleString("id-ID", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
                {session.completedAt &&
                  ` – ${new Date(session.completedAt).toLocaleTimeString(
                    "id-ID",
                    {
                      hour: "2-digit",
                      minute: "2-digit",
                    },
                  )}`}
              </span>
            </div>

            <div className="grid gap-6">
              <Section title="Keluhan Utama">{summary.chief_complaint}</Section>

              <Section title="Gejala yang Dilaporkan">
                <div className="flex flex-wrap gap-2">
                  {summary.reported_symptoms.map((s) => (
                    <Badge
                      key={s}
                      variant="secondary"
                      className="bg-muted hover:bg-muted/80 text-foreground px-3 py-1"
                    >
                      {s}
                    </Badge>
                  ))}
                </div>
              </Section>

              {!isBlank(summary.duration_onset) && (
                <Section title="Durasi / Kemunculan Gejala">
                  {summary.duration_onset}
                </Section>
              )}

              {summary.relevant_information.length > 0 && (
                <Section title="Informasi Tambahan">
                  <ul className="list-disc space-y-1.5 pl-5 text-muted-foreground marker:text-muted">
                    {summary.relevant_information.map((info, i) => (
                      <li key={i}>{info}</li>
                    ))}
                  </ul>
                </Section>
              )}

              {summary.questions_discussed.length > 0 && (
                <Section title="Topik Diskusi">
                  <ul className="list-disc space-y-1.5 pl-5 text-muted-foreground marker:text-muted">
                    {summary.questions_discussed.map((q, i) => (
                      <li key={i}>{q}</li>
                    ))}
                  </ul>
                </Section>
              )}
            </div>

            <Separator className="my-2" />

            {/* Highlighted AI Assessment */}
            <div className="grid gap-6">
              <Section title="Analisis Awal AI" isHighlight>
                {summary.ai_preliminary_assessment}
              </Section>

              <Section title="Tindakan Lanjutan">
                {summary.recommended_next_step}
              </Section>
            </div>

            {summary.important_warnings.length > 0 && (
              <div className="flex gap-3 rounded-xl bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive shadow-sm">
                <AlertTriangle className="size-5 shrink-0 text-destructive" />
                <div className="space-y-1 font-medium">
                  {summary.important_warnings.map((w, i) => (
                    <p key={i}>{w}</p>
                  ))}
                </div>
              </div>
            )}

            <Separator />

            {/* Footer Actions */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground bg-muted/40 px-3 py-1.5 rounded-full border border-border">
                <ShieldCheck className="size-4 text-primary" />
                {session.encrypted
                  ? "Rekam Medis Terenkripsi"
                  : "Belum Diamankan"}
              </div>

              <Dialog open={shareOpen} onOpenChange={setShareOpen}>
                <DialogTrigger render={<Button />}>
                  <Share2 className="size-4 mr-2" />
                  Tunjukkan ke Dokter
                </DialogTrigger>
                <DialogContent className="sm:max-w-lg">
                  <DialogHeader>
                    <DialogTitle className="text-xl">
                      Ringkasan Medis
                    </DialogTitle>
                    <DialogDescription>
                      Tampilan bersih untuk mempermudah dokter membaca riwayat
                      keluhan Anda saat konsultasi tatap muka.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="mt-4 max-h-[60vh] space-y-4 overflow-y-auto rounded-xl border border-border bg-muted/30 p-5 text-sm">
                    <div className="grid grid-cols-2 gap-4 pb-4 border-b border-border">
                      <div>
                        <p className="text-[11px] font-bold text-muted-foreground uppercase mb-1">
                          Tanggal
                        </p>
                        <p className="font-semibold text-foreground">
                          {new Date(session.createdAt).toLocaleDateString(
                            "id-ID",
                          )}
                        </p>
                      </div>
                      {session.completedAt && (
                        <div>
                          <p className="text-[11px] font-bold text-muted-foreground uppercase mb-1">
                            Durasi Keluhan
                          </p>
                          <p className="font-semibold text-foreground">
                            {summary.duration_onset || "-"}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="space-y-4">
                      <div>
                        <p className="text-[11px] font-bold text-muted-foreground uppercase mb-1">
                          Keluhan Utama
                        </p>
                        <p className="font-medium text-foreground">
                          {summary.chief_complaint}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] font-bold text-muted-foreground uppercase mb-1">
                          Gejala
                        </p>
                        <p className="font-medium text-foreground">
                          {summary.reported_symptoms.join(", ")}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] font-bold text-muted-foreground uppercase mb-1">
                          Analisis Awal AI
                        </p>
                        <p className="font-medium text-foreground">
                          {summary.ai_preliminary_assessment}
                        </p>
                      </div>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>

        {/* Konektor visual antar kartu dilepas karena margin diatur di masing-masing komponen (mt-6 di Tahap 2 & 3) */}
        <DoctorValidationCard
          validation={session.doctorValidation}
          onSave={saveValidation}
        />

        {session.doctorValidation && (
          <PrescriptionPhase consultationId={session.id} />
        )}
      </div>

      {/* Kartu Referensi di Sisi Kanan */}
      <div className="h-fit">
        <Card className="border-primary/20 shadow-sm sticky top-6">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-4">
              <p className="text-xs font-bold tracking-wider text-primary uppercase">
                Referensi Medis
              </p>
            </div>
            <EvidenceList evidence={summary.evidence_discussed} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
