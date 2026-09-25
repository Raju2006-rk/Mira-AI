import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/require";
import { handler, ok } from "@/lib/api";

export const runtime = "nodejs";

// List the learner's saved mistakes (most frequent first).
export const GET = handler(async () => {
  const session = await requireUser();
  const mistakes = await prisma.userMistake.findMany({
    where: { userId: session.userId },
    orderBy: [{ occurrences: "desc" }, { updatedAt: "desc" }],
  });
  return ok({ mistakes });
});
