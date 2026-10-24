import { handler, fail } from "@/lib/api";

export const runtime = "nodejs";

/**
 * Registration is now handled client-side by the Firebase SDK in AuthForm.tsx.
 * Firebase createUserWithEmailAndPassword creates the account directly in
 * Firebase Auth — no Prisma / PostgreSQL needed for auth.
 * This route returns a clear error if anything hits the old endpoint directly.
 */
export const POST = handler(async () => {
  return fail(
    "Direct credential registration is no longer supported. Please use the sign-up form.",
    410,
  );
});
