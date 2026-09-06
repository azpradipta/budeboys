"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { StatusBadge } from "@/components/shared/status-badge";
import { MessageBubble } from "./message-bubble";
import { HealthContextPanel } from "./health-context-panel";
import { SessionTimer } from "./session-timer";
import { useSpeechRecognition, speak, cancelSpeech } from "@/lib/use-speech";
import {
  createMessage,
  detectSmallTalk,
  smallTalkReply,
  type AssistantTurn,
} from "@/lib/health-ai";
import type { ConsultationSession, HealthContext } from "@/lib/types";
import { Mic, Square, Send, PhoneOff, Keyboard, VolumeX, Clock } from "lucide-react";

// Memanggil route turn yang sudah punya fallback sendiri di server.
async function fetchTurn(
  query: string,
  sessionId: string,
  healthContext: HealthContext,
  hasPriorContext: boolean,
  lastAssistantText: string,
  history: { role: "user" | "assistant"; text: string }[]
): Promise<AssistantTurn> {
  try {
    const res = await fetch("/api/consultation/turn", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query,
        sessionId,
        healthContext,
        hasPriorContext,
        lastAssistantText,
        history,
      }),
    });
    if (res.ok) return (await res.json()) as AssistantTurn;
  } catch {
    // Jatuh ke jawaban minimal di bawah.
  }
  return {
    text: "Maaf, saya tidak bisa memproses itu sekarang karena koneksi ke server bermasalah. Coba lagi sesaat lagi.",
    intent: "NON_MEDICAL",
    evidence: [],
    risk: "LOW_RISK",
    insufficientEvidence: false,
    healthContext,
  };
}

export function LiveConsultation({
  session,
  onUpdate,
  onEnd,
}: {
  session: ConsultationSession;
  onUpdate: (session: ConsultationSession) => void;
  onEnd: () => void;
}) {
  const [draft, setDraft] = useState("");
  const [useTextMode, setUseTextMode] = useState(false);
  const [pending, setPending] = useState(false);
  const [aiSpeaking, setAiSpeaking] = useState(false);
  const [endConfirmOpen, setEndConfirmOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const processingRef = useRef(false); // stale-closure-proof turn guard
  const endedRef = useRef(false);
  const { supported, listening, interimText, start, stop } = useSpeechRecognition();

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    // Kalau pesan terbaru dari asisten, sejajarkan AWAL jawaban ke atas
    // viewport supaya bisa dibaca dari awal, bukan langsung ke ujung bawah.
    const last = session.messages[session.messages.length - 1];
    if (last?.role === "assistant" && !interimText && !pending) {
      const el = container.querySelector<HTMLElement>(`[data-msg-id="${last.id}"]`);
      if (el) {
        const offset =
          container.scrollTop +
          (el.getBoundingClientRect().top - container.getBoundingClientRect().top) -
          12;
        const max = container.scrollHeight - container.clientHeight;
        container.scrollTo({ top: Math.min(offset, max), behavior: "smooth" });
        return;
      }
    }

    container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
  }, [session.messages, interimText, pending]);

  useEffect(() => () => cancelSpeech(), []);

  function stopEverything() {
    stop();
    cancelSpeech();
    setAiSpeaking(false);
  }

  async function handleUtterance(text: string) {
    if (!text.trim() || processingRef.current || endedRef.current) return;
    processingRef.current = true;

    // Half-duplex: mic dan TTS dimatikan dulu agar tidak terjadi feedback loop.
    stopEverything();

    const hasPriorContext = session.messages.some((m) => m.role === "user");
    const userMessage = createMessage("user", text.trim());

    // Basa-basi dijawab seketika di klien, tanpa panggilan server.
    const social = detectSmallTalk(text);
    if (social) {
      const reply = smallTalkReply(social);
      onUpdate({
        ...session,
        messages: [
          ...session.messages,
          userMessage,
          createMessage("assistant", reply, {
            intent: "NON_MEDICAL",
            evidence: [],
            risk: "LOW_RISK",
            insufficientEvidence: false,
          }),
        ],
      });
      processingRef.current = false;
      if (!useTextMode) {
        setAiSpeaking(true);
        speak(reply, { onEnd: () => setAiSpeaking(false) });
      }
      return;
    }

    const withUserMessage: ConsultationSession = {
      ...session,
      messages: [...session.messages, userMessage],
    };
    onUpdate(withUserMessage);
    setPending(true);

    const lastAssistantText =
      [...session.messages].reverse().find((m) => m.role === "assistant")?.text ?? "";
    // Riwayat sebelum ucapan sekarang; ucapan sekarang dikirim terpisah sebagai `query`.
    const history = session.messages
      .slice(-10)
      .map((m) => ({ role: m.role, text: m.text }));
    const turn = await fetchTurn(
      text,
      session.id,
      session.healthContext,
      hasPriorContext,
      lastAssistantText,
      history
    );
    setPending(false);
    processingRef.current = false;
    if (endedRef.current) return;

    const assistantMessage = createMessage("assistant", turn.text, {
      intent: turn.intent,
      evidence: turn.evidence,
      risk: turn.risk,
      insufficientEvidence: turn.insufficientEvidence,
    });
    onUpdate({
      ...withUserMessage,
      messages: [...withUserMessage.messages, assistantMessage],
      healthContext: turn.healthContext,
    });

    // Hanya bersuara di mode voice, dan mic tetap mati sampai ditekan lagi.
    if (!useTextMode) {
      setAiSpeaking(true);
      speak(turn.text, { onEnd: () => setAiSpeaking(false) });
    }
  }

  function toggleMic() {
    if (listening) {
      stopEverything();
      return;
    }
    // Menekan mic saat AI bicara berarti menyela: suaranya dipotong.
    cancelSpeech();
    setAiSpeaking(false);
    start((text) => void handleUtterance(text));
  }

  function handleEndConsultation() {
    endedRef.current = true;
    stopEverything();
    onEnd();
  }

  function handleSubmitText(e: React.FormEvent) {
    e.preventDefault();
    void handleUtterance(draft);
    setDraft("");
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <Card className="flex h-128 flex-col">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <StatusBadge status={session.status as "ACTIVE"} />
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="size-3" />
            <SessionTimer startedAt={session.createdAt} />
            <span className="hidden sm:inline">
              · mulai{" "}
              {new Date(session.createdAt).toLocaleTimeString("id-ID", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </span>
        </div>

        <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
          {session.messages.map((m) => (
            <div key={m.id} data-msg-id={m.id}>
              <MessageBubble message={m} />
            </div>
          ))}
          {interimText && (
            <div className="flex justify-end">
              <p className="max-w-[80%] rounded-2xl rounded-tr-sm bg-primary/50 px-3.5 py-2 text-sm text-primary-foreground italic">
                {interimText}
              </p>
            </div>
          )}
          {pending && (
            <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-sm bg-muted px-3.5 py-2 text-sm text-muted-foreground w-fit">
              <span className="size-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.2s]" />
              <span className="size-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.1s]" />
              <span className="size-1.5 animate-bounce rounded-full bg-current" />
            </div>
          )}
        </div>

        <div className="border-t border-border p-4">
          {!useTextMode && supported ? (
            <div className="flex flex-col items-center gap-2">
              <div className="flex items-center gap-8">
                <Button
                  size="icon-lg"
                  onClick={toggleMic}
                  className="size-14 rounded-full"
                  variant={listening ? "destructive" : "default"}
                  disabled={pending}
                  aria-label={listening ? "Berhenti bicara" : "Mulai bicara"}
                >
                  {listening ? <Square className="size-5" /> : <Mic className="size-6" />}
                </Button>
                <Button
                  size="icon-lg"
                  onClick={() => setEndConfirmOpen(true)}
                  className="size-14 rounded-full bg-destructive text-white hover:bg-destructive/90"
                  aria-label="Akhiri konsultasi"
                >
                  <PhoneOff className="size-6" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {pending
                  ? "Menyusun jawaban…"
                  : aiSpeaking
                    ? "AI sedang menjawab, ketuk mic untuk menyela"
                    : listening
                      ? "Mendengarkan… tekan untuk berhenti"
                      : "Tekan untuk berbicara"}
              </p>
              <div className="flex items-center gap-3">
                {aiSpeaking && (
                  <button
                    type="button"
                    onClick={() => {
                      cancelSpeech();
                      setAiSpeaking(false);
                    }}
                    className="flex items-center gap-1 text-xs text-destructive underline-offset-2 hover:underline"
                  >
                    <VolumeX className="size-3" /> Hentikan suara
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setUseTextMode(true)}
                  className="flex items-center gap-1 text-xs text-muted-foreground underline-offset-2 hover:underline"
                >
                  <Keyboard className="size-3" /> Ketik saja
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmitText} className="flex items-center gap-2">
              <Input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Ketik keluhan Anda…"
                disabled={pending}
                autoFocus
              />
              <Button type="submit" size="icon" aria-label="Kirim" disabled={pending}>
                <Send className="size-4" />
              </Button>
              {supported && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setUseTextMode(false)}
                >
                  <Mic className="size-3.5" /> Suara
                </Button>
              )}
              <Button
                type="button"
                size="icon"
                onClick={() => setEndConfirmOpen(true)}
                className="bg-destructive text-white hover:bg-destructive/90"
                aria-label="Akhiri konsultasi"
              >
                <PhoneOff className="size-4" />
              </Button>
            </form>
          )}
          {!supported && (
            <p className="mt-2 text-center text-[11px] text-muted-foreground">
              Speech recognition tidak didukung browser ini, gunakan input teks.
            </p>
          )}
        </div>
      </Card>

      <Card>
        <CardContent>
          <p className="mb-4 text-xs font-semibold tracking-wide text-primary uppercase">
            Health Context
          </p>
          <HealthContextPanel context={session.healthContext} />
        </CardContent>
      </Card>

      <Dialog open={endConfirmOpen} onOpenChange={setEndConfirmOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Akhiri konsultasi?</DialogTitle>
            <DialogDescription>
              Sesi ditutup dan ringkasan disusun dari percakapan sejauh ini. Sesi yang
              sudah diakhiri tidak bisa dilanjutkan lagi.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEndConfirmOpen(false)}>
              Batal
            </Button>
            <Button
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => {
                setEndConfirmOpen(false);
                handleEndConsultation();
              }}
            >
              <PhoneOff className="size-4" />
              Ya, Akhiri
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
