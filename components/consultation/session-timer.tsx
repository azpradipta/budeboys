"use client";

import { useEffect, useState } from "react";
import { formatDuration } from "@/lib/format";

/** Live-ticking elapsed time since the session started. */
export function SessionTimer({ startedAt }: { startedAt: string }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const started = new Date(startedAt).getTime();
    const raf = requestAnimationFrame(() => setElapsed(Date.now() - started));
    const id = setInterval(() => setElapsed(Date.now() - started), 1000);
    return () => {
      cancelAnimationFrame(raf);
      clearInterval(id);
    };
  }, [startedAt]);

  return <span className="tabular-nums">{formatDuration(elapsed)}</span>;
}
