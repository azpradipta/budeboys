"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { MessageBubble } from "./message-bubble";
import { HealthContextPanel } from "./health-context-panel";
import { useSpeechRecognition, speak, cancelSpeech } from "@/lib/use-speech";
import { createMessage, extractHealthContext, generateAssistantTurn } from "@/lib/health-ai";
import type { ConsultationSession } from "@/lib/types";
import { Mic, Square, Send, PhoneOff, Keyboard } from "lucide-react";

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
  const scrollRef = useRef<HTMLDivElement>(null);
  const { supported, listening, interimText, start, stop } = useSpeechRecognition();

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [session.messages.length, interimText, pending]);

  useEffect(() => () => cancelSpeech(), []);

  async function handleUtterance(text: string) {
    if (!text.trim() || pending) return;

    const hasPriorContext = session.messages.some((m) => m.role === "user");
    const userMessage = createMessage("user", text.trim());
    const nextContext = extractHealthContext(session.healthContext, text);

    // Show the user's own message immediately — the evidence lookup below
    // is a real network call now, no reason to make them wait to see it.
    const withUserMessage: ConsultationSession = {
      ...session,
      messages: [...session.messages, userMessage],
      healthContext: nextContext,
    };
    onUpdate(withUserMessage);
    setPending(true);

    const turn = await generateAssistantTurn(text, nextContext, hasPriorContext);
    const assistantMessage = createMessage("assistant", turn.text, {
      intent: turn.intent,
      evidence: turn.evidence,
      risk: turn.risk,
      insufficientEvidence: turn.insufficientEvidence,
    });

    onUpdate({
      ...withUserMessage,
      messages: [...withUserMessage.messages, assistantMessage],
    });
    setPending(false);
    speak(turn.text);
  }

  function toggleMic() {
    if (listening) {
      stop();
      return;
    }
    cancelSpeech();
    start((text) => void handleUtterance(text));
  }

  function handleSubmitText(e: React.FormEvent) {
    e.preventDefault();
    void handleUtterance(draft);
    setDraft("");
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <Card className="flex h-[32rem] flex-col">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <StatusBadge status={session.status as "ACTIVE"} />
            <span className="text-xs text-muted-foreground">
              Sesi {session.id} · {new Date(session.createdAt).toLocaleTimeString("id-ID")}
            </span>
          </div>
          <Button size="sm" variant="destructive" onClick={onEnd}>
            <PhoneOff className="size-3.5" />
            Akhiri Konsultasi
          </Button>
        </div>

        <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
          {session.messages.map((m) => (
            <MessageBubble key={m.id} message={m} />
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
              <p className="text-xs text-muted-foreground">
                {pending
                  ? "Mencari evidence…"
                  : listening
                    ? "Mendengarkan… tekan untuk berhenti"
                    : "Tekan untuk berbicara"}
              </p>
              <button
                type="button"
                onClick={() => setUseTextMode(true)}
                className="flex items-center gap-1 text-xs text-muted-foreground underline-offset-2 hover:underline"
              >
                <Keyboard className="size-3" /> Ketik saja
              </button>
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
            </form>
          )}
          {!supported && (
            <p className="mt-2 text-center text-[11px] text-muted-foreground">
              Speech recognition tidak didukung browser ini — gunakan input teks.
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
    </div>
  );
}
