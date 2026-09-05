"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ConfidenceField } from "@/components/shared/confidence-field";
import type { PrescriptionItem } from "@/lib/types";
import { Camera, CircleCheck } from "lucide-react";

const FIELD_LABELS: { key: keyof PrescriptionItem; label: string }[] = [
  { key: "medicine_name", label: "Nama Obat" },
  { key: "strength", label: "Dosis" },
  { key: "frequency", label: "Frekuensi" },
  { key: "quantity", label: "Jumlah" },
  { key: "route", label: "Rute" },
  { key: "instruction", label: "Aturan Pakai" },
];

export function PrescriptionVerify({
  items,
  onChangeItems,
  onConfirmAll,
  previewUrl,
  retakeHref,
  busy = false,
}: {
  items: PrescriptionItem[];
  onChangeItems: (items: PrescriptionItem[]) => void;
  onConfirmAll: () => void;
  // Object URL dari file sementara di klien, karena record tidak membawa gambar.
  previewUrl: string | null;
  retakeHref: string;
  // True selama penjelasan obat sedang dibuat.
  busy?: boolean;
}) {
  function updateField(itemIdx: number, key: keyof PrescriptionItem, value: string) {
    const next = items.map((item, i) => {
      if (i !== itemIdx) return item;
      const current = item[key];
      if (!current || typeof current !== "object") return item;
      return { ...item, [key]: { ...current, value } };
    });
    onChangeItems(next);
  }

  function verifyField(itemIdx: number, key: keyof PrescriptionItem) {
    const next = items.map((item, i) => {
      if (i !== itemIdx) return item;
      const current = item[key];
      if (!current || typeof current !== "object") return item;
      return { ...item, [key]: { ...current, verified: true, needsVerification: false } };
    });
    onChangeItems(next);
  }

  function verifyAll() {
    const next = items.map((item) => {
      let updated = item;
      for (const { key } of FIELD_LABELS) {
        const current = updated[key];
        if (current && typeof current === "object") {
          updated = {
            ...updated,
            [key]: { ...current, verified: true, needsVerification: false },
          };
        }
      }
      return updated;
    });
    onChangeItems(next);
  }

  const allVerified = items.every((item) =>
    FIELD_LABELS.every(({ key }) => {
      const f = item[key];
      return !f || typeof f !== "object" || f.verified || !f.needsVerification;
    })
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      {previewUrl && (
        <Card className="h-fit">
          <CardContent>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="Foto resep"
              className="w-full rounded-lg border border-border object-cover"
            />
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col gap-5">
        {!allVerified && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-amber-50 px-3 py-2 text-sm dark:bg-amber-950/30">
            <span className="text-amber-800 dark:text-amber-300">
              Periksa hasil bacaan di bawah, lalu konfirmasi.
            </span>
            <Button size="sm" variant="outline" onClick={verifyAll} disabled={busy}>
              <CircleCheck className="size-3.5" />
              Konfirmasi Semua
            </Button>
          </div>
        )}

        {items.map((item, itemIdx) => (
          <Card key={item.id}>
            <CardContent className="flex flex-col gap-3">
              <p className="text-xs font-semibold tracking-wide text-primary uppercase">
                Item Resep {itemIdx + 1}
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {FIELD_LABELS.map(({ key, label }) => {
                  const value = item[key];
                  if (!value || typeof value !== "object") return null;
                  return (
                    <ConfidenceField
                      key={key}
                      label={label}
                      field={value}
                      onChange={(v) => updateField(itemIdx, key, v)}
                      onVerify={() => verifyField(itemIdx, key)}
                    />
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))}

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-4">
          <Button variant="outline" render={<Link href={retakeHref} />}>
            <Camera className="size-3.5" />
            Retake Photo
          </Button>
          <Button onClick={onConfirmAll} disabled={!allVerified || busy}>
            <CircleCheck className="size-4" />
            {busy
              ? "Menyusun penjelasan obat…"
              : allVerified
                ? "Lihat Informasi Obat"
                : "Konfirmasi semua field dulu"}
          </Button>
        </div>
      </div>
    </div>
  );
}
