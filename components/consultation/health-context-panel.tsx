import { Badge } from "@/components/ui/badge";
import type { HealthContext } from "@/lib/types";

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <p className="text-[11px] font-medium text-muted-foreground uppercase">{label}</p>
      <p className="text-sm text-foreground">
        {value ?? <span className="text-muted-foreground italic">unknown</span>}
      </p>
    </div>
  );
}

function ListField({ label, values }: { label: string; values: string[] }) {
  return (
    <div>
      <p className="text-[11px] font-medium text-muted-foreground uppercase">{label}</p>
      {values.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">unknown</p>
      ) : (
        <div className="mt-1 flex flex-wrap gap-1">
          {values.map((v, i) => (
            <Badge key={i} variant="secondary">
              {v}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

export function HealthContextPanel({ context }: { context: HealthContext }) {
  return (
    <div className="flex flex-col gap-4">
      <Field label="Chief Complaint" value={context.chief_complaint} />
      <ListField label="Symptoms" values={context.symptoms} />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Duration" value={context.duration} />
        <Field
          label="Severity"
          value={context.severity === "unknown" ? null : context.severity}
        />
      </div>
      <Field label="Onset" value={context.onset} />
      <Field label="Progression" value={context.progression} />
      <ListField label="Associated Symptoms" values={context.associated_symptoms} />
      <ListField label="Allergy Information" values={context.allergy_information} />
      <ListField label="Relevant History" values={context.relevant_history} />
      <p className="border-t border-border pt-3 text-[11px] text-muted-foreground">
        Field yang belum diketahui bernilai <span className="italic">unknown</span>, tidak
        pernah diasumsikan.
      </p>
    </div>
  );
}
