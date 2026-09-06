"use client";

import { createContext, useCallback, useContext, useEffect, useState, Suspense } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { LoginDialog } from "./login-dialog";

// State dialog login dibagikan lewat context agar tombol mana pun bisa membukanya.
type LoginDialogContextValue = {
  openLogin: (next?: string) => void;
};

const LoginDialogContext = createContext<LoginDialogContextValue | null>(null);

/** Menangkap redirect "/?login=1&next=..." dari proxy. Dibaca lewat
 * useSearchParams agar tetap terdeteksi pada navigasi sisi klien, dan
 * dibungkus <Suspense> sesuai syarat hook itu. */
function LoginRedirectWatcher({ onRequest }: { onRequest: (next: string) => void }) {
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (params.get("login") !== "1") return;
    onRequest(params.get("next") ?? "/consultations");
    // Lewat router, bukan history.replaceState, agar state router ikut berubah.
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
