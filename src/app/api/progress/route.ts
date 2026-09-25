import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/require";
import { handler, ok } from "@/lib/api";

export const runtime = "nodejs";

// Aggregate learning indicators for the progress dashboard (spec §23).
export const GET = handler(async () => {
  const session = await requireUser();

  const [
    conversations,
    messageCount,
    mistakes,
    savedWords,
    profile,
    streak,
    lessons,
  ] = await Promise.all([
    prisma.conversation.count({ where: { userId: session.userId } }),
    prisma.conversationMessage.count({
      where: { conversation: { userId: session.userId }, role: "USER" },
    }),
    prisma.userMistake.count({ where: { userId: session.userId } }),
    prisma.userVocabulary.count({ where: { userId: session.userId } }),
    prisma.profile.findUnique({ where: { userId: session.userId } }),
    prisma.dailyStreak.findUnique({ where: { userId: session.userId } }),
    prisma.lessonProgress.count({
      where: { userId: session.userId, completed: true },
    }),
  ]);

  return ok({
    conversations,
    turnsSpoken: messageCount,
    mistakesLogged: mistakes,
    wordsSaved: savedWords,
    lessonsCompleted: lessons,
    confidenceScore: profile?.confidenceScore ?? 50,
    streak: {
      current: streak?.current ?? 0,
      longest: streak?.longest ?? 0,
    },
  });
});
