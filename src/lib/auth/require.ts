import { auth } from "@/lib/auth";
import type { SessionPayload } from "./session";

/**
 * Shape of the fields we read off `session.user`. Auth.js (next-auth v5 beta)
 * types the default user loosely as `{ name?, email?, image? }`, so `id` and
 * `role` — which our jwt/session callbacks add — are not on the default type.
 * We read them through this local type instead of `any` to stay type-safe
 * while tolerating the loose upstream typing.
 */
type SessionUser = {
  id?: string | null;
  email?: string | null;
  name?: string | null;
  role?: SessionPayload["role"] | null;
};

/**
 * Server-side guard for route handlers. Reads the current Auth.js session and
 * returns it normalized to {@link SessionPayload}; throws a response-friendly
 * error object (status 401) the caller can map to a friendly response.
 *
 * Auth.js exposes the user as `session.user.id`; existing callers expect
 * `session.userId`, so we map `id` -> `userId` here to keep the return shape
 * compatible and require no changes at the call sites.
 */
export async function requireUser(): Promise<SessionPayload> {
  const session = await auth();
  const user = session?.user as SessionUser | undefined;

  if (!session || !user?.id) {
    const err = new Error("Not authenticated") as Error & { status?: number };
    err.status = 401;
    throw err;
  }

  return {
    userId: user.id,
    email: user.email ?? "",
    role: user.role ?? "USER",
    name: user.name ?? "",
  };
}
