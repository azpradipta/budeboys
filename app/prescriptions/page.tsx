"use client";

import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { usePrescriptions } from "@/lib/store";
import { ScanLine, ChevronRight, MessageCircle } from "lucide-react";

/**
 * Read-only: prescriptions can only be created from within the consultation
 * they belong to (Phase 3, on /consultations/[id]) — this page just lists
 * what's already been uploaded across all of a user's consultations.
 */
export default function PrescriptionsPage() {
  const records = usePrescriptions();

  return (
    <div className="mx-auto max-w-4xl px-6 py-14">
      <PageHeader
        title="Resep Saya"
        description="Semua resep yang pernah Anda unggah dari sesi konsultasi, beserta status pembacaan dan verifikasinya."
      />

      {records.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border py-16 text-center">
          <ScanLine className="size-8 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">Belum ada resep diunggah</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Resep hanya bisa diunggah dari dalam sesi konsultasi, setelah validasi dokter
            tercatat (Phase 3).
          </p>
          <Button className="mt-2" render={<Link href="/consultations/history" />}>
            <MessageCircle className="size-4" />
            Buka Riwayat Konsultasi
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {records.map((record) => (
            <Link key={record.id} href={`/prescriptions/${record.id}`}>
              <Card className="transition-shadow hover:shadow-md">
                <CardContent className="flex items-center gap-4">
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <ScanLine className="size-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {record.items[0]?.medicine_name.value ?? record.fileName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(record.createdAt).toLocaleString("id-ID")}
                    </p>
                  </div>
                  <StatusBadge status={record.status as "PROCESSING"} />
                  <ChevronRight className="size-4 text-muted-foreground" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
