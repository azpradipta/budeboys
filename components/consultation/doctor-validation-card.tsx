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
import { Stethoscope, ClipboardCheck } from "lucide-react";

export function DoctorValidationCard({
  validation,
  onSave,
}: {
  validation?: DoctorValidation;
  onSave: (validation: DoctorValidation) => void;
}) {
  const [open, setOpen] = useState(false);
  const [confirmed, setConfirmed] = useState("");
  const [corrected, setCorrected] = useState("");
  const [notes, setNotes] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [treatment, setTreatment] = useState("");

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

  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Stethoscope className="size-4 text-primary" />
          <p className="text-xs font-semibold tracking-wide text-primary uppercase">
            Phase 2 · Validasi Dokter
          </p>
        </div>

        {validation ? (
          <div className="flex flex-col gap-3 text-sm">
            <div>
              <p className="text-[11px] font-medium text-muted-foreground uppercase">
                Diagnosis <span className="text-primary">(source: DOCTOR)</span>
              </p>
              <p className="text-foreground">{validation.diagnosis || "-"}</p>
            </div>
            <div>
              <p className="text-[11px] font-medium text-muted-foreground uppercase">Treatment</p>
              <p className="text-foreground">{validation.treatment || "-"}</p>
            </div>
            {validation.additional_notes && (
              <div>
                <p className="text-[11px] font-medium text-muted-foreground uppercase">
                  Catatan Tambahan
                </p>
                <p className="text-foreground">{validation.additional_notes}</p>
              </div>
            )}
            <p className="text-[11px] text-muted-foreground">
              Dicatat {new Date(validation.recorded_at).toLocaleString("id-ID")}
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Bawa ringkasan ini ke konsultasi dokter langsung. Untuk keperluan demo, validasi
            dokter dapat dicatat manual di bawah ini. Diagnosis tetap bersumber dari dokter,
            bukan AI.
          </p>
        )}

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button variant="outline" size="sm" className="w-fit" />}>
            <ClipboardCheck className="size-3.5" />
            {validation ? "Perbarui Validasi Dokter" : "Catat Validasi Dokter (Demo)"}
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Doctor Validation</DialogTitle>
              <DialogDescription>
                Merepresentasikan tahap pemeriksaan klinis langsung. Diagnosis di sini akan
                tersimpan dengan provenance <code>source = DOCTOR</code>.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="confirmed">Confirmed Information</Label>
                <Textarea
                  id="confirmed"
                  placeholder="Satu poin per baris"
                  value={confirmed}
                  onChange={(e) => setConfirmed(e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="corrected">Corrected Information</Label>
                <Textarea
                  id="corrected"
                  placeholder="Satu poin per baris"
                  value={corrected}
                  onChange={(e) => setCorrected(e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="diagnosis">Diagnosis</Label>
                <Textarea
                  id="diagnosis"
                  value={diagnosis}
                  onChange={(e) => setDiagnosis(e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="treatment">Treatment</Label>
                <Textarea
                  id="treatment"
                  value={treatment}
                  onChange={(e) => setTreatment(e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="notes">Additional Notes</Label>
                <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Batal
              </Button>
              <Button onClick={handleSave}>Simpan Validasi</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
