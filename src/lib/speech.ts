/**
 * Thin wrappers around the browser Web Speech API for speech-to-text (STT) and
 * text-to-speech (TTS). These run entirely client-side and need no API keys.
 *
 * Everything degrades gracefully: callers check `isSpeechRecognitionSupported`
 * / `isSpeechSynthesisSupported` and fall back to text input when unsupported
 * (spec §36, §43).
 */

// The Web Speech API types aren't in the DOM lib, so we declare what we use.
type SpeechRecognitionResultLike = {
  0: { transcript: string };
  isFinal: boolean;
};
type SpeechRecognitionEventLike = {
  results: ArrayLike<SpeechRecognitionResultLike>;
};
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
}

function getRecognitionCtor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function isSpeechRecognitionSupported(): boolean {
  return getRecognitionCtor() !== null;
}

export function isSpeechSynthesisSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export interface Recognizer {
  stop(): void;
}

/**
 * Starts listening. Calls `onFinal` with the recognized text when the user
 * stops. Calls `onError` with a friendly message on failure.
 */
export function startListening(opts: {
  lang?: string;
  onInterim?: (text: string) => void;
  onFinal: (text: string) => void;
  onError: (message: string) => void;
  onEnd?: () => void;
}): Recognizer | null {
  const Ctor = getRecognitionCtor();
  if (!Ctor) {
    opts.onError(
      "Voice input isn't supported in this browser. You can type instead.",
    );
    return null;
  }
  const rec = new Ctor();
  rec.lang = opts.lang ?? "en-US";
  rec.continuous = false;
  rec.interimResults = true;

  let finalText = "";
  rec.onresult = (e) => {
    let interim = "";
    for (let i = 0; i < e.results.length; i++) {
      const r = e.results[i];
      if (r.isFinal) finalText += r[0].transcript;
      else interim += r[0].transcript;
    }
    if (interim && opts.onInterim) opts.onInterim(interim);
  };
  rec.onerror = (e) => {
    const map: Record<string, string> = {
      "not-allowed":
        "Microphone permission was denied. Please allow it and try again.",
      "no-speech": "I didn't catch that. Please try speaking again.",
      "audio-capture": "No microphone was found. Please check your device.",
      network: "Voice recognition needs a network connection right now.",
    };
    opts.onError(
      map[e.error] ??
        "Something went wrong with the microphone. Please try again.",
    );
  };
  rec.onend = () => {
    if (finalText.trim()) opts.onFinal(finalText.trim());
    opts.onEnd?.();
  };

  try {
    rec.start();
  } catch {
    opts.onError("Couldn't start the microphone. Please try again.");
    return null;
  }
  return { stop: () => rec.stop() };
}

/** Speaks the given text using the browser's TTS voice. */
export function speak(text: string, rate = 1): void {
  if (!isSpeechSynthesisSupported()) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "en-US";
  u.rate = rate;
  window.speechSynthesis.speak(u);
}

export function stopSpeaking(): void {
  if (isSpeechSynthesisSupported()) window.speechSynthesis.cancel();
}
