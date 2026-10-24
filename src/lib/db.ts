import { PrismaClient } from "@prisma/client";

export function getDatabaseUrl(env: NodeJS.ProcessEnv): string {
  const url = env.DATABASE_URL;
  if (!url || url.length === 0) {
    throw new Error(
      "DATABASE_URL is missing or empty. Set the PostgreSQL connection string in your .env file.",
    );
  }
  return url;
}

// Reuse a single Prisma client across hot-reloads in development.
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

/**
 * Safe DB query helper.
 *
 * Wraps any Prisma call and returns `fallback` if the database is unreachable
 * (missing DATABASE_URL, network timeout, etc.). This lets pages render with
 * empty/default state instead of crashing when no DB is connected — important
 * for CI builds and local dev without a database.
 *
 * Usage:
 *   const mistakes = await safeDb(() => prisma.userMistake.findMany(...), []);
 */
export async function safeDb<T>(
  query: () => Promise<T>,
  fallback: T,
): Promise<T> {
  if (!process.env.DATABASE_URL) return fallback;
  try {
    return await query();
  } catch (err) {
    console.warn("[db] query failed, using fallback:", (err as Error).message);
    return fallback;
  }
}
