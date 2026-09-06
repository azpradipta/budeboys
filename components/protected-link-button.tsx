"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useUser } from "@/lib/auth/use-user";
import { useLoginDialog } from "@/components/auth/login-dialog-context";

// Tombol menuju halaman terproteksi. Saat pengguna sudah pasti belum login,
// klik membuka dialog login (tujuan tetap dibawa sebagai `next`) alih-alih
// navigasi ke rute yang akan ditolak proxy dan memicu reload.
export function ProtectedLinkButton({
  href = "/consultations",
  children,
  ...props
}: React.ComponentProps<typeof Button> & { href?: string }) {
  const user = useUser();
  const { openLogin } = useLoginDialog();

  if (user === null) {
    return (
      <Button {...props} onClick={() => openLogin(href)}>
        {children}
      </Button>
    );
  }

  return (
    <Button {...props} render={<Link href={href} />}>
      {children}
    </Button>
  );
}
