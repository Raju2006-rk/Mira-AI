import { handler, fail } from "@/lib/api";

export const runtime = "nodejs";

/**
 * Login is now handled client-side by the Firebase SDK in AuthForm.tsx.
 * The client gets a Firebase ID token and exchanges it at POST /api/auth/session.
 * This route returns a clear error if anything hits the old endpoint directly.
 */
export const POST = handler(async () => {
  return fail(
    "Direct credential login is no longer supported. Please use the sign-in form.",
    410,
  );
});
