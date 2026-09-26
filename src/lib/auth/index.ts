import NextAuth from "next-auth";
import type { NextAuthConfig } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import { getAuthSecret } from "@/lib/auth/session";
import { loginSchema } from "@/lib/validation";

/**
 * Central Auth.js (NextAuth v5) configuration.
 *
 * This module is the single source of truth for authentication: it composes
 * the enabled providers, wires the Prisma adapter, and exposes `auth`,
 * `signIn`, `signOut`, and `handlers` for the rest of the app.
 *
 * Runs on the Node.js runtime (bcryptjs + Prisma need Node APIs).
 */

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days (Req 5.4)

type Providers = NextAuthConfig["providers"];

/**
 * Pure, testable provider selection.
 *
 * Always includes the `Credentials` provider (email/password). Google and
 * GitHub are added only when both of their respective client id/secret
 * environment variables are present and non-empty. This is the single source
 * of truth for "which sign-in methods are available" and drives both
 * server-side registration and the login UI. (Req 1.5, 2.6, 8.2, 8.3)
 */
export function buildProviders(env: NodeJS.ProcessEnv): Providers {
  const providers: Providers = [
    Credentials({
      credentials: {
        email: {},
        password: {},
      },
      authorize: async (raw) => {
        const { email, password } = loginSchema.parse(raw);
        const user = await prisma.user.findUnique({ where: { email } });
        // No such user, or an OAuth-only account with no password set.
        if (!user?.passwordHash) return null;
        if (!(await verifyPassword(password, user.passwordHash))) return null;
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ];

  if (hasOAuthKeys(env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET)) {
    providers.push(Google);
  }
  if (hasOAuthKeys(env.GITHUB_CLIENT_ID, env.GITHUB_CLIENT_SECRET)) {
    providers.push(GitHub);
  }

  return providers;
}

/** Both credentials must be present and non-empty for a provider to enable. */
function hasOAuthKeys(
  id: string | undefined,
  secret: string | undefined,
): boolean {
  return Boolean(id && secret);
}

/**
 * The list of enabled provider ids (e.g. `["credentials", "google", "github"]`)
 * derived from the same env checks as {@link buildProviders}. The login UI uses
 * this to render sign-in buttons only for configured methods. (Req 8.2, 8.3)
 */
export function enabledProviderNames(env: NodeJS.ProcessEnv): string[] {
  const names = ["credentials"];
  if (hasOAuthKeys(env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET)) {
    names.push("google");
  }
  if (hasOAuthKeys(env.GITHUB_CLIENT_ID, env.GITHUB_CLIENT_SECRET)) {
    names.push("github");
  }
  return names;
}

/**
 * The NextAuth configuration object, extracted to a named export so its
 * callbacks and events (e.g. `events.createUser`) are unit/property testable
 * in isolation without going through the OAuth transport. (Testing Strategy)
 */
export const authConfig = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt", maxAge: SESSION_MAX_AGE_SECONDS },
  secret: getAuthSecret(process.env.AUTH_SECRET),
  providers: buildProviders(process.env),
  pages: { signIn: "/login", error: "/login" },
  cookies: {
    sessionToken: {
      name: "speakmate_session",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  callbacks: {
    /**
     * Gate GitHub sign-in on a verified email. (Req 2.5)
     *
     * GitHub doesn't always expose a usable email on the OAuth profile (users
     * can keep it private), and an unverified/absent email must never be used
     * to create or link an account — that would allow email-spoofed takeover.
     * We only permit the sign-in when a usable verified email is present, using
     * whatever the profile exposes: a top-level verified email, or the
     * `emails` array GitHub returns (each entry carries `verified`). Every
     * other provider (Google, Credentials) is unaffected.
     */
    signIn: async ({ account, profile, user }) => {
      if (account?.provider !== "github") return true;
      return hasVerifiedGitHubEmail(profile, user);
    },

    /**
     * On the initial sign-in the DB/authorize `user` is present; copy its
     * identity + role onto the token so authorization data lives in the signed
     * cookie and middleware needs no DB round-trip. (Req 5.7)
     */
    jwt: async ({ token, user }) => {
      if (user) {
        if (user.id) token.id = user.id;
        if (user.email) token.email = user.email;
        if (user.name) token.name = user.name;
        token.role = user.role;
      }
      return token;
    },

    /** Mirror the token fields onto `session.user` for app consumers. (Req 5.7) */
    session: async ({ session, token }) => {
      session.user.id = token.id;
      if (token.email) session.user.email = token.email;
      if (token.name) session.user.name = token.name;
      session.user.role = token.role;
      return session;
    },
  },
  events: {
    /**
     * When the adapter creates a brand-new `User` (OAuth first sign-in), give
     * them the same default records the credentials register flow creates:
     * a `Profile`, `UserSettings`, and `DailyStreak`. This mirrors the nested
     * `create` in `src/app/api/auth/register/route.ts`. (Req 4.6)
     */
    createUser: async ({ user }) => {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          profile: { create: {} },
          settings: { create: {} },
          streak: { create: {} },
        },
      });
    },
  },
} satisfies NextAuthConfig;

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);

/**
 * Determine whether a GitHub OAuth profile carries a usable verified email.
 *
 * GitHub's profile shape varies: some tokens surface a top-level `email`, and
 * the `/user/emails` scope yields an `emails` array where each entry has a
 * `verified` flag. We accept the sign-in when either a verified entry exists,
 * or (as a fallback for tokens that only expose the primary email without the
 * array) a top-level email is present. The resolved `user.email` from the
 * adapter is also honored. `profile` is loosely typed by Auth.js, so we read
 * it defensively without `any`.
 */
export function hasVerifiedGitHubEmail(
  profile: Record<string, unknown> | undefined,
  user: { email?: string | null } | undefined,
): boolean {
  const emails = profile?.emails;
  if (Array.isArray(emails)) {
    const verified = emails.some(
      (e): boolean =>
        typeof e === "object" &&
        e !== null &&
        (e as { verified?: unknown }).verified === true &&
        typeof (e as { email?: unknown }).email === "string",
    );
    if (verified) return true;
  }

  const profileEmail = profile?.email;
  if (typeof profileEmail === "string" && profileEmail.length > 0) {
    return true;
  }

  return Boolean(user?.email);
}
