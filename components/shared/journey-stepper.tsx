import { cn } from "@/lib/utils";
import { MessageCircle, Stethoscope, Pill } from "lucide-react";

const PHASES = [
  { key: "understand", label: "Understand", desc: "Konsultasi AI", icon: MessageCircle },
  { key: "validate", label: "Validate", desc: "Dokter", icon: Stethoscope },
  { key: "treatment", label: "Understand Treatment", desc: "Resep & Obat", icon: Pill },
] as const;

export function JourneyStepper({
  active,
  className,
}: {
  active: "understand" | "validate" | "treatment";
  className?: string;
}) {
  const activeIdx = PHASES.findIndex((p) => p.key === active);
  return (
    <div className={cn("flex items-center gap-2 sm:gap-4", className)}>
      {PHASES.map((phase, idx) => {
        const Icon = phase.icon;
        const state = idx < activeIdx ? "done" : idx === activeIdx ? "active" : "upcoming";
        return (
          <div key={phase.key} className="flex items-center gap-2 sm:gap-4">
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-full ring-1",
                  state === "active" && "bg-primary text-primary-foreground ring-primary",
                  state === "done" && "bg-primary/15 text-primary ring-primary/30",
                  state === "upcoming" && "bg-muted text-muted-foreground ring-border"
                )}
              >
                <Icon className="size-4" />
              </div>
              <div className="hidden sm:block">
                <p
                  className={cn(
                    "text-xs font-medium",
                    state === "upcoming" ? "text-muted-foreground" : "text-foreground"
                  )}
                >
                  {phase.label}
                </p>
                <p className="text-[11px] text-muted-foreground">{phase.desc}</p>
              </div>
            </div>
            {idx < PHASES.length - 1 && (
              <div
                className={cn(
                  "h-px w-6 shrink-0 sm:w-10",
                  idx < activeIdx ? "bg-primary/40" : "bg-border"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
