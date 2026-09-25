"use client";

import { useEffect, useRef, useState } from "react";
import { brand } from "@/config/brand";
import {
  startListening,
  speak,
  stopSpeaking,
  isSpeechRecognitionSupported,
  isSpeechSynthesisSupported,
  type Recognizer,
} from "@/lib/speech";

type Correction = {
  original: string;
  corrected: string;
  category: string;
  explanation: string;
};

type Msg = {
  role: "user" | "assistant";
  content: string;
  corrections?: Correction[];
};

type Status = "idle" | "listening" | "thinking" | "speaking";

const MODES = [
  { id: "CONVERSATION", label: "Chat" },
  { id: "TEACHER", label: "Teach me" },
  { id: "CORRECTION", label: "Correct me" },
  { id: "INTERVIEW", label: "Interview" },
] as const;

export function MiraChat() {
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content: `Hi! I'm ${brand.tutorName}, your speaking partner. Tap the mic or type, and tell me — what did you do today?`,
    },
  ]);
  const [status, setStatus] = useState<Status>("idle");
  const [interim, setInterim] = useState("");
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] =
    useState<(typeof MODES)[number]["id"]>("CONVERSATION");
  const [voiceOn, setVoiceOn] = useState(true);
  const conversationId = useRef<string | undefined>(undefined);
  const recognizer = useRef<Recognizer | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const sttSupported =
    typeof window !== "undefined" && isSpeechRecognitionSupported();
  const ttsSupported =
    typeof window !== "undefined" && isSpeechSynthesisSupported();

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, interim]);

  useEffect(() => () => stopSpeaking(), []);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    setError(null);
    setInput("");
    setInterim("");
    setMessages((m) => [...m, { role: "user", content: trimmed }]);
    setStatus("thinking");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          mode,
          conversationId: conversationId.current,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setError(json.error ?? "Something went wrong. Please try again.");
        setStatus("idle");
        return;
      }
      conversationId.current = json.data.conversationId;
      const reply: string = json.data.reply;
      const corrections: Correction[] = json.data.corrections ?? [];
      setMessages((m) => [
        ...m,
        { role: "assistant", content: reply, corrections },
      ]);

      // Record practice for the streak (best-effort).
      fetch("/api/streak/ping", { method: "POST" }).catch(() => {});

      if (voiceOn && ttsSupported) {
        setStatus("speaking");
        speak(reply);
        // We can't reliably await TTS end across browsers, so return to idle
        // after a short, length-based delay.
        const ms = Math.min(8000, 1200 + reply.length * 45);
        setTimeout(() => setStatus("idle"), ms);
      } else {
        setStatus("idle");
      }
    } catch {
      setError(
        "Couldn't reach Mira. Please check your connection and try again.",
      );
      setStatus("idle");
    }
  }

  function toggleMic() {
    if (status === "listening") {
      recognizer.current?.stop();
      return;
    }
    setError(null);
    stopSpeaking();
    setStatus("listening");
    recognizer.current = startListening({
      onInterim: (t) => setInterim(t),
      onFinal: (t) => {
        setInterim("");
        void send(t);
      },
      onError: (msg) => {
        setError(msg);
        setStatus("idle");
        setInterim("");
      },
      onEnd: () => {
        setStatus((s) => (s === "listening" ? "idle" : s));
      },
    });
  }

  const statusLabel: Record<Status, string> = {
    idle: "Tap the mic and speak",
    listening: "Listening…",
    thinking: `${brand.tutorName} is thinking…`,
    speaking: `${brand.tutorName} is speaking…`,
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col md:h-[calc(100vh-6rem)]">
      {/* Mode selector */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {MODES.map((m) => (
          <button
            key={m.id}
            onClick={() => setMode(m.id)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
              mode === m.id
                ? "bg-brand-600 text-white"
                : "bg-white text-slate-600 border border-slate-200"
            }`}
          >
            {m.label}
          </button>
        ))}
        {ttsSupported && (
          <button
            onClick={() => {
              setVoiceOn((v) => !v);
              stopSpeaking();
            }}
            className="ml-auto rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600"
            aria-pressed={voiceOn}
          >
            {voiceOn ? "🔊 Voice on" : "🔇 Voice off"}
          </button>
        )}
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 space-y-4 overflow-y-auto rounded-2xl bg-white p-4 shadow-card"
      >
        {messages.map((m, i) => (
          <div
            key={i}
            className={
              m.role === "user" ? "flex justify-end" : "flex justify-start"
            }
          >
            <div className="max-w-[85%]">
              <div
                className={`rounded-2xl px-4 py-2.5 text-sm ${
                  m.role === "user"
                    ? "rounded-br-sm bg-brand-600 text-white"
                    : "rounded-bl-sm bg-slate-100 text-slate-800"
                }`}
              >
                {m.content}
              </div>
              {m.corrections && m.corrections.length > 0 && (
                <div className="mt-2 space-y-2">
                  {m.corrections.map((c, j) => (
                    <div
                      key={j}
                      className="rounded-xl border border-accent-400/40 bg-accent-400/10 p-3 text-xs"
                    >
                      <p className="text-slate-400 line-through">
                        {c.original}
                      </p>
                      <p className="font-semibold text-accent-600">
                        ✓ {c.corrected}
                      </p>
                      <p className="mt-1 text-slate-600">{c.explanation}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {interim && (
          <div className="flex justify-end">
            <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-brand-100 px-4 py-2.5 text-sm italic text-brand-700">
              {interim}
            </div>
          </div>
        )}
      </div>

      {error && (
        <p
          role="alert"
          className="mt-2 rounded-xl bg-red-50 px-4 py-2 text-sm text-red-600"
        >
          {error}
        </p>
      )}

      {/* Voice + text controls */}
      <div className="mt-3 flex flex-col items-center gap-3">
        <p className="text-xs font-medium text-slate-500" aria-live="polite">
          {statusLabel[status]}
        </p>

        {sttSupported ? (
          <button
            onClick={toggleMic}
            aria-label={
              status === "listening" ? "Stop listening" : "Start speaking"
            }
            className={`relative flex h-16 w-16 items-center justify-center rounded-full text-white shadow-soft transition ${
              status === "listening"
                ? "bg-red-500"
                : "bg-brand-600 hover:bg-brand-700"
            }`}
            disabled={status === "thinking"}
          >
            {status === "listening" && (
              <span className="absolute inset-0 animate-pulse-ring rounded-full bg-red-400" />
            )}
            <svg
              width="26"
              height="26"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="9" y="3" width="6" height="12" rx="3" />
              <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
            </svg>
          </button>
        ) : (
          <p className="text-xs text-slate-400">
            Voice input isn&apos;t supported here — type your message below.
          </p>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void send(input);
          }}
          className="flex w-full items-center gap-2"
        >
          <input
            className="input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Or type your message…"
            disabled={status === "thinking"}
          />
          <button
            type="submit"
            className="btn-primary"
            disabled={status === "thinking" || !input.trim()}
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
