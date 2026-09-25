import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

function Ring({ value, label }: { value: number; label: string }) {
  const clamped = Math.max(0, Math.min(100, value));
  const circumference = 2 * Math.PI * 40;
  const dash = (clamped / 100) * circumference;
  return (
    <div className="flex flex-col items-center">
      <svg
        width="110"
        height="110"
        viewBox="0 0 100 100"
        role="img"
        aria-label={`${label}: ${clamped}%`}
      >
        <circle
          cx="50"
          cy="50"
          r="40"
          fill="none"
          stroke="#e2e8f0"
          strokeWidth="10"
        />
        <circle
          cx="50"
          cy="50"
          r="40"
          fill="none"
          stroke="#1f47f5"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference}`}
          transform="rotate(-90 50 50)"
        />
        <text
          x="50"
          y="55"
          textAnchor="middle"
          className="fill-slate-900 text-lg font-bold"
        >
          {clamped}%
        </text>
      </svg>
      <p className="mt-1 text-sm font-medium text-slate-600">{label}</p>
    </div>
  );
}

export default async function ProgressPage() {
  const session = await getSession();
  const userId = session!.userId;

  const [profile, streak, turns, mistakes, words] = await Promise.all([
    prisma.profile.findUnique({ where: { userId } }),
    prisma.dailyStreak.findUnique({ where: { userId } }),
    prisma.conversationMessage.count({
      where: { conversation: { userId }, role: "USER" },
    }),
    prisma.userMistake.count({ where: { userId } }),
    prisma.userVocabulary.count({ where: { userId } }),
  ]);

  // Learning indicators (not scientific measurements — spec §10, §23).
  const confidence = profile?.confidenceScore ?? 50;
  const speaking = Math.min(100, 40 + turns * 3);
  const grammar = Math.max(10, 90 - mistakes * 4);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Your progress</h1>
        <p className="text-slate-500">
          These are learning indicators to guide your practice — not exact
          scores.
        </p>
      </div>

      <div className="card grid grid-cols-1 gap-6 sm:grid-cols-3">
        <Ring value={confidence} label="Confidence" />
        <Ring value={speaking} label="Speaking" />
        <Ring value={grammar} label="Grammar" />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: "Current streak", value: `${streak?.current ?? 0} days` },
          { label: "Longest streak", value: `${streak?.longest ?? 0} days` },
          { label: "Turns spoken", value: turns },
          { label: "Words saved", value: words },
        ].map((s) => (
          <div key={s.label} className="card text-center">
            <p className="text-2xl font-bold text-brand-600">{s.value}</p>
            <p className="mt-1 text-xs font-medium text-slate-500">{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
