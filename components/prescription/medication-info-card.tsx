import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { MedicationInfo } from "@/lib/types";
import { Pill, CircleAlert, Info, Sparkles } from "lucide-react";

const SOURCE_LABEL: Record<string, string> = {
  openai: "Penjelasan AI",
  local_kb: "Basis data obat",
};

export function MedicationInfoCard({ medication }: { medication: MedicationInfo }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Pill className="size-4" />
            </div>
            <p className="font-heading text-base font-semibold text-foreground">
              {medication.medicine_name}
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            {medication.source && SOURCE_LABEL[medication.source] && (
              <Badge variant="outline" className="gap-1">
                {medication.source === "openai" && <Sparkles className="size-3" />}
                {SOURCE_LABEL[medication.source]}
              </Badge>
            )}
            {!medication.matched && (
              <Badge variant="destructive" className="gap-1">
                <CircleAlert className="size-3" /> MEDICATION_MATCH_FAILED
              </Badge>
            )}
          </div>
        </div>

        <p className="text-sm text-muted-foreground">{medication.general_use}</p>

        {medication.how_it_works && (
          <div>
            <p className="text-[11px] font-medium text-muted-foreground uppercase">
              Cara kerja
            </p>
            <p className="text-sm text-muted-foreground">{medication.how_it_works}</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 rounded-lg bg-muted/50 p-3 text-sm sm:grid-cols-4">
          <div>
            <p className="text-[11px] text-muted-foreground uppercase">Dosis</p>
            <p className="font-medium text-foreground">{medication.dosage_as_written}</p>
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground uppercase">Frekuensi</p>
            <p className="font-medium text-foreground">{medication.frequency_as_written}</p>
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground uppercase">Rute</p>
            <p className="font-medium text-foreground">{medication.route}</p>
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground uppercase">Aturan Pakai</p>
            <p className="font-medium text-foreground">{medication.prescription_instruction}</p>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          {medication.important_general_information.map((info, i) => (
            <div key={i} className="flex gap-1.5 text-xs text-muted-foreground">
              <Info className="mt-0.5 size-3 shrink-0" />
              {info}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
