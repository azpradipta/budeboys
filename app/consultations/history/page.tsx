"use client";

import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useConsultationSessions } from "@/lib/store";
import { MessageCircle, Plus, ChevronRight } from "lucide-react";

export default function ConsultationHistoryPage() {
  const sessions = useConsultationSessions();

  return (
    <div className="mx-auto max-w-4xl px-6 py-14">
      <PageHeader
        title="Riwayat Konsultasi"
        description="Semua sesi konsultasi AI yang pernah Anda mulai, lengkap dengan status dan ringkasannya."
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
          {sessions.map((session) => (
            <Link key={session.id} href={`/consultations/${session.id}`}>
              <Card className="transition-shadow hover:shadow-md">
                <CardContent className="flex items-center justify-between gap-4">
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
                </CardContent>
              </Card>
            </Link>
          ))}
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
