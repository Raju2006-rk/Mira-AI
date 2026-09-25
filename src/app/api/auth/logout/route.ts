import { clearSessionCookie } from "@/lib/auth/session";
import { handler, ok } from "@/lib/api";

export const runtime = "nodejs";

export const POST = handler(async () => {
  clearSessionCookie();
  return ok({ loggedOut: true });
});
