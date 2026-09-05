"use client";

import Link from "next/link";
import { useUser } from "@/lib/auth/use-user";
import { useLoginDialog } from "@/components/auth/login-dialog-context";

const PROTECTED = ["/consultations", "/prescriptions", "/profile", "/privacy"];

// Tautan footer yang menuju halaman terproteksi membuka dialog login saat
// pengguna sudah pasti belum login, sisanya tetap tautan biasa.
export function FooterLink({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: React.ReactNode;
}) {
  const user = useUser();
  const { openLogin } = useLoginDialog();
  const isProtected = PROTECTED.some((p) => href === p || href.startsWith(`${p}/`));

  if (isProtected && user === null) {
    return (
      <button type="button" onClick={() => openLogin(href)} className={className}>
        {children}
      </button>
    );
  }

  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}
