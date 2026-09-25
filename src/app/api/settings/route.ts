import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/require";
import { handler, ok } from "@/lib/api";

export const runtime = "nodejs";

const schema = z.object({
  voiceEnabled: z.boolean().optional(),
  notificationsOn: z.boolean().optional(),
  saveConversationHistory: z.boolean().optional(),
  speakingRate: z.number().min(0.5).max(2).optional(),
});

export const GET = handler(async () => {
  const session = await requireUser();
  const settings = await prisma.userSettings.findUnique({
    where: { userId: session.userId },
  });
  return ok({ settings });
});

export const PATCH = handler(async (req: Request) => {
  const session = await requireUser();
  const data = schema.parse(await req.json());
  const settings = await prisma.userSettings.upsert({
    where: { userId: session.userId },
    update: data,
    create: { userId: session.userId, ...data },
  });
  return ok({ settings });
});
