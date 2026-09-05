"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { DoctorValidation } from "@/lib/types";
import {
  Stethoscope,
  ClipboardEdit,
  CheckCircle2,
  FileEdit,
} from "lucide-react";

export function DoctorValidationCard({
  validation,
  onSave,
}: {
  validation?: DoctorValidation;
  onSave: (validation: DoctorValidation) => void;
}) {
  const [open, setOpen] = useState(false);
  const [confirmed, setConfirmed] = useState(
    validation?.confirmed_information?.join("\n") || "",
  );
  const [corrected, setCorrected] = useState(
    validation?.corrected_information?.join("\n") || "",
  );
  const [notes, setNotes] = useState(validation?.additional_notes || "");
  const [diagnosis, setDiagnosis] = useState(validation?.diagnosis || "");
  const [treatment, setTreatment] = useState(validation?.treatment || "");

  function handleSave() {
    onSave({
      confirmed_information: confirmed
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
      corrected_information: corrected
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
      additional_notes: notes,
      diagnosis,
      treatment,
      source: "DOCTOR",
      recorded_at: new Date().toISOString(),
    });
    setOpen(false);
  }

  // Tampilan ketika dokter SUDAH mengisi validasi (Mode Selesai)
  if (validation) {
    return (
      <Card className="border-primary/20 shadow-sm relative overflow-hidden mt-6">
        {/* Aksen garis vertikal sedikit dipudarkan menandakan tahap sudah lewat */}
        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-primary/60"></div>

        <CardContent className="p-6 pl-8 flex flex-col gap-5">
          <div className="flex items-start sm:items-center justify-between flex-col sm:flex-row gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 p-2 rounded-full">
                <CheckCircle2 className="size-4 text-primary" />
              </div>
              <div>
                <p className="text-xs font-bold tracking-wide text-primary uppercase">
                  Tahap 2 · Selesai
                </p>
                <h3 className="font-heading text-lg font-bold text-foreground">
                  Validasi Hasil Pemeriksaan
                </h3>
              </div>
            </div>

            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger
                render={
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-primary"
                  />
                }
              >
                <FileEdit className="size-4 mr-1.5" /> Edit Catatan
              </DialogTrigger>
              <ValidationFormDialog
                states={{ confirmed, corrected, notes, diagnosis, treatment }}
                setters={{
                  setConfirmed,
                  setCorrected,
                  setNotes,
                  setDiagnosis,
                  setTreatment,
                }}
                onSave={handleSave}
                onCancel={() => setOpen(false)}
              />
            </Dialog>
          </div>

          {/* Grid Informasi Ringkas menggunakan warna muted */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-muted/40 p-5 rounded-xl border border-border">
            <div>
              <p className="text-[11px] font-bold text-muted-foreground uppercase mb-1">
                Diagnosis Medis
              </p>
              <p className="font-semibold text-foreground">
                {validation.diagnosis || "Tidak disebutkan"}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-bold text-muted-foreground uppercase mb-1">
                Tindakan / Perawatan
              </p>
              <p className="font-semibold text-foreground">
                {validation.treatment || "Tidak disebutkan"}
              </p>
            </div>
            {validation.additional_notes && (
              <div className="md:col-span-2 mt-2 pt-2 border-t border-border/50">
                <p className="text-[11px] font-bold text-muted-foreground uppercase mb-1">
                  Catatan Tambahan
                </p>
                <p className="text-sm text-muted-foreground">
                  {validation.additional_notes}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Tampilan ketika dokter BELUM mengisi (Mode Aktif / CTA)
  return (
    <Card className="border-primary/20 shadow-md relative overflow-hidden ring-1 ring-primary/5 mt-6">
      <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-primary"></div>

      <CardContent className="p-6 pl-8 flex flex-col gap-5">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 p-2.5 rounded-full">
            <Stethoscope className="size-5 text-primary" />
          </div>
          <div>
            <p className="text-xs font-bold tracking-wide text-primary uppercase">
              Tahap 2
            </p>
            <h3 className="font-heading text-lg font-bold text-foreground">
              Validasi Hasil Pemeriksaan
            </h3>
          </div>
        </div>

        <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
          Tunjukkan ringkasan AI sebelumnya kepada dokter Anda. Setelah selesai
          berkonsultasi, catat diagnosis dan saran tindakan dari dokter di sini
          untuk mengaktifkan tahap edukasi resep (Tahap 3).
        </p>

        <div className="pt-2">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger
              render={
                <Button size="lg" className="w-full sm:w-fit font-semibold" />
              }
            >
              <ClipboardEdit className="size-5 mr-2" />
              Catat Hasil Konsultasi Dokter
            </DialogTrigger>
            <ValidationFormDialog
              states={{ confirmed, corrected, notes, diagnosis, treatment }}
              setters={{
                setConfirmed,
                setCorrected,
                setNotes,
                setDiagnosis,
                setTreatment,
              }}
              onSave={handleSave}
              onCancel={() => setOpen(false)}
            />
          </Dialog>
        </div>
      </CardContent>
    </Card>
  );
}

// Komponen Helper Dialog
function ValidationFormDialog({ states, setters, onSave, onCancel }: any) {
  return (
    <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="text-xl">
          Catatan Pemeriksaan Dokter
        </DialogTitle>
        <DialogDescription>
          Data ini menjadi acuan utama. Pastikan diagnosis dan tindakan ditulis
          sesuai arahan tenaga medis profesional.
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-5 py-4">
        <div className="grid gap-2">
          <Label htmlFor="diagnosis" className="font-bold">
            Diagnosis Akhir <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="diagnosis"
            placeholder="Contoh: Faringitis Akut"
            value={states.diagnosis}
            onChange={(e) => setters.setDiagnosis(e.target.value)}
            className="resize-none"
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="treatment" className="font-bold">
            Tindakan / Rencana Perawatan
          </Label>
          <Textarea
            id="treatment"
            placeholder="Contoh: Istirahat cukup, hindari makanan berminyak, resep obat terlampir."
            value={states.treatment}
            onChange={(e) => setters.setTreatment(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="confirmed" className="text-sm">
              Gejala yang Dikonfirmasi
            </Label>
            <Textarea
              id="confirmed"
              placeholder="Gejala AI yang dibenarkan dokter"
              value={states.confirmed}
              onChange={(e) => setters.setConfirmed(e.target.value)}
              className="text-sm h-24"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="corrected" className="text-sm">
              Koreksi Informasi
            </Label>
            <Textarea
              id="corrected"
              placeholder="Fakta medis yang diluruskan dokter"
              value={states.corrected}
              onChange={(e) => setters.setCorrected(e.target.value)}
              className="text-sm h-24"
            />
          </div>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="notes">Catatan Tambahan (Opsional)</Label>
          <Textarea
            id="notes"
            value={states.notes}
            onChange={(e) => setters.setNotes(e.target.value)}
          />
        </div>
      </div>

      <DialogFooter className="gap-3">
        <Button variant="outline" onClick={onCancel}>
          Batal
        </Button>
        <Button onClick={onSave} className="font-semibold">
          Simpan Validasi
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
