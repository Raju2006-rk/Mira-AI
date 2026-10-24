import { prisma, safeDb } from "@/lib/db";
import { requireUser } from "@/lib/auth/require";
import { handler, ok } from "@/lib/api";

export const runtime = "nodejs";

export const GET = handler(async () => {
  const session = await requireUser();
  const uid = session.userId;

  const [
    conversations,
    messageCount,
    mistakes,
    savedWords,
    profile,
    streak,
    lessons,
  ] = await Promise.all([
    safeDb(() => prisma.conversation.count({ where: { userId: uid } }), 0),
    safeDb(
      () =>
        prisma.conversationMessage.count({
          where: { conversation: { userId: uid }, role: "USER" },
        }),
      0,
    ),
    safeDb(() => prisma.userMistake.count({ where: { userId: uid } }), 0),
    safeDb(() => prisma.userVocabulary.count({ where: { userId: uid } }), 0),
    safeDb(() => prisma.profile.findUnique({ where: { userId: uid } }), null),
    safeDb(
      () => prisma.dailyStreak.findUnique({ where: { userId: uid } }),
      null,
    ),
    safeDb(
      () =>
        prisma.lessonProgress.count({
          where: { userId: uid, completed: true },
        }),
      0,
    ),
  ]);

  return ok({
    conversations,
    turnsSpoken: messageCount,
    mistakesLogged: mistakes,
    wordsSaved: savedWords,
    lessonsCompleted: lessons,
    confidenceScore: profile?.confidenceScore ?? 50,
    streak: { current: streak?.current ?? 0, longest: streak?.longest ?? 0 },
  });
});
