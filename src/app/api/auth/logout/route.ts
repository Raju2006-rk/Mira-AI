import { signOut } from "@/lib/auth";
import { handler, ok } from "@/lib/api";

export const runtime = "nodejs";

/**
 * Log out via Auth.js. `signOut({ redirect: false })` clears the Auth.js
 * session cookie without issuing an HTTP redirect, so this route can return
 * its standard JSON envelope. (Req 5.6)
 */
export const POST = handler(async () => {
  await signOut({ redirect: false });
  return ok({ loggedOut: true });
});
