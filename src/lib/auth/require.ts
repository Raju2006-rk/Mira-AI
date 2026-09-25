import { getSession, type SessionPayload } from "./session";

/**
 * Server-side guard for route handlers. Returns the session or throws a
 * response-friendly error object the caller can map to a 401.
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
