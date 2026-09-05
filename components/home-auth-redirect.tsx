"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/lib/auth/use-user";

/**
 * Belt-and-suspenders alongside proxy.ts: "/" is statically prerendered, so
 * a client-side Link navigation to it can reuse Next.js's router cache
 * without ever hitting the server (and therefore without Proxy running) —
 * that's why clicking "Beranda" while logged in could silently show the
 * stale landing page instead of redirecting. This runs on every mount of
 * the Home page, however it was reached, and finishes the redirect
 * client-side the moment the session is known.
 */
export function HomeAuthRedirect() {
  const user = useUser();
  const router = useRouter();

  useEffect(() => {
    if (user) router.replace("/consultations");
  }, [user, router]);

  return null;
}
