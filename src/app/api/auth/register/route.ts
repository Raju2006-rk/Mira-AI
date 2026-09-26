import { prisma } from "@/lib/db";
import { registerSchema } from "@/lib/validation";
import { hashPassword } from "@/lib/auth/password";
import { handler, ok, fail } from "@/lib/api";

export const runtime = "nodejs";

/**
 * Account creation only. This route hashes the password, creates the `User`
 * with its default `Profile`/`UserSettings`/`DailyStreak` records, and returns
 * the new user.
 *
 * It does NOT establish a session. With the Auth.js Credentials provider,
 * signing a user in from a route handler after programmatic creation is not
 * reliable server-side (the session is issued by the Auth.js callback flow).
 * Instead, the session is established client-side: after a successful register
 * the client (AuthForm) calls `signIn("credentials", { email, password })` to
 * auto-login. (Req 3.4)
 */
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

  return ok({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  });
});
