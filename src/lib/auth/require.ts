import { getSession } from "./session";
import type { SessionPayload } from "./session";

export type { SessionPayload };

/**
 * Server-side guard for route handlers.
 * Returns the session payload or throws a 401 error.
 */
export async function requireUser(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) {
    const err = new Error("Not authenticated") as Error & { status?: number };
    err.status = 401;
    throw err;
  }
  return session;
}

/**
 * Non-throwing session accessor for server components and layouts.
 * Returns SessionPayload or null — never throws.
 */
export async function getServerSession(): Promise<SessionPayload | null> {
  return getSession();
}
