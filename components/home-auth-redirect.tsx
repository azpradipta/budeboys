"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/lib/auth/use-user";

// Pelengkap proxy.ts: "/" di-prerender statis sehingga navigasi lewat Link
// bisa melewati server. Redirect-nya dituntaskan di sisi klien.
export function HomeAuthRedirect() {
  const user = useUser();
  const router = useRouter();

  useEffect(() => {
    if (user) router.replace("/consultations");
  }, [user, router]);

  return null;
}
