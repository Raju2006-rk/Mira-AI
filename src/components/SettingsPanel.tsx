"use client";

import { useState } from "react";

type Settings = {
  voiceEnabled: boolean;
  notificationsOn: boolean;
  saveConversationHistory: boolean;
};

function Toggle({
  label,
  desc,
  checked,
  onChange,
}: {
  label: string;
  desc: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-slate-100 py-3 last:border-0">
      <div>
        <p className="text-sm font-medium text-slate-900">{label}</p>
        <p className="text-xs text-slate-500">{desc}</p>
      </div>
      <button
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${
          checked ? "bg-brand-600" : "bg-slate-300"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${
            checked ? "left-[22px]" : "left-0.5"
          }`}
        />
      </button>
    </div>
  );
}

export function SettingsPanel({ initial }: { initial: Settings }) {
  const [settings, setSettings] = useState(initial);
  const [message, setMessage] = useState<string | null>(null);

  async function update(patch: Partial<Settings>) {
    const next = { ...settings, ...patch };
    setSettings(next);
    await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
  }

  async function clearHistory() {
    if (
      !confirm("Delete all your conversation history? This cannot be undone.")
    )
      return;
    const res = await fetch("/api/conversations", { method: "DELETE" });
    setMessage(
      res.ok
        ? "Your conversation history was cleared."
        : "Couldn't clear history. Try again.",
    );
  }

  return (
    <div className="space-y-4">
      <div className="card">
        <Toggle
          label="Voice responses"
          desc="Let Mira speak her replies aloud."
          checked={settings.voiceEnabled}
          onChange={(v) => update({ voiceEnabled: v })}
        />
        <Toggle
          label="Notifications"
          desc="Practice reminders and challenges."
          checked={settings.notificationsOn}
          onChange={(v) => update({ notificationsOn: v })}
        />
        <Toggle
          label="Save conversation history"
          desc="Keep your chats so you can review them later."
          checked={settings.saveConversationHistory}
          onChange={(v) => update({ saveConversationHistory: v })}
        />
      </div>

      <div className="card">
        <h2 className="font-semibold text-slate-900">Privacy controls</h2>
        <p className="mt-1 text-sm text-slate-500">
          You control your data. Clear your conversation history at any time.
        </p>
        <button
          onClick={clearHistory}
          className="btn-secondary mt-3 text-red-600"
        >
          Clear conversation history
        </button>
        {message && <p className="mt-2 text-sm text-accent-600">{message}</p>}
      </div>
    </div>
  );
}
