import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

/**
 * Session management using signed JWTs stored in an httpOnly cookie.
 * The signing secret comes from AUTH_SECRET and never leaves the server.
 */

const COOKIE_NAME = "speakmate_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

export interface SessionPayload {
  userId: string;
  email: string;
  role: "USER" | "ADMIN";
  name: string;
}

/**
 * Validate the auth signing secret. Throws a descriptive error naming the
 * AUTH_SECRET variable and its 32-character minimum when the secret is missing
 * or too short; otherwise returns it unchanged.
 */
export function getAuthSecret(secret: string | undefined): string {
  if (!secret || secret.length < 32) {
    throw new Error(
      "AUTH_SECRET is missing or too short. It must be at least 32 characters. Set a long random string in your .env file.",
    );
  }
  return secret;
}

function getSecret(): Uint8Array {
  return new TextEncoder().encode(getAuthSecret(process.env.AUTH_SECRET));
}

export async function createSessionToken(
  payload: SessionPayload,
): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(getSecret());
}

export async function verifySessionToken(
  token: string,
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return {
      userId: String(payload.userId),
      email: String(payload.email),
      role: (payload.role as SessionPayload["role"]) ?? "USER",
      name: String(payload.name ?? ""),
    };
  } catch {
    return null;
  }
}

/** Set the session cookie (call from a Server Action / route handler). */
export async function setSessionCookie(payload: SessionPayload): Promise<void> {
  const token = await createSessionToken(payload);
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, "", { path: "/", maxAge: 0 });
}

/** Read + verify the current session from the request cookies. */
export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export const SESSION_COOKIE_NAME = COOKIE_NAME;
