import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { greeting } from "@/lib/greeting";
import { brand } from "@/config/brand";

export default async function DashboardPage() {
  const session = await getSession();
  const userId = session!.userId;
  const firstName = session!.name.split(" ")[0];

  const [streak, mistakes, words, turns, recentMistakes] = await Promise.all([
    prisma.dailyStreak.findUnique({ where: { userId } }),
    prisma.userMistake.count({ where: { userId } }),
    prisma.userVocabulary.count({ where: { userId } }),
    prisma.conversationMessage.count({
      where: { conversation: { userId }, role: "USER" },
    }),
    prisma.userMistake.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      take: 3,
    }),
  ]);

  const stats = [
    { label: "Day streak", value: streak?.current ?? 0 },
    { label: "Turns spoken", value: turns },
    { label: "Words saved", value: words },
    { label: "Mistakes logged", value: mistakes },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          {greeting()}, {firstName} 👋
        </h1>
        <p className="text-slate-500">Let&apos;s improve your English today.</p>
      </div>

      {/* Talk to Mira — the main card */}
      <Link
        href="/speak"
        className="block rounded-3xl bg-brand-600 p-6 text-white shadow-soft transition hover:bg-brand-700"
      >
        <p className="text-sm font-medium text-brand-100">Main practice</p>
        <h2 className="mt-1 text-2xl font-bold">Talk to {brand.tutorName}</h2>
        <p className="mt-1 max-w-md text-brand-100">
          Practice English with your personal AI tutor. Tap the mic and start
          speaking — no fear, just practice.
        </p>
        <span className="mt-4 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-brand-700">
          Start speaking →
        </span>
      </Link>

      {/* Quick tools */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            href: "/what-should-i-say",
            title: "What should I say?",
            desc: "Simple · polite · professional",
          },
          {
            href: "/fix-my-english",
            title: "Fix my English",
            desc: "Make any sentence natural",
          },
          { href: "/mistakes", title: "My mistakes", desc: "Review & learn" },
          { href: "/progress", title: "Your progress", desc: "See your trend" },
        ].map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="card transition hover:shadow-soft"
          >
            <h3 className="font-semibold text-slate-900">{c.title}</h3>
            <p className="mt-1 text-sm text-slate-500">{c.desc}</p>
          </Link>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="card text-center">
            <p className="text-3xl font-bold text-brand-600">{s.value}</p>
            <p className="mt-1 text-xs font-medium text-slate-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Recent mistakes */}
      <div className="card">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-slate-900">Recent mistakes</h3>
          <Link
            href="/mistakes"
            className="text-sm font-medium text-brand-600 hover:underline"
          >
            View all
          </Link>
        </div>
        {recentMistakes.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">
            No mistakes yet — start a conversation with {brand.tutorName} and
            they&apos;ll appear here so you can review them.
          </p>
        ) : (
          <ul className="mt-3 space-y-3">
            {recentMistakes.map((m) => (
              <li key={m.id} className="rounded-xl bg-slate-50 p-3 text-sm">
                <p className="text-red-500 line-through">{m.original}</p>
                <p className="font-medium text-accent-600">{m.corrected}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
