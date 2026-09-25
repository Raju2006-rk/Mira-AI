import { prisma } from "@/lib/db";
import { chatSchema } from "@/lib/validation";
import { requireUser } from "@/lib/auth/require";
import { getAIProvider } from "@/lib/ai";
import { buildTutorContext } from "@/lib/context";
import { handler, ok } from "@/lib/api";
import type { Prisma } from "@prisma/client";

export const runtime = "nodejs";

export const POST = handler(async (req: Request) => {
  const session = await requireUser();
  const body = await req.json();
  const { conversationId, message, mode } = chatSchema.parse(body);

  // Find or create the conversation for this user.
  let conversation = conversationId
    ? await prisma.conversation.findFirst({
        where: { id: conversationId, userId: session.userId },
        include: { messages: { orderBy: { createdAt: "asc" }, take: 20 } },
      })
    : null;

  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: { userId: session.userId, mode },
      include: { messages: true },
    });
  }

  // Persist the user's turn.
  await prisma.conversationMessage.create({
    data: { conversationId: conversation.id, role: "USER", content: message },
  });

  // Build history for the provider.
  const history = [
    ...conversation.messages.map((m) => ({
      role: m.role.toLowerCase() as "user" | "assistant" | "system",
      content: m.content,
    })),
    { role: "user" as const, content: message },
  ];

  const ctx = await buildTutorContext(session.userId, session.name, mode);
  const provider = getAIProvider();
  const result = await provider.chat(history, ctx);

  // Persist Mira's reply with any structured corrections.
  const assistantMsg = await prisma.conversationMessage.create({
    data: {
      conversationId: conversation.id,
      role: "ASSISTANT",
      content: result.reply,
      correction:
        result.corrections.length > 0
          ? (result.corrections as unknown as Prisma.InputJsonValue)
          : undefined,
    },
  });

  // Auto-record important mistakes into the personal Mistake Book (spec §24).
  for (const c of result.corrections) {
    if (c.original.trim().toLowerCase() === c.corrected.trim().toLowerCase())
      continue;
    const existing = await prisma.userMistake.findFirst({
      where: {
        userId: session.userId,
        original: c.original,
        corrected: c.corrected,
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
          original: c.original,
          corrected: c.corrected,
          category: c.category,
          explanation: c.explanation,
        },
      });
    }
  }

  await prisma.conversation.update({
    where: { id: conversation.id },
    data: { updatedAt: new Date() },
  });

  return ok({
    conversationId: conversation.id,
    reply: result.reply,
    corrections: result.corrections,
    messageId: assistantMsg.id,
  });
});
