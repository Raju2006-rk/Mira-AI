import { getAdminAuth } from "@/lib/firebase/admin";
import { setSessionCookie } from "@/lib/auth/session";
import { handler, ok, fail } from "@/lib/api";

export const runtime = "nodejs";

/**
 * POST /api/auth/session
 *
 * Accepts a Firebase ID token from the browser, verifies it server-side,
 * then issues a signed httpOnly JWT session cookie so the rest of the app
 * (middleware, server components) can read the session without touching
 * Firebase directly on every request.
 *
 * Body: { idToken: string, name?: string }
 */
export const POST = handler(async (req: Request) => {
  const { idToken, name } = (await req.json()) as {
    idToken: string;
    name?: string;
  };

  if (!idToken) return fail("Missing Firebase ID token.", 400);

  let decoded;
  try {
    decoded = await getAdminAuth().verifyIdToken(idToken);
  } catch (err) {
    console.error("[auth/session] token verification failed:", err);
    return fail("Invalid or expired login token. Please sign in again.", 401);
  }

  await setSessionCookie({
    userId: decoded.uid,
    email: decoded.email ?? "",
    role: "USER",
    name:
      name?.trim() || decoded.name || decoded.email?.split("@")[0] || "Learner",
  });

  return ok({ uid: decoded.uid });
});
