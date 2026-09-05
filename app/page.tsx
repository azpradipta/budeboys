import Link from "next/link";
import HeroSection from "@/components/HeroSection";
import { JourneyStepper } from "@/components/shared/journey-stepper";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  MessageCircle,
  History,
  ScanLine,
  ArrowRight,
  BadgeCheck,
  BookMarked,
  Link2,
  AlertTriangle,
  Lock,
} from "lucide-react";

const quickActions = [
  {
    title: "Mulai Konsultasi",
    description: "Ceritakan keluhan Anda lewat suara, dapatkan informasi berbasis evidence.",
    href: "/consultations",
    icon: MessageCircle,
  },
  {
    title: "Riwayat Konsultasi",
    description:
      "Lihat kembali seluruh perjalanan tiap sesi: konsultasi, validasi dokter, hingga resep.",
    href: "/consultations/history",
    icon: History,
  },
  {
    title: "Resep Saya",
    description: "Lihat resep yang sudah diunggah dari sesi konsultasi Anda.",
    href: "/prescriptions",
    icon: ScanLine,
  },
];

const frictionPoints = [
  "Sulit menjelaskan keluhan secara sistematis ke tenaga kesehatan.",
  "Informasi kesehatan online belum tentu relevan dengan konteks Anda.",
  "Cerita di percakapan awal sering tidak terbawa saat bertemu dokter.",
  "Tulisan & istilah pada resep sulit dipahami pasien.",
  "Informasi kesehatan tersebar dan tidak membentuk satu alur yang kontinu.",
];

const principles = [
  {
    icon: BadgeCheck,
    title: "AI Bukan Otoritas Klinis Final",
    desc: "Sistem hanya memberi informasi & assessment awal — diagnosis tetap oleh tenaga kesehatan.",
  },
  {
    icon: BookMarked,
    title: "Setiap Klaim Harus Berevidence",
    desc: "Informasi medis yang digunakan dapat ditelusuri ke sumber aslinya.",
  },
  {
    icon: Link2,
    title: "Konteks Selalu Terjaga",
    desc: "Informasi dari tahap sebelumnya tidak hilang saat berpindah tahap.",
  },
  {
    icon: AlertTriangle,
    title: "Ketidakpastian Dijelaskan",
    desc: "Sistem tidak mengubah ketidakpastian menjadi kepastian yang semu.",
  },
  {
    icon: Lock,
    title: "Data Kesehatan itu Sensitif",
    desc: "Diperlakukan sebagai informasi sensitif sejak ingestion hingga storage.",
  },
];

export default function Home() {
  return (
    <>
      <HeroSection />

      <section className="mx-auto max-w-6xl px-6 pb-20">
        <div className="grid gap-4 sm:grid-cols-3">
          {quickActions.map((action) => (
            <Card key={action.href} className="transition-shadow hover:shadow-md">
              <CardHeader>
                <div className="mb-2 flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <action.icon className="size-5" />
                </div>
                <CardTitle>{action.title}</CardTitle>
                <CardDescription>{action.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" size="sm" className="w-full" render={<Link href={action.href} />}>
                  Buka
                  <ArrowRight className="size-3.5" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="border-y border-border bg-white py-20">
        <div className="mx-auto grid max-w-6xl gap-12 px-6 lg:grid-cols-2">
          <div>
            <p className="mb-2 text-xs font-semibold tracking-wide text-primary uppercase">
              Masalah
            </p>
            <h2 className="font-heading text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              Perjalanan kesehatan yang selama ini terpecah-pecah
            </h2>
            <p className="mt-3 text-muted-foreground">
              Healthalk menjaga <em>health context</em> tetap tersambung sepanjang perjalanan,
              sehingga Anda tidak perlu mengulang cerita di setiap tahap.
            </p>
          </div>
          <ul className="flex flex-col gap-4">
            {frictionPoints.map((point) => (
              <li key={point} className="flex gap-3 text-sm text-foreground">
                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-xs font-medium text-destructive">
                  !
                </span>
                {point}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="journey" className="scroll-mt-24 py-20">
        <div className="mx-auto max-w-6xl px-6 text-center">
          <p className="mb-2 text-xs font-semibold tracking-wide text-primary uppercase">
            Product Journey
          </p>
          <h2 className="font-heading text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Tiga fase, satu perjalanan yang tersambung
          </h2>
          <div className="mt-10 flex justify-center">
            <JourneyStepper active="understand" />
          </div>
          <p className="mx-auto mt-6 max-w-2xl text-sm text-muted-foreground">
            Cerita → Health Context → Evidence → Understanding → Secure Health Record → Dokter →
            Validation → Resep → Understanding.
          </p>
        </div>
      </section>

      <section className="border-t border-border bg-white py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-10 text-center">
            <p className="mb-2 text-xs font-semibold tracking-wide text-primary uppercase">
              Prinsip Produk
            </p>
            <h2 className="font-heading text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              Dibangun dengan batasan yang jelas
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {principles.map((p) => (
              <div key={p.title} className="rounded-xl border border-border p-4">
                <p.icon className="mb-3 size-5 text-primary" />
                <p className="text-sm font-semibold text-foreground">{p.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-5 rounded-2xl bg-primary/5 px-6 py-14 text-center">
          <h2 className="font-heading text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Siap ceritakan keluhan Anda?
          </h2>
          <p className="max-w-xl text-muted-foreground">
            Mulai konsultasi suara sekarang — informasi Anda tersimpan aman dan siap dibawa ke
            dokter.
          </p>
          <Button size="lg" render={<Link href="/consultations" />}>
            Mulai Konsultasi
            <ArrowRight className="size-4" />
          </Button>
        </div>
      </section>
    </>
  );
}
