"use client";

import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { useConsultationSessions, usePrescriptions } from "@/lib/store";
import { useUser } from "@/lib/auth/use-user";
import { signOut } from "@/lib/auth/sign-out";
import {
  ShieldCheck,
  Lock,
  Eye,
  Database,
  History,
  LogOut,
} from "lucide-react";

const PRIVACY_ITEMS = [
  {
    q: "Data apa yang disimpan?",
    a: "Transcript percakapan, ringkasan konsultasi, informasi gejala, penilaian kesehatan awal, foto resep, dan informasi obat.",
    icon: Database,
  },
  {
    q: "Untuk apa data ini disimpan?",
    a: "Agar health context Anda tetap tersambung dari konsultasi awal hingga pemahaman resep, tanpa perlu mengulang cerita di setiap tahap.",
    icon: History,
  },
  {
    q: "Bagaimana status keamanannya?",
    a: "HealthRecord dienkripsi sebelum disimpan (encrypted at rest) dan seluruh komunikasi dienkripsi saat transit.",
    icon: Lock,
  },
  {
    q: "Siapa yang dapat mengakses data saya?",
    a: "Hanya Anda, setelah autentikasi dan authorization check. Dokter dapat melihat ringkasan hanya jika Anda membagikannya secara eksplisit.",
    icon: Eye,
  },
];

export default function ProfilePage() {
  const router = useRouter();
  const user = useUser();
  const stats = {
    sessions: useConsultationSessions().length,
    prescriptions: usePrescriptions().length,
  };

  const avatarUrl = user?.user_metadata?.avatar_url as string | undefined;
  const displayName = (user?.user_metadata?.full_name as string | undefined) ?? user?.email ?? "";
  const initials = displayName ? displayName.charAt(0).toUpperCase() : "?";

  async function handleSignOut() {
    await signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-14">
      <PageHeader title="Profil" description="Kelola akun serta privasi dan keamanan data Anda." />

      <Card className="mb-8">
        <CardContent className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Avatar size="lg">
              {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName} />}
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-foreground">{displayName || "Memuat…"}</p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{stats.sessions} konsultasi</Badge>
            <Badge variant="secondary">{stats.prescriptions} resep</Badge>
            <Button variant="outline" size="sm" onClick={handleSignOut}>
              <LogOut className="size-3.5" />
              Keluar
            </Button>
          </div>
        </CardContent>
      </Card>

      <div id="privacy" className="scroll-mt-24">
        <Card>
          <CardContent>
            <div className="mb-4 flex items-center gap-2">
              <ShieldCheck className="size-5 text-primary" />
              <div>
                <p className="font-heading font-semibold text-foreground">Privasi &amp; Keamanan</p>
                <p className="text-xs text-muted-foreground">
                  Transparansi mengenai bagaimana data kesehatan Anda diperlakukan.
                </p>
              </div>
            </div>
            <Separator className="mb-2" />
            <Accordion>
              {PRIVACY_ITEMS.map((item) => (
                <AccordionItem key={item.q} value={item.q}>
                  <AccordionTrigger>
                    <span className="flex items-center gap-2">
                      <item.icon className="size-4 text-primary" />
                      {item.q}
                    </span>
                  </AccordionTrigger>
                  <AccordionContent>{item.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
