"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { GoogleIcon } from "./google-icon";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { getSiteUrl } from "@/lib/site-url";
import { ShieldCheck, CircleAlert } from "lucide-react";

const SUPABASE_CONFIGURED =
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export function LoginDialog({
  open,
  onOpenChange,
  next = "/consultations",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Where to land after a successful login. */
  next?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGoogleLogin() {
    setError(null);
    setLoading(true);
    const supabase = createSupabaseBrowserClient();
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${getSiteUrl()}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    if (authError) {
      setLoading(false);
      setError(authError.message);
    }
    // Kalau berhasil browser pindah ke Google, jadi komponennya keburu unmount.
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Masuk ke Healthalk</DialogTitle>
          <DialogDescription>
            Masuk untuk mulai konsultasi dan menyimpan riwayat kesehatan Anda dengan aman.
          </DialogDescription>
        </DialogHeader>

        {!SUPABASE_CONFIGURED ? (
          <Alert variant="destructive">
            <CircleAlert className="size-4" />
            <AlertDescription>
              Supabase belum dikonfigurasi. Isi <code>NEXT_PUBLIC_SUPABASE_URL</code> dan{" "}
              <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> di <code>.env.local</code> dulu (lihat{" "}
              <code>.env.example</code>), lalu restart dev server.
            </AlertDescription>
          </Alert>
        ) : (
          <>
            <Button
              variant="outline"
              className="w-full justify-center"
              onClick={handleGoogleLogin}
              disabled={loading}
            >
              <GoogleIcon className="size-4" />
              {loading ? "Mengarahkan ke Google…" : "Masuk dengan Google"}
            </Button>

            {error && (
              <Alert variant="destructive">
                <CircleAlert className="size-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <ShieldCheck className="size-3.5 shrink-0 text-primary" />
              Kami hanya menggunakan akun Google Anda untuk identifikasi. Data kesehatan Anda
              tetap terpisah dan terenkripsi.
            </p>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
