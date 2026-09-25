"use client";

import { useState } from "react";

export type Mistake = {
  id: string;
  original: string;
  corrected: string;
  category: string;
  explanation: string;
  occurrences: number;
};

const CATEGORY_LABEL: Record<string, string> = {
  GRAMMAR: "Grammar",
  VOCABULARY: "Vocabulary",
  SENTENCE_FORMATION: "Sentence",
  PRONUNCIATION: "Pronunciation",
  FLUENCY: "Fluency",
  OTHER: "Other",
};

export function MistakeList({ initial }: { initial: Mistake[] }) {
  const [items, setItems] = useState(initial);
  const [busy, setBusy] = useState<string | null>(null);

  async function remove(id: string) {
    setBusy(id);
    try {
      const res = await fetch(`/api/mistakes/${id}`, { method: "DELETE" });
      if (res.ok) setItems((xs) => xs.filter((x) => x.id !== id));
    } finally {
      setBusy(null);
    }
  }

  if (items.length === 0) {
    return (
      <div className="card text-center text-slate-500">
        No mistakes saved yet. As you practice with Mira, your recurring
        mistakes will be collected here so you can review and improve.
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {items.map((m) => (
        <li key={m.id} className="card">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="chip">
                  {CATEGORY_LABEL[m.category] ?? m.category}
                </span>
                {m.occurrences > 1 && (
                  <span className="text-xs text-slate-400">
                    ×{m.occurrences}
                  </span>
                )}
              </div>
              <p className="mt-2 text-sm text-red-500 line-through">
                ❌ {m.original}
              </p>
              <p className="text-sm font-medium text-accent-600">
                ✅ {m.corrected}
              </p>
              <p className="mt-1 text-sm text-slate-600">{m.explanation}</p>
            </div>
            <button
              onClick={() => remove(m.id)}
              disabled={busy === m.id}
              className="shrink-0 rounded-lg px-2 py-1 text-xs text-slate-400 hover:bg-slate-50 hover:text-red-500"
              aria-label="Delete mistake"
            >
              {busy === m.id ? "…" : "Delete"}
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
