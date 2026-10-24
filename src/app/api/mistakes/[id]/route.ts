import { prisma, safeDb } from "@/lib/db";
import { requireUser } from "@/lib/auth/require";
import { handler, ok, fail } from "@/lib/api";

export const runtime = "nodejs";

export const DELETE = handler(
  async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
    const session = await requireUser();
    const { id } = await params;
    const mistake = await safeDb(
      () =>
        prisma.userMistake.findFirst({ where: { id, userId: session.userId } }),
      null,
    );
    if (!mistake) return fail("Mistake not found.", 404);
    await safeDb(
      () => prisma.userMistake.delete({ where: { id: mistake.id } }),
      null,
    );
    return ok({ deleted: true });
  },
);
