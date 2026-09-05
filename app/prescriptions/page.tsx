"use client";

import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useConsultationSessions, usePrescriptions } from "@/lib/store";
import { conditionOf, CONDITION_KIND_LABEL } from "@/lib/consultation-condition";
import { Pill, ChevronRight, MessageCircle } from "lucide-react";

/**
 * "Resep" — the medicines from each consultation. Cards match the Riwayat
 * Konsultasi style, but here a click goes straight to the medicine
 * descriptions (on Riwayat it opens the consultation detail). Each card
 * also says which consultation the medicine came from.
 */
export default function PrescriptionsPage() {
  const records = usePrescriptions();
  const sessions = useConsultationSessions();
  const sessionById = new Map(sessions.map((s) => [s.id, s]));

  return (
    <div className="mx-auto max-w-4xl px-6 py-14">
      <PageHeader
        title="Resep"
        description="Obat dari tiap konsultasi Anda. Klik untuk langsung melihat penjelasan tiap obat."
      />

      {records.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border py-16 text-center">
          <Pill className="size-8 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">Belum ada resep tercatat</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Resep diunggah dari dalam sesi konsultasi (Phase 3), setelah validasi dokter dicatat.
          </p>
          <Button className="mt-2" render={<Link href="/consultations/history" />}>
            <MessageCircle className="size-4" />
            Buka Riwayat Konsultasi
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {records.map((record) => {
            const session = sessionById.get(record.consultationId);
            const cond = conditionOf(session);
            const medNames =
              record.medications.length > 0
                ? record.medications.map((m) => m.medicine_name)
                : record.items.map((i) => i.medicine_name.value);

            return (
              <Link key={record.id} href={`/prescriptions/${record.id}`}>
                <Card className="transition-shadow hover:shadow-md">
                  <CardContent className="flex flex-col gap-3">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                          <Pill className="size-4" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{cond.label}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(record.createdAt).toLocaleString("id-ID")}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="hidden gap-1 sm:flex">
                          {medNames.slice(0, 2).map((name, i) => (
                            <Badge key={i} variant="secondary">
                              {name}
                            </Badge>
                          ))}
                          {medNames.length > 2 && (
                            <Badge variant="secondary">+{medNames.length - 2}</Badge>
                          )}
                        </div>
                        <StatusBadge status={record.status as "PROCESSING"} />
                        <ChevronRight className="size-4 text-muted-foreground" />
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 border-t border-border pt-3 text-xs text-muted-foreground">
                      <MessageCircle className="size-3.5 shrink-0" />
                      Dari konsultasi:{" "}
                      <span className="text-foreground">
                        {session
                          ? `${session.summary?.chief_complaint ?? session.healthContext.chief_complaint ?? "keluhan tidak tercatat"} · ${new Date(
                              session.createdAt
                            ).toLocaleDateString("id-ID", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}`
                          : "konsultasi tidak ditemukan"}
                      </span>
                      {cond.kind !== "unknown" && (
                        <Badge variant="outline" className="ml-1">
                          {CONDITION_KIND_LABEL[cond.kind]}
                        </Badge>
                      )}
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
