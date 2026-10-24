import { prisma, safeDb } from "@/lib/db";
import { requireUser } from "@/lib/auth/require";
import { handler, ok } from "@/lib/api";

export const runtime = "nodejs";

export const GET = handler(async () => {
  const session = await requireUser();
  const mistakes = await safeDb(
    () =>
      prisma.userMistake.findMany({
        where: { userId: session.userId },
        orderBy: [{ occurrences: "desc" }, { updatedAt: "desc" }],
      }),
    [],
  );
  return ok({ mistakes });
});
