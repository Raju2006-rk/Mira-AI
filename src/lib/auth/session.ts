import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

/**
 * Session management using signed JWTs stored in an httpOnly cookie.
 *
 * Auth flow:
 *  1. Client signs in / registers via Firebase (browser SDK).
 *  2. Client sends the Firebase ID token to POST /api/auth/session.
 *  3. Server verifies the token with Firebase Admin SDK.
 *  4. Server mints its own signed JWT and stores it in an httpOnly cookie.
 *  5. Middleware reads & verifies that cookie on every protected request.
 *
 * Cookie name kept as "speakmate_session" so the middleware config
 * (SESSION_COOKIE_NAME) stays stable.
 */

const COOKIE_NAME = "speakmate_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

export interface SessionPayload {
  userId: string; // Firebase UID
  email: string;
  role: "USER" | "ADMIN";
  name: string;
}

export function getAuthSecret(secret: string | undefined): string {
  if (!secret || secret.length < 32) {
    throw new Error(
      "AUTH_SECRET is missing or too short. It must be at least 32 characters. " +
        "Generate one with: openssl rand -base64 48",
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

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export const SESSION_COOKIE_NAME = COOKIE_NAME;
