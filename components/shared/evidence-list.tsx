import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { EvidenceReference } from "@/lib/types";
import { BookOpen, ExternalLink } from "lucide-react";

const SOURCE_TYPE_LABEL: Record<string, string> = {
  journal: "Jurnal",
  systematic_review: "Systematic Review",
  clinical_guideline: "Clinical Guideline",
  authoritative_health_source: "Sumber Kesehatan Otoritatif",
};

// Setiap referensi selalu punya satu link akses: URL tervalidasi bila ada,
// lalu resolver doi.org bila DOI-nya valid, terakhir pencarian Google Scholar.
function accessLink(source: EvidenceReference["source"]): { href: string; label: string } {
  if (source.url) return { href: source.url, label: "Buka sumber" };

  const doi = (source.doi ?? "").trim().replace(/^https?:\/\/(dx\.)?doi\.org\//i, "");
  if (/^10\.\d{4,9}\/\S+$/.test(doi)) {
    return { href: `https://doi.org/${doi}`, label: `doi.org/${doi}` };
  }

  return {
    href: `https://scholar.google.com/scholar?q=${encodeURIComponent(source.title)}`,
    label: "Cari di Google Scholar",
  };
}

export function EvidenceList({
  evidence,
  maxHeightClass,
}: {
  evidence: EvidenceReference[];
  // Kelas Tailwind pembatas tinggi; bila diisi, daftar jadi area scroll.
  maxHeightClass?: string;
}) {
  if (evidence.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">Belum ada evidence yang dikutip.</p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <Accordion
        className={cn(
          "rounded-lg border border-border",
          maxHeightClass && `${maxHeightClass} overflow-y-auto`
        )}
      >
        {evidence.map((ref, i) => {
          const meta = [ref.source.authors, ref.source.publication_year, ref.source.publisher]
            .filter(Boolean)
            .join(" · ");
          const link = accessLink(ref.source);
          const description = (ref.snippet || ref.source.abstract || "").trim();
          const typeLabel =
            SOURCE_TYPE_LABEL[ref.source.source_type] ?? ref.source.source_type;

          return (
            <AccordionItem
              key={ref.source.source_id || i}
              value={ref.source.source_id || `ref-${i}`}
              className="px-3"
            >
              <AccordionTrigger className="gap-3">
                <span className="flex min-w-0 flex-1 items-start gap-2.5 pr-2">
                  <BookOpen className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span className="text-sm font-medium text-foreground">
                    {ref.source.title}
                  </span>
                </span>
              </AccordionTrigger>

              <AccordionContent className="pl-[1.625rem]">
                <div className="flex flex-col gap-2 [&_p]:mb-0!">
                  <Badge variant="outline" className="w-fit">
                    {typeLabel}
                  </Badge>

                  {meta && <p className="text-xs text-muted-foreground">{meta}</p>}

                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex w-fit max-w-full items-center gap-1 text-xs text-primary hover:text-primary/80"
                  >
                    <ExternalLink className="size-3 shrink-0" />
                    <span className="truncate">{link.label}</span>
                  </a>

                  {description ? (
                    <p className="text-sm text-muted-foreground">{description}</p>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">
                      Ringkasan tidak disertakan oleh sumber. Buka tautan di atas untuk isi
                      lengkapnya.
                    </p>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>

      <p className="text-[11px] text-muted-foreground">
        Diurutkan berdasarkan relevansi. Klik tiap referensi untuk detail dan link crosscheck.
      </p>
    </div>
  );
}
