"use client";

import { useEffect } from "react";
import { consumePendingScroll } from "@/lib/scroll-to-section";

/** Finishes a same-page-section nav click that had to navigate here first
 * (see lib/scroll-to-section.ts). Mounted once on the page that owns the
 * sections (Home). */
export function ScrollToPending() {
  useEffect(() => {
    consumePendingScroll();
  }, []);

  return null;
}
