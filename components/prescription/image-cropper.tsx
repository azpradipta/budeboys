"use client";

import { useEffect, useRef, useState } from "react";
import ReactCrop, { type Crop, type PixelCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { Button } from "@/components/ui/button";
import { Crop as CropIcon, X } from "lucide-react";

const INITIAL_CROP: Crop = { unit: "%", x: 5, y: 5, width: 90, height: 90 };

async function toCroppedFile(
  img: HTMLImageElement,
  crop: PixelCrop,
  fileName: string
): Promise<File> {
  const scaleX = img.naturalWidth / img.width;
  const scaleY = img.naturalHeight / img.height;

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(crop.width * scaleX));
  canvas.height = Math.max(1, Math.round(crop.height * scaleY));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no 2d context");

  ctx.drawImage(
    img,
    crop.x * scaleX,
    crop.y * scaleY,
    crop.width * scaleX,
    crop.height * scaleY,
    0,
    0,
    canvas.width,
    canvas.height
  );

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((b) => resolve(b), "image/jpeg", 0.95)
  );
  if (!blob) throw new Error("toBlob failed");
  return new File([blob], fileName.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
}

export function ImageCropper({
  file,
  onDone,
  onCancel,
}: {
  file: File;
  onDone: (cropped: File) => void;
  onCancel: () => void;
}) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [src, setSrc] = useState("");
  const [crop, setCrop] = useState<Crop>(INITIAL_CROP);
  const [completed, setCompleted] = useState<PixelCrop | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    Promise.resolve().then(() => setSrc(url));
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function onImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    // Seed a completed crop so "Pakai bagian ini" works even if the user
    // doesn't touch the box.
    const { width, height } = e.currentTarget;
    setCompleted({
      unit: "px",
      x: (INITIAL_CROP.x / 100) * width,
      y: (INITIAL_CROP.y / 100) * height,
      width: (INITIAL_CROP.width / 100) * width,
      height: (INITIAL_CROP.height / 100) * height,
    });
  }

  async function handleConfirm() {
    const img = imgRef.current;
    if (!img || !completed || completed.width < 4 || completed.height < 4 || busy) return;
    setBusy(true);
    try {
      onDone(await toCroppedFile(img, completed, file.name));
    } catch {
      onDone(file); // cropping failed — proceed with the original image
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-80 flex flex-col bg-background">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div>
          <p className="text-sm font-medium text-foreground">
            Tarik kotak ke bagian resep yang mau di-scan
          </p>
          <p className="text-xs text-muted-foreground">
            Geser tepi/sudut kotak untuk mengepaskan.
          </p>
        </div>
        <Button variant="ghost" size="icon-sm" onClick={onCancel} aria-label="Batal">
          <X className="size-4" />
        </Button>
      </div>

      <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-black/90 p-4">
        {src && (
          <ReactCrop
            // Height cap goes on ReactCrop, not the <img>: the library's
            // `.ReactCrop__child-wrapper > img { max-height: inherit }` beats
            // a class on the image, so the image only shrinks if ReactCrop
            // itself is bounded. calc() leaves room for the header + footer.
            className="max-h-[calc(100vh-9rem)] max-w-full"
            crop={crop}
            onChange={(_px, percent) => setCrop(percent)}
            onComplete={(px) => setCompleted(px)}
            minWidth={24}
            minHeight={24}
            keepSelection
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={imgRef}
              src={src}
              alt="Foto resep"
              onLoad={onImageLoad}
              className="select-none"
            />
          </ReactCrop>
        )}
      </div>

      <div className="flex justify-end gap-2 border-t border-border p-4">
        <Button variant="outline" onClick={onCancel}>
          Batal
        </Button>
        <Button onClick={handleConfirm} disabled={busy || !completed}>
          <CropIcon className="size-4" />
          {busy ? "Memproses…" : "Pakai bagian ini"}
        </Button>
      </div>
    </div>
  );
}
