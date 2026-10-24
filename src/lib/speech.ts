/**
 * Browser Web Speech API wrappers — STT (speech-to-text) and TTS
 * (text-to-speech). Runs entirely client-side, no API keys required.
 *
 * TTS voice selection targets an Indian English male voice using a priority
 * list that covers Chrome, Edge, Safari, Firefox, and Android WebView on
 * Indian devices. Falls back gracefully through progressively looser matches
 * so speech always works even when no Indian voice is installed.
 */

// ─── Type declarations for Web Speech API (not in DOM lib by default) ────────

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

// ─── Voice selection ──────────────────────────────────────────────────────────

/**
 * Ordered list of voice name fragments that identify Indian English male
 * voices across browsers and platforms. Matching is case-insensitive substring.
 *
 * Priority:
 *  1. Named Indian male voices available in Chrome/Edge on Windows/Android
 *  2. Any voice whose name contains "India" + male indicator
 *  3. Any en-IN voice
 *  4. Any English male voice
 *  5. Any English voice (final fallback)
 */
const INDIAN_MALE_VOICE_NAMES = [
  // Chrome / Edge (Windows, Android)
  "ravi", // Google Hindi — closest Indian male English
  "heera", // Microsoft Heera (en-IN, female fallback — skip below)
  "hemant", // Microsoft Hemant (hi-IN male)
  "kalpana", // skip (female)
  "arun", // Some Android TTS engines
  "mohan",
  "arjun",
  "raj",
  "deepak",
  // Generic India markers
  "india",
  "hindi",
];

// Names that indicate a female voice — used to downrank matches.
const FEMALE_INDICATORS = [
  "female",
  "woman",
  "girl",
  "zira",
  "heera",
  "kalpana",
  "aditi",
];

function isFemale(v: SpeechSynthesisVoice): boolean {
  const n = v.name.toLowerCase();
  return FEMALE_INDICATORS.some((f) => n.includes(f));
}

function isMale(v: SpeechSynthesisVoice): boolean {
  return !isFemale(v);
}

function scoreVoice(v: SpeechSynthesisVoice): number {
  const name = v.name.toLowerCase();
  const lang = v.lang.toLowerCase();

  // Tier 1: named Indian male voice
  for (let i = 0; i < INDIAN_MALE_VOICE_NAMES.length; i++) {
    if (name.includes(INDIAN_MALE_VOICE_NAMES[i]) && isMale(v)) {
      return 1000 - i;
    }
  }
  // Tier 2: en-IN male
  if (lang.startsWith("en-in") && isMale(v)) return 500;
  // Tier 3: en-IN any gender
  if (lang.startsWith("en-in")) return 400;
  // Tier 4: any Indian language male
  if (
    (lang.startsWith("hi") || lang.startsWith("en")) &&
    name.includes("india") &&
    isMale(v)
  )
    return 300;
  // Tier 5: en-US/en-GB male
  if (lang.startsWith("en") && isMale(v)) return 100;
  // Tier 6: any English voice
  if (lang.startsWith("en")) return 10;
  return 0;
}

let _selectedVoice: SpeechSynthesisVoice | null = null;
let _voicesLoaded = false;

/**
 * Call this once on mount to pre-load the voice list (async on most browsers).
 * Resolves when voices are available or after a 3-second timeout.
 */
export function loadVoices(): Promise<void> {
  return new Promise((resolve) => {
    if (!isSpeechSynthesisSupported()) {
      resolve();
      return;
    }
    const ss = window.speechSynthesis;

    function pick() {
      const voices = ss.getVoices();
      if (voices.length === 0) return false;
      const scored = voices
        .map((v) => ({ v, score: scoreVoice(v) }))
        .filter(({ score }) => score > 0)
        .sort((a, b) => b.score - a.score);
      _selectedVoice = scored[0]?.v ?? voices[0] ?? null;
      _voicesLoaded = true;
      return true;
    }

    if (pick()) {
      resolve();
      return;
    }

    // Voices not ready yet — wait for the event.
    const onVoicesChanged = () => {
      pick();
      resolve();
    };
    ss.addEventListener("voiceschanged", onVoicesChanged, { once: true });
    // Safety timeout — give up after 3 s and use whatever is available.
    setTimeout(() => {
      pick();
      resolve();
    }, 3000);
  });
}

export function getSelectedVoiceName(): string {
  return _selectedVoice?.name ?? "Default";
}

// ─── Public TTS function ──────────────────────────────────────────────────────

/**
 * Speaks `text` using the best available Indian English male voice.
 * Falls back to the browser default when no suitable voice is found.
 */
export function speak(text: string, rate = 0.95): void {
  if (!isSpeechSynthesisSupported()) return;
  window.speechSynthesis.cancel();

  const u = new SpeechSynthesisUtterance(text);
  u.lang = "en-IN";
  u.rate = rate;
  u.pitch = 0.95; // slightly deeper, more natural male pitch

  if (_voicesLoaded && _selectedVoice) {
    u.voice = _selectedVoice;
  } else {
    // Voices not loaded yet — try a quick synchronous pick.
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      const scored = voices
        .map((v) => ({ v, score: scoreVoice(v) }))
        .filter(({ score }) => score > 0)
        .sort((a, b) => b.score - a.score);
      if (scored[0]) u.voice = scored[0].v;
    }
  }

  window.speechSynthesis.speak(u);
}

export function stopSpeaking(): void {
  if (isSpeechSynthesisSupported()) window.speechSynthesis.cancel();
}

// ─── STT ──────────────────────────────────────────────────────────────────────

export interface Recognizer {
  stop(): void;
}

/**
 * Starts listening. Calls `onFinal` with the recognised text when the user
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
  // en-IN so the recogniser understands Indian English accents better.
  rec.lang = opts.lang ?? "en-IN";
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
