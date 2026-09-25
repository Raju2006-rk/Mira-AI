import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/require";
import { handler, ok } from "@/lib/api";

export const runtime = "nodejs";

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

// Register practice activity for today and update the daily streak (spec §25).
export const POST = handler(async () => {
  const session = await requireUser();
  const today = startOfDay(new Date());

  const streak =
    (await prisma.dailyStreak.findUnique({
      where: { userId: session.userId },
    })) ??
    (await prisma.dailyStreak.create({ data: { userId: session.userId } }));

  let current = streak.current;
  if (!streak.lastActiveDay) {
    current = 1;
  } else {
    const last = startOfDay(new Date(streak.lastActiveDay));
    const diffDays = Math.round((today.getTime() - last.getTime()) / 86400000);
    if (diffDays === 0) {
      current = streak.current || 1; // already counted today
    } else if (diffDays === 1) {
      current = streak.current + 1; // consecutive day
    } else {
      current = 1; // streak broken, restart
    }
  }

  const updated = await prisma.dailyStreak.update({
    where: { userId: session.userId },
    data: {
      current,
      longest: Math.max(current, streak.longest),
      lastActiveDay: today,
    },
  });

  return ok({ current: updated.current, longest: updated.longest });
});
