/**
 * Task 8.1 — Unit tests for the Auth.js session-cookie attributes and JWT
 * session settings. (Requirements 5.1, 5.2, 5.3; Design: Testing Strategy)
 *
 * These are plain, deterministic example/unit assertions (NOT property tests).
 *
 * Also covers task 8.5 (Prisma adapter wiring, integration-lite) since it is
 * asserted against the same `authConfig` object.
 *
 * ── Approach notes ──────────────────────────────────────────────────────────
 * Importing `@/lib/auth` has eager module-load side effects:
 *   1. `getAuthSecret(process.env.AUTH_SECRET)` throws if the secret is missing
 *      or < 32 chars.
 *   2. `NextAuth(...)` / `buildProviders(process.env)` run at load, and the
 *      Prisma adapter constructs against `@/lib/db`.
 * We mirror the pattern from `auth-properties.test.ts`: stub a valid
 * AUTH_SECRET (and a DATABASE_URL fallback) BEFORE the module is imported, mock
 * `@/lib/db` so no real PrismaClient/DATABASE_URL is needed, and import the auth
 * module *dynamically* inside the tests (after env is set).
 */
import { describe, it, expect, beforeAll, vi } from "vitest";

// Mock the DB layer so importing @/lib/auth does not spin up a real
// PrismaClient. PrismaAdapter only needs an object to wrap; the adapter method
// assertions (8.5) don't touch the DB.
vi.mock("@/lib/db", () => ({
  getDatabaseUrl: (env: NodeJS.ProcessEnv) => env.DATABASE_URL ?? "",
  prisma: {
    user: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
    account: { create: vi.fn() },
  },
}));

const VALID_SECRET = "x".repeat(48); // >= 32 chars

beforeAll(() => {
  // Must be set before any dynamic import of @/lib/auth (module-load guard).
  vi.stubEnv("AUTH_SECRET", VALID_SECRET);
  vi.stubEnv("DATABASE_URL", "postgresql://u:p@localhost:5432/db");
});

describe("Auth.js session cookie & JWT session config (task 8.1)", () => {
  it("session cookie is httpOnly, sameSite=lax, path=/", async () => {
    const { authConfig } = await import("@/lib/auth");
    const opts = authConfig.cookies!.sessionToken!.options!;

    expect(opts.httpOnly).toBe(true);
    expect(opts.sameSite).toBe("lax");
    expect(opts.path).toBe("/");
  });

  it("cookie `secure` is derived from NODE_ENV — false outside production", async () => {
    // `secure` is computed once at module load from `NODE_ENV === "production"`.
    // Under Vitest NODE_ENV is "test", so it must be false here. Production
    // hardening (secure=true) is exercised by a production build/run and cannot
    // be toggled after the module is loaded.
    expect(process.env.NODE_ENV).not.toBe("production");

    const { authConfig } = await import("@/lib/auth");
    const opts = authConfig.cookies!.sessionToken!.options!;
    expect(opts.secure).toBe(false);
  });

  it("uses the custom session cookie name", async () => {
    const { authConfig } = await import("@/lib/auth");
    expect(authConfig.cookies!.sessionToken!.name).toBe("speakmate_session");
  });

  it("session strategy is jwt with a 7-day (604800s) max age", async () => {
    const { authConfig } = await import("@/lib/auth");
    expect(authConfig.session!.strategy).toBe("jwt");
    expect(authConfig.session!.maxAge).toBe(604800);
  });
});

describe("Prisma adapter wiring (task 8.5, integration-lite)", () => {
  it("authConfig.adapter exposes the adapter methods wired to prisma", async () => {
    const { authConfig } = await import("@/lib/auth");
    const adapter = authConfig.adapter!;

    // PrismaAdapter returns an object implementing the Auth.js Adapter contract.
    // We assert the methods the OAuth create/link flow depends on are present
    // and callable, which proves the adapter is constructed and wired.
    expect(typeof adapter.createUser).toBe("function");
    expect(typeof adapter.linkAccount).toBe("function");
    expect(typeof adapter.getUserByAccount).toBe("function");
  });

  // Full create-User + linked-Account persistence requires a live PostgreSQL
  // database, which is not available in this environment. It is documented and
  // covered by a live-DB integration run rather than mocked here (mocking the
  // adapter would only test the mock, not real persistence).
  it.skip("persists a User and a linked Account (requires live DB integration run)", () => {
    // Intentionally skipped — see comment above. Run against a real DATABASE_URL
    // to exercise adapter.createUser + adapter.linkAccount end to end.
  });
});
