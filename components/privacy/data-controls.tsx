"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { clearStoreCaches } from "@/lib/store";
import { Download, Trash2, CircleAlert } from "lucide-react";

const CONFIRM_WORD = "HAPUS";

/** Mengunduh salinan data atau menghapus seluruhnya. Unduhan memakai tautan biasa
 * agar `content-disposition` dari route API yang mengurus berkasnya. */
export function DataControls({ hasData }: { hasData: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setError(null);
    setDeleting(true);
    try {
      const res = await fetch("/api/privacy/data", { method: "DELETE" });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? `Gagal menghapus (HTTP ${res.status}).`);
      }
      // Cache store hidup di level modul, jadi router.refresh() saja menyisakan
      // record yang sudah terhapus.
      clearStoreCaches();
      setOpen(false);
      setConfirmText("");
      setDeleting(false);
      router.replace("/privacy?deleted=1");
      router.refresh();
    } catch (e) {
      setDeleting(false);
      setError(e instanceof Error ? e.message : "Gagal menghapus data.");
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" render={<a href="/api/privacy/export" download />}>
        <Download className="size-4" />
        Unduh data saya
      </Button>

      <Button variant="destructive" disabled={!hasData} onClick={() => setOpen(true)}>
        <Trash2 className="size-4" />
        Hapus semua data
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Hapus semua data kesehatan Anda?</DialogTitle>
            <DialogDescription>
              Seluruh konsultasi beserta resep yang menyertainya akan dihapus permanen dari
              database. Tindakan ini tidak bisa dibatalkan, dan salinan yang sudah Anda unduh
              tidak ikut terhapus. Akun Google Anda sendiri tetap aktif.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-2">
            <Label htmlFor="confirm-delete">
              Ketik <span className="font-mono font-semibold">{CONFIRM_WORD}</span> untuk
              mengonfirmasi
            </Label>
            <Input
              id="confirm-delete"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              autoComplete="off"
              placeholder={CONFIRM_WORD}
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <CircleAlert className="size-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Batal</DialogClose>
            <Button
              variant="destructive"
              disabled={confirmText !== CONFIRM_WORD || deleting}
              onClick={handleDelete}
            >
              {deleting ? "Menghapus…" : "Hapus permanen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
