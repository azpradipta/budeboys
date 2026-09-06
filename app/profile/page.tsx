"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import DashboardHeader from "@/components/DashboardHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useConsultationSessions, usePrescriptions } from "@/lib/store";
import { useUser } from "@/lib/auth/use-user";
import { signOut } from "@/lib/auth/sign-out";
import { ShieldCheck, LogOut, ArrowRight } from "lucide-react";

export default function ProfilePage() {
  const router = useRouter();
  const user = useUser();
  const stats = {
    sessions: useConsultationSessions().length,
    prescriptions: usePrescriptions().length,
  };

  const avatarUrl = user?.user_metadata?.avatar_url as string | undefined;
  const displayName =
    (user?.user_metadata?.full_name as string | undefined) ?? user?.email ?? "";
  const initials = displayName ? displayName.charAt(0).toUpperCase() : "?";

  async function handleSignOut() {
    await signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-26">
      <DashboardHeader heading="Profil" subHeading="Kelola akun anda." />

      <Card className="my-8">
        <CardContent className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Avatar size="lg">
              {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName} />}
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-foreground">
                {displayName || "Memuat…"}
              </p>
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
          <CardContent className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <ShieldCheck className="size-5 shrink-0 text-primary" />
              <div>
                <p className="font-heading font-semibold text-foreground">
                  Privasi &amp; Keamanan
                </p>
                <p className="text-xs text-muted-foreground">
                  Transparansi mengenai bagaimana data kesehatan Anda
                  diperlakukan.
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" render={<Link href="/privacy" />}>
              Buka
              <ArrowRight className="size-3.5" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
