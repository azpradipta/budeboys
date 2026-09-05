import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { EvidenceReference } from "@/lib/types";
import { BookOpen } from "lucide-react";

const SOURCE_TYPE_LABEL: Record<string, string> = {
  journal: "Jurnal",
  systematic_review: "Systematic Review",
  clinical_guideline: "Clinical Guideline",
  authoritative_health_source: "Sumber Kesehatan Otoritatif",
};

export function EvidenceList({ evidence }: { evidence: EvidenceReference[] }) {
  if (evidence.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">Belum ada evidence yang dikutip.</p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {evidence.map((ref) => (
        <Card key={ref.source.source_id} size="sm">
          <CardContent className="flex gap-3">
            <BookOpen className="mt-0.5 size-4 shrink-0 text-primary" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <p className="text-sm font-medium text-foreground">{ref.source.title}</p>
                <Badge variant="outline" className="shrink-0">
                  {SOURCE_TYPE_LABEL[ref.source.source_type] ?? ref.source.source_type}
                </Badge>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {ref.source.authors} · {ref.source.publication_year} · {ref.source.publisher}
              </p>
              <p className="mt-1.5 text-sm text-muted-foreground">{ref.snippet}</p>
            </div>
          </CardContent>
        </Card>
      ))}
      <p className="text-[11px] text-muted-foreground">
        Sumber demo/ilustratif secara lokal — pada production akan diganti index evidence
        sungguhan (jurnal, systematic review, clinical guideline).
      </p>
    </div>
  );
}
