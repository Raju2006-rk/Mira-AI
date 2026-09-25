import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { MistakeList } from "@/components/MistakeList";

export default async function MistakesPage() {
  const session = await getSession();
  const mistakes = await prisma.userMistake.findMany({
    where: { userId: session!.userId },
    orderBy: [{ occurrences: "desc" }, { updatedAt: "desc" }],
  });

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          My English mistakes
        </h1>
        <p className="text-slate-500">
          Your recurring mistakes, saved automatically. Review them, then delete
          the ones you&apos;ve mastered.
        </p>
      </div>
      <MistakeList
        initial={mistakes.map((m) => ({
          id: m.id,
          original: m.original,
          corrected: m.corrected,
          category: m.category,
          explanation: m.explanation,
          occurrences: m.occurrences,
        }))}
      />
    </div>
  );
}
