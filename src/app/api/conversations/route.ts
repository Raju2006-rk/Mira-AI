import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/require";
import { handler, ok } from "@/lib/api";

export const runtime = "nodejs";

// Delete all of the learner's conversation history (privacy control, spec §37).
export const DELETE = handler(async () => {
  const session = await requireUser();
  await prisma.conversation.deleteMany({ where: { userId: session.userId } });
  return ok({ cleared: true });
});
