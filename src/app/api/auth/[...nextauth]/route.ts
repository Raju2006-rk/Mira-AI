import { handlers } from "@/lib/auth";

/**
 * Auth.js (NextAuth v5) catch-all route.
 *
 * Delegates all `/api/auth/*` requests (sign-in, sign-out, OAuth callbacks,
 * CSRF, session, etc.) to the handlers exported from the central auth config.
 * Runs on the Node.js runtime because the credentials provider relies on
 * bcryptjs + Prisma, which need Node APIs.
 */
export const runtime = "nodejs";

export const { GET, POST } = handlers;
