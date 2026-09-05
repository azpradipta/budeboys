"use client";

import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useConsultationSessions, usePrescriptions } from "@/lib/store";
import { MessageCircle, Plus, ChevronRight, Stethoscope, Pill } from "lucide-react";

const PHASES = [
  { key: "understand", label: "Konsultasi", icon: MessageCircle },
  { key: "validate", label: "Validasi Dokter", icon: Stethoscope },
  { key: "treatment", label: "Resep", icon: Pill },
] as const;

export default function ConsultationHistoryPage() {
  const sessions = useConsultationSessions();
  const prescriptions = usePrescriptions();
  const consultationsWithPrescription = new Set(prescriptions.map((p) => p.consultationId));

  return (
    <div className="mx-auto max-w-4xl px-6 py-14">
      <PageHeader
        title="Riwayat Konsultasi"
        description="Semua sesi konsultasi Anda — tiap sesi merangkum tiga fase perjalanannya: konsultasi AI, validasi dokter, dan pemahaman resep."
        actions={
          <Button render={<Link href="/consultations" />}>
            <Plus className="size-4" />
            Konsultasi Baru
          </Button>
        }
      />

      {sessions.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="flex flex-col gap-3">
          {sessions.map((session) => {
            const phaseDone = [
              session.status === "COMPLETED",
              Boolean(session.doctorValidation),
              consultationsWithPrescription.has(session.id),
            ];

            return (
              <Link key={session.id} href={`/consultations/${session.id}`}>
                <Card className="transition-shadow hover:shadow-md">
                  <CardContent className="flex flex-col gap-3">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                          <MessageCircle className="size-4" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {session.summary?.chief_complaint ??
                              session.healthContext.chief_complaint ??
                              "Belum ada keluhan tercatat"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(session.createdAt).toLocaleString("id-ID")}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {session.summary && (
                          <div className="hidden gap-1 sm:flex">
                            {session.summary.reported_symptoms.slice(0, 2).map((s) => (
                              <Badge key={s} variant="secondary">
                                {s}
                              </Badge>
                            ))}
                          </div>
                        )}
                        <StatusBadge status={session.status as "ACTIVE"} />
                        <ChevronRight className="size-4 text-muted-foreground" />
                      </div>
                    </div>

                    <div className="flex items-center gap-3 border-t border-border pt-3">
                      {PHASES.map((phase, idx) => (
                        <div
                          key={phase.key}
                          className={cn(
                            "flex items-center gap-1.5 text-xs",
                            phaseDone[idx] ? "text-primary" : "text-muted-foreground/60"
                          )}
                        >
                          <phase.icon className="size-3.5" />
                          {phase.label}
                          {idx < PHASES.length - 1 && (
                            <span className="ml-1.5 h-px w-4 bg-border" />
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border py-16 text-center">
      <MessageCircle className="size-8 text-muted-foreground" />
      <p className="text-sm font-medium text-foreground">Belum ada riwayat konsultasi</p>
      <p className="max-w-sm text-sm text-muted-foreground">
        Mulai konsultasi pertama Anda untuk melihat riwayatnya di sini.
      </p>
      <Button className="mt-2" render={<Link href="/consultations" />}>
        Mulai Konsultasi
      </Button>
    </div>
  );
}
