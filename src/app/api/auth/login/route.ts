import { prisma } from "@/lib/db";
import { loginSchema } from "@/lib/validation";
import { verifyPassword } from "@/lib/auth/password";
import { setSessionCookie } from "@/lib/auth/session";
import { handler, ok, fail } from "@/lib/api";

export const runtime = "nodejs";

export const POST = handler(async (req: Request) => {
  const body = await req.json();
  const { email, password } = loginSchema.parse(body);

  const user = await prisma.user.findUnique({ where: { email } });
  // Constant-ish response to avoid leaking which emails exist.
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return fail("Incorrect email or password.", 401);
  }

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
