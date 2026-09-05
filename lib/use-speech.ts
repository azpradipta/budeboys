"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Thin wrapper around the browser's native Web Speech API.
 *
 * docs/prd.md Section 8 asks for Audio -> Speech Recognition -> Transcript,
 * and TTS for spoken responses. Rather than mocking that too, this hackathon
 * build uses the real in-browser SpeechRecognition/SpeechSynthesis so voice
 * interaction genuinely works (Chrome/Edge). It degrades gracefully to a
 * text input fallback where unsupported (Firefox/Safari) — callers should
 * check `supported` and render a text field instead.
 */

// Minimal ambient types — not yet in lib.dom.d.ts everywhere.
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
    // One-shot browser feature detection (never changes during a session) —
    // must run client-only since SSR has no `window`/SpeechRecognition.
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

export function speak(text: string, lang = "id-ID") {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  window.speechSynthesis.speak(utterance);
}

export function cancelSpeech() {
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
}
