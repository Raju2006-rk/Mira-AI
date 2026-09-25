import { fixSchema } from "@/lib/validation";
import { requireUser } from "@/lib/auth/require";
import { getAIProvider } from "@/lib/ai";
import { buildTutorContext } from "@/lib/context";
import { prisma } from "@/lib/db";
import { handler, ok } from "@/lib/api";

export const runtime = "nodejs";

// "Fix My English" — rewrite naturally and record the correction as a mistake.
export const POST = handler(async (req: Request) => {
  const session = await requireUser();
  const { sentence } = fixSchema.parse(await req.json());
  const ctx = await buildTutorContext(
    session.userId,
    session.name,
    "CORRECTION",
  );
  const result = await getAIProvider().fix(sentence, ctx);

  if (result.natural.trim().toLowerCase() !== sentence.trim().toLowerCase()) {
    const existing = await prisma.userMistake.findFirst({
      where: {
        userId: session.userId,
        original: sentence,
        corrected: result.natural,
      },
    });
    if (existing) {
      await prisma.userMistake.update({
        where: { id: existing.id },
        data: { occurrences: { increment: 1 } },
      });
    } else {
      await prisma.userMistake.create({
        data: {
          userId: session.userId,
          original: sentence,
          corrected: result.natural,
          category: "SENTENCE_FORMATION",
          explanation: result.why,
        },
      });
    }
  }

  return ok(result);
});
