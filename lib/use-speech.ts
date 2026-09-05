"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Pembungkus SpeechRecognition dan SpeechSynthesis bawaan browser, tersedia
 * di Chrome dan Edge. Pemanggil perlu memeriksa `supported` dan menyediakan
 * input teks sebagai gantinya.
 */

// Tipe ambient, karena lib.dom.d.ts belum memuat semuanya.
interface SpeechRecognitionResultLike {
  isFinal: boolean;
  0: { transcript: string };
}
interface SpeechRecognitionEventLike extends Event {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
}
interface SpeechRecognitionLike extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((ev: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: ((ev: Event) => void) | null;
}

function getRecognitionCtor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as Record<string, unknown>;
  return (w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null) as
    | (new () => SpeechRecognitionLike)
    | null;
}

export function useSpeechRecognition(lang = "id-ID") {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [interimText, setInterimText] = useState("");
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const onFinalRef = useRef<((text: string) => void) | null>(null);

  useEffect(() => {
    // Hasil deteksi tidak berubah selama sesi, dan harus di sisi klien
    // karena SSR tidak punya `window`.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSupported(getRecognitionCtor() !== null);
  }, []);

  const start = useCallback(
    (onFinal: (text: string) => void) => {
      const Ctor = getRecognitionCtor();
      if (!Ctor) return;
      onFinalRef.current = onFinal;

      const recognition = new Ctor();
      recognition.lang = lang;
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onresult = (ev) => {
        let interim = "";
        for (let i = ev.resultIndex; i < ev.results.length; i++) {
          const result = ev.results[i];
          const transcript = result[0].transcript;
          if (result.isFinal) {
            onFinalRef.current?.(transcript.trim());
            setInterimText("");
          } else {
            interim += transcript;
          }
        }
        if (interim) setInterimText(interim);
      };
      recognition.onend = () => setListening(false);
      recognition.onerror = () => setListening(false);

      recognitionRef.current = recognition;
      recognition.start();
      setListening(true);
    },
    [lang]
  );

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    setListening(false);
    setInterimText("");
  }, []);

  useEffect(() => () => recognitionRef.current?.stop(), []);

  return { supported, listening, interimText, start, stop };
}

export function speak(
  text: string,
  opts: { lang?: string; onStart?: () => void; onEnd?: () => void } = {}
) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    opts.onEnd?.();
    return;
  }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = opts.lang ?? "id-ID";
  utterance.onstart = () => opts.onStart?.();
  // Terpanggil saat selesai normal maupun saat cancel(), dipakai pemanggil
  // untuk mematikan status "AI sedang bicara".
  utterance.onend = () => opts.onEnd?.();
  utterance.onerror = () => opts.onEnd?.();
  window.speechSynthesis.speak(utterance);
}

export function cancelSpeech() {
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
}
