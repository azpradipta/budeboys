"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { LoginDialog } from "./login-dialog";

// State dialog login dibagikan lewat context agar tombol mana pun bisa membukanya.
type LoginDialogContextValue = {
  openLogin: (next?: string) => void;
};

const LoginDialogContext = createContext<LoginDialogContextValue | null>(null);

export function LoginDialogProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [next, setNext] = useState("/consultations");

  const openLogin = useCallback((to?: string) => {
    if (to) setNext(to);
    setOpen(true);
  }, []);

  // Proxy melempar kunjungan tanpa login ke "/?login=1&next=".
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("login") !== "1") return;
    const to = params.get("next") ?? "/consultations";
    window.history.replaceState(null, "", window.location.pathname);
    Promise.resolve().then(() => {
      setNext(to);
      setOpen(true);
    });
  }, []);

  return (
    <LoginDialogContext.Provider value={{ openLogin }}>
      {children}
      <LoginDialog open={open} onOpenChange={setOpen} next={next} />
    </LoginDialogContext.Provider>
  );
}

export function useLoginDialog() {
  const ctx = useContext(LoginDialogContext);
  if (!ctx) throw new Error("useLoginDialog harus dipakai di dalam <LoginDialogProvider>");
  return ctx;
}
