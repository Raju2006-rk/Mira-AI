import { prisma } from "@/lib/db";
import type { TutorContext, ConversationMode } from "@/lib/ai";

/** Builds the tutor context (level, goals, support language) for a user. */
export async function buildTutorContext(
  userId: string,
  name: string,
  mode: ConversationMode,
): Promise<TutorContext> {
  const profile = await prisma.profile.findUnique({ where: { userId } });
  return {
    level: profile?.level ?? "BEGINNER",
    mode,
    supportLang: profile?.supportLang ?? "en",
    learnerName: name?.split(" ")[0],
    goals: profile?.goals ?? [],
  };
}
