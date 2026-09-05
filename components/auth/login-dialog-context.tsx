"use client";

import { createContext, useCallback, useContext, useEffect, useState, Suspense } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { LoginDialog } from "./login-dialog";

// State dialog login dibagikan lewat context agar tombol mana pun bisa membukanya.
type LoginDialogContextValue = {
  openLogin: (next?: string) => void;
};

const LoginDialogContext = createContext<LoginDialogContextValue | null>(null);

/**
 * Proxy melempar kunjungan tanpa login ke "/?login=1&next=<path asal>".
 *
 * Parameternya dibaca lewat useSearchParams, bukan sekali dari
 * window.location saat mount: provider ini hidup di root layout dan tidak
 * pernah ter-mount ulang, sehingga redirect yang datang lewat navigasi sisi
 * klien akan terlewat dan dialognya tidak pernah terbuka. Itu yang membuat
 * tautan terproteksi di footer terasa tidak melakukan apa-apa.
 *
 * Dipisah jadi komponen sendiri agar bisa dibungkus <Suspense>, syarat
 * useSearchParams pada halaman yang dirender statis.
 */
function LoginRedirectWatcher({ onRequest }: { onRequest: (next: string) => void }) {
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (params.get("login") !== "1") return;
    onRequest(params.get("next") ?? "/consultations");
    // Dibersihkan lewat router, bukan history.replaceState, supaya state
    // router ikut berubah. Kalau tidak, redirect kedua ke path yang sama
    // dianggap tidak mengubah apa pun dan dialognya tidak terbuka lagi.
    router.replace(pathname);
  }, [params, pathname, router, onRequest]);

  return null;
}

export function LoginDialogProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [next, setNext] = useState("/consultations");

  const openLogin = useCallback((to?: string) => {
    if (to) setNext(to);
    setOpen(true);
  }, []);

  return (
    <LoginDialogContext.Provider value={{ openLogin }}>
      {children}
      <Suspense fallback={null}>
        <LoginRedirectWatcher onRequest={openLogin} />
      </Suspense>
      <LoginDialog open={open} onOpenChange={setOpen} next={next} />
    </LoginDialogContext.Provider>
  );
}

export function useLoginDialog() {
  const ctx = useContext(LoginDialogContext);
  if (!ctx) throw new Error("useLoginDialog harus dipakai di dalam <LoginDialogProvider>");
  return ctx;
}
