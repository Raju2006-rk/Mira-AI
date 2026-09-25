import { prisma } from "@/lib/db";
import { registerSchema } from "@/lib/validation";
import { hashPassword } from "@/lib/auth/password";
import { setSessionCookie } from "@/lib/auth/session";
import { handler, ok, fail } from "@/lib/api";

export const runtime = "nodejs";

export const POST = handler(async (req: Request) => {
  const body = await req.json();
  const { name, email, password } = registerSchema.parse(body);

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return fail("An account with this email already exists.", 409);
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      profile: { create: {} },
      settings: { create: {} },
      streak: { create: {} },
    },
  });

  await setSessionCookie({
    userId: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
  });

  return ok({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  });
});
