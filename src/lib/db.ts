import { PrismaClient } from "@prisma/client";

/**
 * Validate the PostgreSQL connection string. Throws a descriptive error naming
 * the DATABASE_URL variable when it is absent or an empty string; otherwise
 * returns the value unchanged.
 *
 * Pure and side-effect free so it can be unit-tested (see Property 5).
 */
export function getDatabaseUrl(env: NodeJS.ProcessEnv): string {
  const url = env.DATABASE_URL;
  if (!url || url.length === 0) {
    throw new Error(
      "DATABASE_URL is missing or empty. Set the PostgreSQL connection string in your .env file (e.g. postgresql://user:password@host:5432/db).",
    );
  }
  return url;
}

// Reuse a single Prisma client across hot-reloads in development to avoid
// exhausting database connections.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

// NOTE: We deliberately do NOT invoke getDatabaseUrl(process.env) at module
// evaluation time. Importing this module (transitively via @/lib/auth and the
// auth pages) must not throw when DATABASE_URL is unset, otherwise the page
// render crashes before any request is handled (Next.js 16 + Turbopack dev).
// Prisma reads DATABASE_URL lazily and errors only when a query actually runs
// without a connection string — the correct fail-at-use behavior. An explicit
// startup validation, if desired, belongs in a request/startup path that calls
// the exported getDatabaseUrl(env) helper, not here at import time.
