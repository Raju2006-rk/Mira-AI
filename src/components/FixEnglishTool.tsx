"use client";

import { useState } from "react";
import { speak, isSpeechSynthesisSupported } from "@/lib/speech";

type Result = {
  simple: string;
  natural: string;
  professional: string;
  why: string;
};

export function FixEnglishTool() {
  const [sentence, setSentence] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSpeak =
    typeof window !== "undefined" && isSpeechSynthesisSupported();

  async function run(e: React.FormEvent) {
    e.preventDefault();
    if (!sentence.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/fix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sentence }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setError(json.error ?? "Something went wrong. Please try again.");
        return;
      }
      setResult(json.data);
    } catch {
      setError("Couldn't reach the server. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={run} className="card space-y-3">
        <label className="label" htmlFor="sentence">
          Type a sentence and I&apos;ll make it natural
        </label>
        <textarea
          id="sentence"
          className="input min-h-[90px]"
          value={sentence}
          onChange={(e) => setSentence(e.target.value)}
          placeholder="e.g. I am having doubt regarding this."
        />
        <button className="btn-primary" disabled={loading || !sentence.trim()}>
          {loading ? "Fixing…" : "Fix my English"}
        </button>
      </form>

      {error && (
        <p
          role="alert"
          className="rounded-xl bg-red-50 px-4 py-2 text-sm text-red-600"
        >
          {error}
        </p>
      )}

      {result && (
        <div className="space-y-3">
          <div className="rounded-2xl bg-brand-50 p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">
                More natural
              </p>
              {canSpeak && (
                <button
                  onClick={() => speak(result.natural)}
                  className="text-xs font-medium text-brand-600 hover:underline"
                >
                  🔊 Practice saying it
                </button>
              )}
            </div>
            <p className="mt-1 text-lg font-medium text-slate-900">
              {result.natural}
            </p>
          </div>
          <div className="rounded-2xl bg-accent-400/10 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-accent-600">
              Professional
            </p>
            <p className="mt-1 text-slate-800">{result.professional}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Why?
            </p>
            <p className="mt-1 text-sm text-slate-700">{result.why}</p>
          </div>
        </div>
      )}
    </div>
  );
}
