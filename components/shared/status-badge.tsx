import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Loader2,
  ShieldCheck,
  CircleAlert,
  CircleCheck,
  Circle,
  ScanLine,
  ImageOff,
} from "lucide-react";

type Status =
  | "ACTIVE"
  | "COMPLETING"
  | "SUMMARY_GENERATION"
  | "SECURITY_PROCESSING"
  | "COMPLETED"
  | "UPLOADED"
  | "IMAGE_QUALITY_FAILED"
  | "PROCESSING"
  | "NEEDS_VERIFICATION"
  | "VERIFIED";

const CONFIG: Record<
  Status,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ElementType; spin?: boolean }
> = {
  ACTIVE: { label: "Berlangsung", variant: "default", icon: Circle },
  COMPLETING: { label: "Menyelesaikan", variant: "secondary", icon: Loader2, spin: true },
  SUMMARY_GENERATION: { label: "Membuat Ringkasan", variant: "secondary", icon: Loader2, spin: true },
  SECURITY_PROCESSING: { label: "Mengenkripsi", variant: "secondary", icon: ShieldCheck },
  COMPLETED: { label: "Selesai", variant: "outline", icon: CircleCheck },
  UPLOADED: { label: "Terunggah", variant: "secondary", icon: Circle },
  IMAGE_QUALITY_FAILED: { label: "Kualitas Gambar Kurang", variant: "destructive", icon: ImageOff },
  PROCESSING: { label: "Memproses OCR", variant: "secondary", icon: ScanLine },
  NEEDS_VERIFICATION: { label: "Perlu Verifikasi", variant: "destructive", icon: CircleAlert },
  VERIFIED: { label: "Terverifikasi", variant: "outline", icon: CircleCheck },
};

export function StatusBadge({ status, className }: { status: Status; className?: string }) {
  const cfg = CONFIG[status];
  const Icon = cfg.icon;
  return (
    <Badge variant={cfg.variant} className={cn("gap-1", className)}>
      <Icon className={cn("size-3", cfg.spin && "animate-spin")} />
      {cfg.label}
    </Badge>
  );
}

const RISK_CONFIG: Record<
  string,
  { label: string; className: string }
> = {
  LOW_RISK: { label: "Risiko Rendah", className: "bg-muted text-muted-foreground" },
  MEDIUM_RISK: { label: "Risiko Sedang", className: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300" },
  HIGH_RISK: { label: "Risiko Tinggi", className: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300" },
  EMERGENCY_SIGNAL: { label: "Sinyal Darurat", className: "bg-destructive/15 text-destructive" },
};

export function RiskBadge({ risk }: { risk: string }) {
  const cfg = RISK_CONFIG[risk] ?? RISK_CONFIG.LOW_RISK;
  return <Badge className={cn("border-0", cfg.className)}>{cfg.label}</Badge>;
}
