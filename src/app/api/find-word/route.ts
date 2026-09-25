import { findWordSchema } from "@/lib/validation";
import { requireUser } from "@/lib/auth/require";
import { getAIProvider } from "@/lib/ai";
import { buildTutorContext } from "@/lib/context";
import { handler, ok } from "@/lib/api";

export const runtime = "nodejs";

// "Find the Right Word" — describe an idea, get a word + how to use it.
export const POST = handler(async (req: Request) => {
  const session = await requireUser();
  const { description } = findWordSchema.parse(await req.json());
  const ctx = await buildTutorContext(session.userId, session.name, "TEACHER");
  const result = await getAIProvider().findWord(description, ctx);
  return ok(result);
});
