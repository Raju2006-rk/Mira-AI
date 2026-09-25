import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/require";
import { handler, ok, fail } from "@/lib/api";

export const runtime = "nodejs";

// Delete one of the learner's own mistakes (spec §24: users can delete).
export const DELETE = handler(
  async (_req: Request, { params }: { params: { id: string } }) => {
    const session = await requireUser();
    const mistake = await prisma.userMistake.findFirst({
      where: { id: params.id, userId: session.userId },
    });
    if (!mistake) return fail("Mistake not found.", 404);
    await prisma.userMistake.delete({ where: { id: mistake.id } });
    return ok({ deleted: true });
  },
);
