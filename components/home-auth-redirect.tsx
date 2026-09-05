"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/lib/auth/use-user";

/**
 * Pelengkap proxy.ts. Halaman "/" di-prerender statis, jadi navigasi lewat
 * Link bisa memakai router cache tanpa menyentuh server, artinya proxy tidak
 * ikut jalan. Komponen ini menuntaskan redirect di sisi klien begitu sesi
 * diketahui.
 */
export function HomeAuthRedirect() {
  const user = useUser();
  const router = useRouter();

  useEffect(() => {
    if (user) router.replace("/consultations");
  }, [user, router]);

  return null;
}
