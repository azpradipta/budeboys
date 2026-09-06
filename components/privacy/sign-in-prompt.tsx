"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { LoginDialog } from "@/components/auth/login-dialog";
import { LogIn } from "lucide-react";

/** Bagian data pribadi di /privacy butuh sesi, sedangkan halamannya terbuka
 * untuk umum. */
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
