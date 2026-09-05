"use client";

import { useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useConsultationSessions } from "@/lib/store";
import { Lock, ShieldCheck, FileLock2, ChevronRight, Fingerprint } from "lucide-react";

export default function RecordsPage() {
  const [authState, setAuthState] = useState<"locked" | "checking" | "unlocked">("locked");
  const sessions = useConsultationSessions().filter((s) => s.status === "COMPLETED");

  function authenticate() {
    setAuthState("checking");
    setTimeout(() => setAuthState("unlocked"), 900);
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-14">
      <PageHeader
        title="Rekam Medis"
        description="HealthRecord Anda dienkripsi sebelum disimpan dan hanya dapat diakses oleh Anda setelah autentikasi."
      />

      <Alert className="mb-8">
        <ShieldCheck className="size-4" />
        <AlertTitle>Privasi &amp; Keamanan</AlertTitle>
        <AlertDescription>
          &ldquo;Your consultation record is encrypted and can only be accessed through your
          authorized account.&rdquo; Data yang tersimpan: transcript, summary, symptom
          information, health assessment, prescription image, medication information.
        </AlertDescription>
      </Alert>

      {authState !== "unlocked" ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-14 text-center">
            <div className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Lock className="size-6" />
            </div>
            <div>
              <p className="font-heading text-lg font-semibold text-foreground">
                Rekam medis terkunci
              </p>
              <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
                Autentikasi diperlukan sebelum sistem melakukan authorization check dan
                dekripsi record.
              </p>
            </div>
            <Button onClick={authenticate} disabled={authState === "checking"}>
              <Fingerprint className="size-4" />
              {authState === "checking" ? "Memverifikasi…" : "Autentikasi & Buka Rekam"}
            </Button>
          </CardContent>
        </Card>
      ) : sessions.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border py-16 text-center">
          <FileLock2 className="size-8 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">Belum ada rekam medis</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Rekam medis muncul di sini setelah Anda menyelesaikan sebuah konsultasi.
          </p>
          <Button className="mt-2" render={<Link href="/consultations" />}>
            Mulai Konsultasi
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {sessions.map((session) => (
            <Link key={session.id} href={`/consultations/${session.id}`}>
              <Card className="transition-shadow hover:shadow-md">
                <CardContent className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <ShieldCheck className="size-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {session.summary?.chief_complaint}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Diselesaikan{" "}
                        {session.completedAt &&
                          new Date(session.completedAt).toLocaleString("id-ID")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="gap-1">
                      <Lock className="size-3" /> Encrypted
                    </Badge>
                    <ChevronRight className="size-4 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
