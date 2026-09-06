"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { LoginDialog } from "@/components/auth/login-dialog";
import { LogIn } from "lucide-react";

/**
 * Halaman /privacy bisa dibaca siapa saja, tapi bagian data pribadinya butuh
 * sesi. Dialog login dibawa sendiri di sini, bukan menumpang milik Navbar,
 * supaya kartunya tetap berfungsi tanpa bergantung pada parameter URL.
 */
export function SignInPrompt() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <LogIn className="size-4" />
        Masuk untuk melihat data Anda
      </Button>
      <LoginDialog open={open} onOpenChange={setOpen} next="/privacy" />
    </>
  );
}
