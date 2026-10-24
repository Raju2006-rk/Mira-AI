import { clearSessionCookie } from "@/lib/auth/session";
import { handler, ok } from "@/lib/api";

export const runtime = "nodejs";

// Clears the server-side session cookie.
// Firebase client-side sign-out is handled in AppNav before this is called.
export const POST = handler(async () => {
  await clearSessionCookie();
  return ok({ loggedOut: true });
});
