import { prisma, safeDb } from "@/lib/db";
import type { TutorContext, ConversationMode } from "@/lib/ai";

/** Builds the tutor context from the user's profile. Falls back to defaults if no DB. */
export async function buildTutorContext(
  userId: string,
  name: string,
  mode: ConversationMode,
): Promise<TutorContext> {
  const profile = await safeDb(
    () => prisma.profile.findUnique({ where: { userId } }),
    null,
  );
  return {
    level: profile?.level ?? "BEGINNER",
    mode,
    supportLang: profile?.supportLang ?? "en",
    learnerName: name?.split(" ")[0],
    goals: profile?.goals ?? [],
  };
}
