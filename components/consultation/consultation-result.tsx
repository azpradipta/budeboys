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
import { CheckCircle2, ShieldCheck, Share2, AlertTriangle, Clock } from "lucide-react";

/** Nilai-nilai ini berarti pengguna tidak menyebutkannya, jadi fieldnya
 * disembunyikan alih-alih menampilkan "unknown". */
function isBlank(value: string | null | undefined): boolean {
  if (!value) return true;
  const t = value.trim().toLowerCase();
  return t === "" || t === "unknown" || t === "-" || t.includes("tidak disebutkan");
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
        {title}
      </p>
      <div className="mt-1.5 text-sm text-foreground">{children}</div>
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
      <div className="flex flex-col gap-6">
        <Card>
          <CardContent className="flex flex-col gap-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-5 text-primary" />
                <h2 className="font-heading text-lg font-semibold text-foreground">
                  Consultation Completed
                </h2>
              </div>
              <StatusBadge status="COMPLETED" />
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Clock className="size-3.5 text-primary" />
                Durasi konsultasi{" "}
                <strong className="text-foreground">
                  {session.completedAt
                    ? formatDuration(
                        new Date(session.completedAt).getTime() -
                          new Date(session.createdAt).getTime()
                      )
                    : "-"}
                </strong>
              </span>
              <span>
                {new Date(session.createdAt).toLocaleString("id-ID", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
                {session.completedAt &&
                  ` – ${new Date(session.completedAt).toLocaleTimeString("id-ID", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}`}
              </span>
            </div>

            <Section title="Main Complaint">{summary.chief_complaint}</Section>

            <Section title="Symptoms">
              <div className="flex flex-wrap gap-1.5">
                {summary.reported_symptoms.map((s) => (
                  <Badge key={s} variant="secondary">
                    {s}
                  </Badge>
                ))}
              </div>
            </Section>

            {!isBlank(summary.duration_onset) && (
              <Section title="Durasi / Onset Gejala">{summary.duration_onset}</Section>
            )}

            {summary.relevant_information.length > 0 && (
              <Section title="Important Information">
                <ul className="list-disc space-y-1 pl-4">
                  {summary.relevant_information.map((info, i) => (
                    <li key={i}>{info}</li>
                  ))}
                </ul>
              </Section>
            )}

            {summary.questions_discussed.length > 0 && (
              <Section title="Questions Discussed">
                <ul className="list-disc space-y-1 pl-4">
                  {summary.questions_discussed.map((q, i) => (
                    <li key={i}>{q}</li>
                  ))}
                </ul>
              </Section>
            )}

            <Section title="AI Preliminary Assessment">
              {summary.ai_preliminary_assessment}
            </Section>

            <Section title="Recommended Next Step">{summary.recommended_next_step}</Section>

            {summary.important_warnings.length > 0 && (
              <div className="flex gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                <AlertTriangle className="size-4 shrink-0" />
                <div>
                  {summary.important_warnings.map((w, i) => (
                    <p key={i}>{w}</p>
                  ))}
                </div>
              </div>
            )}

            <Separator />

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <ShieldCheck className="size-3.5 text-primary" />
                {session.encrypted ? "Secure Record, tersimpan terenkripsi" : "Belum diamankan"}
              </div>

              <Dialog open={shareOpen} onOpenChange={setShareOpen}>
                <DialogTrigger render={<Button size="sm" variant="outline" className="ml-auto" />}>
                  <Share2 className="size-3.5" />
                  Share with Doctor
                </DialogTrigger>
                <DialogContent className="sm:max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Consultation Summary</DialogTitle>
                    <DialogDescription>
                      Tampilan yang dapat dibagikan/ditunjukkan langsung ke dokter saat
                      konsultasi tatap muka.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="max-h-80 space-y-3 overflow-y-auto rounded-lg border border-border p-3 text-sm">
                    <p>
                      <strong>Tanggal:</strong>{" "}
                      {new Date(session.createdAt).toLocaleString("id-ID")}
                      {session.completedAt && (
                        <>
                          {" · "}
                          <strong>Durasi konsultasi:</strong>{" "}
                          {formatDuration(
                            new Date(session.completedAt).getTime() -
                              new Date(session.createdAt).getTime()
                          )}
                        </>
                      )}
                    </p>
                    <p><strong>Chief Complaint:</strong> {summary.chief_complaint}</p>
                    <p><strong>Symptoms:</strong> {summary.reported_symptoms.join(", ")}</p>
                    {!isBlank(summary.duration_onset) && (
                      <p><strong>Durasi/Onset Gejala:</strong> {summary.duration_onset}</p>
                    )}
                    <p><strong>AI Preliminary Assessment:</strong> {summary.ai_preliminary_assessment}</p>
                    <p><strong>Recommended Next Step:</strong> {summary.recommended_next_step}</p>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>

        <DoctorValidationCard validation={session.doctorValidation} onSave={saveValidation} />

        {session.doctorValidation && <PrescriptionPhase consultationId={session.id} />}
      </div>

      <Card className="h-fit">
        <CardContent>
          <p className="mb-3 text-xs font-semibold tracking-wide text-primary uppercase">
            Evidence &amp; Sources
          </p>
          <EvidenceList evidence={summary.evidence_discussed} />
        </CardContent>
      </Card>
    </div>
  );
}
