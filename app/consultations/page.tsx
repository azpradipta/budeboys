"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { JourneyStepper } from "@/components/shared/journey-stepper";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { createSession } from "@/lib/health-ai";
import { saveSession, useConsultationSessions } from "@/lib/store";
import { Mic, Sparkles, ShieldCheck, ArrowRight, History } from "lucide-react";

export default function StartConsultationPage() {
  const router = useRouter();
  const [starting, setStarting] = useState(false);
  const activeSession = useConsultationSessions().find((s) => s.status !== "COMPLETED");

  function handleStart() {
    setStarting(true);
    const session = createSession();
    saveSession(session);
    router.push(`/consultations/${session.id}`);
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-14">
      <PageHeader
        eyebrow="Phase 1 · Understand"
        title="Mulai Konsultasi"
        description="Ceritakan keluhan kesehatan Anda secara natural lewat suara. Healthalk akan menyusunnya menjadi health context terstruktur dan mencarikan evidence yang relevan."
      />

      <div className="mb-8 flex justify-center">
        <JourneyStepper active="understand" />
      </div>

      {activeSession && (
        <Alert className="mb-6">
          <History className="size-4" />
          <AlertTitle>Ada sesi yang belum selesai</AlertTitle>
          <AlertDescription>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <span>
                Sesi konsultasi dibuat pada{" "}
                {new Date(activeSession.createdAt).toLocaleString("id-ID")} masih aktif.
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => router.push(`/consultations/${activeSession.id}`)}
              >
                Lanjutkan sesi
                <ArrowRight className="size-3.5" />
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardContent className="flex flex-col items-center gap-6 py-10 text-center">
          <div className="flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Mic className="size-7" />
          </div>
          <div>
            <h2 className="font-heading text-lg font-semibold text-foreground">
              Sesi konsultasi baru
            </h2>
            <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
              Sistem akan membuat Consultation Session dengan identifier unik. Anda dapat
              berbicara langsung, atau mengetik bila mikrofon tidak tersedia.
            </p>
          </div>

          <Button size="lg" onClick={handleStart} disabled={starting}>
            <Sparkles className="size-4" />
            Mulai Konsultasi
          </Button>

          <div className="grid w-full gap-3 border-t border-border pt-6 text-left sm:grid-cols-2">
            <div className="flex gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="size-4 shrink-0 text-primary" />
              Transkrip &amp; ringkasan Anda dienkripsi sebelum disimpan.
            </div>
            <div className="flex gap-2 text-xs text-muted-foreground">
              <Sparkles className="size-4 shrink-0 text-primary" />
              Respons AI selalu disertai evidence yang dapat ditelusuri.
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
