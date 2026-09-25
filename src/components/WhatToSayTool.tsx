"use client";

import { useState } from "react";

type Result = {
  simple: string;
  polite: string;
  professional: string;
  note: string;
};

export function WhatToSayTool() {
  const [idea, setIdea] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(e: React.FormEvent) {
    e.preventDefault();
    if (!idea.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/phrasing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea }),
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

  const rows: { label: string; key: keyof Result; tone: string }[] = [
    { label: "Simple", key: "simple", tone: "bg-slate-50" },
    { label: "Polite", key: "polite", tone: "bg-brand-50" },
    { label: "Professional", key: "professional", tone: "bg-accent-400/10" },
  ];

  return (
    <div className="space-y-4">
      <form onSubmit={run} className="card space-y-3">
        <label className="label" htmlFor="idea">
          What do you want to say? (in simple words or your language)
        </label>
        <textarea
          id="idea"
          className="input min-h-[90px]"
          value={idea}
          onChange={(e) => setIdea(e.target.value)}
          placeholder="e.g. I want to ask teacher whether class is cancelled."
        />
        <button className="btn-primary" disabled={loading || !idea.trim()}>
          {loading ? "Thinking…" : "Show me how to say it"}
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
          {rows.map((r) => (
            <div key={r.key} className={`rounded-2xl p-4 ${r.tone}`}>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {r.label}
              </p>
              <p className="mt-1 text-slate-800">{result[r.key]}</p>
            </div>
          ))}
          <p className="text-sm text-slate-500">{result.note}</p>
        </div>
      )}
    </div>
  );
}
