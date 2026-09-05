"use client";

import { useEffect } from "react";
import { consumePendingScroll } from "@/lib/scroll-to-section";

// Menuntaskan scroll ke section yang sempat harus berpindah halaman dulu.
export function ScrollToPending() {
  useEffect(() => {
    consumePendingScroll();
  }, []);

  return null;
}
