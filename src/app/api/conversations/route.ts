import { prisma, safeDb } from "@/lib/db";
import { requireUser } from "@/lib/auth/require";
import { handler, ok } from "@/lib/api";

export const runtime = "nodejs";

export const DELETE = handler(async () => {
  const session = await requireUser();
  await safeDb(
    () => prisma.conversation.deleteMany({ where: { userId: session.userId } }),
    null,
  );
  return ok({ cleared: true });
});
