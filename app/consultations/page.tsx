"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import DashboardHeader from "@/components/DashboardHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { createSession } from "@/lib/health-ai";
import { saveSession, useConsultationSessions } from "@/lib/store";
import { Mic, Sparkles, ShieldCheck, ArrowRight, History } from "lucide-react";
import Image from "next/image";

export default function StartConsultationPage() {
  const router = useRouter();
  const [starting, setStarting] = useState(false);
  const activeSession = useConsultationSessions().find(
    (s) => s.status !== "COMPLETED",
  );

  function handleStart() {
    setStarting(true);
    const session = createSession();
    saveSession(session);
    router.push(`/consultations/${session.id}`);
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-26 space-y-6">
      <DashboardHeader
        heading="Mulai Konsultasi"
        subHeading="Mulai sesi konsultasi baru atau lanjutkan yang sedang berlangsung."
      />

      {activeSession && (
        <Alert className="mb-6">
          <History className="size-4" />
          <AlertTitle>Ada sesi yang belum selesai</AlertTitle>
          <AlertDescription>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <span>
                Sesi konsultasi dibuat pada{" "}
                {new Date(activeSession.createdAt).toLocaleString("id-ID")}{" "}
                masih aktif.
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  router.push(`/consultations/${activeSession.id}`)
                }
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
          <div className="flex items-center justify-center ">
            <Image
              src="/assets/mulai-konsul.svg"
              alt="Mulai Konsultasi"
              width={200}
              height={200}
            />
          </div>
          <div>
            <h2 className="font-heading text-lg font-semibold text-foreground">
              Sesi konsultasi baru
            </h2>
            <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
              Sistem akan membuat Consultation Session dengan identifier unik.
              Anda dapat berbicara langsung, atau mengetik bila mikrofon tidak
              tersedia.
            </p>
          </div>

          <Button size="lg" onClick={handleStart} disabled={starting}>
            <Mic className="size-4" />
            Mulai Konsultasi
          </Button>

          <div className=" border-t border-border pt-6 w-full text-left space-y-2">
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
