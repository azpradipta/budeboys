"use client";

import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { usePrescriptions } from "@/lib/store";
import { ScanLine, Plus, ChevronRight } from "lucide-react";

export default function PrescriptionHistoryPage() {
  const records = usePrescriptions();

  return (
    <div className="mx-auto max-w-4xl px-6 py-14">
      <PageHeader
        title="Riwayat Resep"
        description="Semua resep yang pernah Anda unggah, beserta status pembacaan dan verifikasinya."
        actions={
          <Button render={<Link href="/prescriptions" />}>
            <Plus className="size-4" />
            Unggah Resep
          </Button>
        }
      />

      {records.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border py-16 text-center">
          <ScanLine className="size-8 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">Belum ada resep diunggah</p>
          <Button className="mt-2" render={<Link href="/prescriptions" />}>
            Unggah Resep Pertama
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {records.map((record) => (
            <Link key={record.id} href={`/prescriptions/${record.id}`}>
              <Card className="transition-shadow hover:shadow-md">
                <CardContent className="flex items-center gap-4">
                  {record.imageDataUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={record.imageDataUrl}
                      alt=""
                      className="size-12 shrink-0 rounded-lg border border-border object-cover"
                    />
                  ) : (
                    <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <ScanLine className="size-5" />
                    </div>
                  )}
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
