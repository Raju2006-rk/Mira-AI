import { prisma } from "@/lib/db";
import { loginSchema } from "@/lib/validation";
import { verifyPassword } from "@/lib/auth/password";
import { setSessionCookie } from "@/lib/auth/session";
import { handler, ok, fail } from "@/lib/api";

export const runtime = "nodejs";

/**
 * Legacy credential login. Primary login now flows through Auth.js
 * (`signIn("credentials")` -> `/api/auth/callback/credentials`), so this route
 * is a thin compatibility fallback. It is retained to guarantee a working
 * email/password endpoint regardless of client wiring. (Req 5.6)
 */
export const POST = handler(async (req: Request) => {
  const body = await req.json();
  const { email, password } = loginSchema.parse(body);

  const user = await prisma.user.findUnique({ where: { email } });
  // Constant-ish response to avoid leaking which emails exist. `passwordHash`
  // is now optional (OAuth-only accounts have none), so guard before verifying.
  if (!user?.passwordHash) {
    return fail("Incorrect email or password.", 401);
  }
  if (!(await verifyPassword(password, user.passwordHash))) {
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
