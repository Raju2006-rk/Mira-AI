import { phrasingSchema } from "@/lib/validation";
import { requireUser } from "@/lib/auth/require";
import { getAIProvider } from "@/lib/ai";
import { buildTutorContext } from "@/lib/context";
import { handler, ok } from "@/lib/api";

export const runtime = "nodejs";

// "What Should I Say?" — the same idea across simple / polite / professional.
export const POST = handler(async (req: Request) => {
  const session = await requireUser();
  const { idea } = phrasingSchema.parse(await req.json());
  const ctx = await buildTutorContext(session.userId, session.name, "TEACHER");
  const result = await getAIProvider().phrasing(idea, ctx);
  return ok(result);
});
