/**
 * Property-based tests for the pure auth logic (tasks 6.1–6.9).
 *
 * Feature: free-auth-and-database — correctness Properties 1–9 from design.md.
 * Runner: Vitest (`vitest run`); generators/assertions via fast-check.
 * Each property is one test, run with at least 100 fast-check iterations.
 *
 * ── Approach notes ──────────────────────────────────────────────────────────
 *
 * AUTH_SECRET module-load issue (P7, P9):
 *   Importing `@/lib/auth` (src/lib/auth/index.ts) has two eager side effects at
 *   module-evaluation time:
 *     1. `getAuthSecret(process.env.AUTH_SECRET)` — THROWS if the secret is
 *        missing or < 32 chars.
 *     2. `NextAuth(...)` and `buildProviders(process.env)` run at load.
 *   To import it safely we set a valid `AUTH_SECRET` (>= 32 chars) via
 *   `vi.stubEnv` in `beforeAll` BEFORE the import, and we import the module
 *   *dynamically* inside the tests (after env is set) rather than with a
 *   top-level static import. `enabledProviderNames`/`buildProviders` are pure
 *   functions that take an explicit `env` map, so once the module is imported
 *   we can call them with any crafted env without touching `process.env`.
 *
 * Prisma mock (P7):
 *   `@/lib/db` is mocked with `vi.mock` so importing `@/lib/auth` does not spin
 *   up a real PrismaClient or require DATABASE_URL. The mock exposes a
 *   controllable `prisma.user.findUnique` and a passthrough `getDatabaseUrl`.
 *   P7 drives `findUnique` to return crafted users (with real bcrypt hashes,
 *   null hash, or no user) and asserts the Credentials `authorize` result.
 */
import { describe, it, expect, beforeAll, vi } from "vitest";
import fc from "fast-check";
import { decodeJwt } from "jose";

// ── Prisma mock (used by P7 and required so importing @/lib/auth is safe) ─────
// Only the real `PrismaClient` is replaced with a controllable stub; the pure
// `getDatabaseUrl` guard keeps its real implementation (tested by P5) via
// importActual so it still throws for absent/empty DATABASE_URL.
const findUniqueMock = vi.fn();
vi.mock("@/lib/db", async () => {
  const actual = await vi.importActual<typeof import("@/lib/db")>("@/lib/db");
  return {
    getDatabaseUrl: actual.getDatabaseUrl,
    prisma: {
      user: {
        findUnique: (...args: unknown[]) => findUniqueMock(...args),
        update: vi.fn(),
      },
    },
  };
});

const VALID_SECRET = "x".repeat(48); // >= 32 chars

beforeAll(() => {
  // Must be set before any dynamic import of @/lib/auth (module-load guard).
  vi.stubEnv("AUTH_SECRET", VALID_SECRET);
});

const RUNS = { numRuns: 100 } as const;

// Static imports of side-effect-free modules are safe.
import {
  createSessionToken,
  verifySessionToken,
  getAuthSecret,
  type SessionPayload,
} from "@/lib/auth/session";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { getDatabaseUrl } from "@/lib/db";
import { registerSchema } from "@/lib/validation";

// ── Generators ────────────────────────────────────────────────────────────
const payloadArb: fc.Arbitrary<SessionPayload> = fc.record({
  userId: fc.string({ minLength: 1, maxLength: 40 }),
  email: fc.emailAddress(),
  role: fc.constantFrom("USER", "ADMIN") as fc.Arbitrary<"USER" | "ADMIN">,
  name: fc.string({ maxLength: 60 }),
});

describe("free-auth-and-database property tests", () => {
  it("Feature: free-auth-and-database, Property 1: Session payload round-trip — verifying the token for a payload returns the same id, email, name, role", async () => {
    await fc.assert(
      fc.asyncProperty(payloadArb, async (p) => {
        const token = await createSessionToken(p);
        const decoded = await verifySessionToken(token);
        expect(decoded).not.toBeNull();
        expect(decoded!.userId).toBe(p.userId);
        expect(decoded!.email).toBe(p.email);
        expect(decoded!.role).toBe(p.role);
        expect(decoded!.name).toBe(p.name);
      }),
      RUNS,
    );
  });

  it("Feature: free-auth-and-database, Property 2: Session lifetime is bounded to 7 days — exp − iat ≤ 604800", async () => {
    await fc.assert(
      fc.asyncProperty(payloadArb, async (p) => {
        const token = await createSessionToken(p);
        const claims = decodeJwt(token);
        expect(typeof claims.exp).toBe("number");
        expect(typeof claims.iat).toBe("number");
        expect(claims.exp! - claims.iat!).toBeLessThanOrEqual(604800);
      }),
      RUNS,
    );
  });

  it("Feature: free-auth-and-database, Property 3: Sign-out invalidates the session — an empty/garbage token verifies to null", async () => {
    // A cleared session cookie carries an empty value; garbage tokens must also
    // fail to verify. Model sign-out at the token layer: verify returns null.
    const garbageArb = fc.oneof(
      fc.constant(""),
      fc.string({ maxLength: 30 }),
      fc.string().map((s) => `header.${s}.sig`),
    );
    await fc.assert(
      fc.asyncProperty(garbageArb, async (bad) => {
        const decoded = await verifySessionToken(bad);
        expect(decoded).toBeNull();
      }),
      RUNS,
    );
  });

  it("Feature: free-auth-and-database, Property 4: AUTH_SECRET guard rejects weak secrets — throws iff missing or shorter than 32 chars, else returns it", () => {
    const secretArb = fc.oneof(
      fc.constant(undefined),
      fc.string({ maxLength: 200 }),
    );
    fc.assert(
      fc.property(secretArb, (secret) => {
        const weak = secret === undefined || secret.length < 32;
        if (weak) {
          expect(() => getAuthSecret(secret)).toThrow();
        } else {
          expect(getAuthSecret(secret)).toBe(secret);
        }
      }),
      RUNS,
    );
  });

  it("Feature: free-auth-and-database, Property 5: DATABASE_URL startup guard — throws naming DATABASE_URL iff absent or empty", () => {
    const urlArb = fc.oneof(
      fc.constant(undefined),
      fc.constant(""),
      fc.string({ minLength: 1, maxLength: 120 }),
    );
    fc.assert(
      fc.property(urlArb, (url) => {
        const env = { ...(url === undefined ? {} : { DATABASE_URL: url }) } as NodeJS.ProcessEnv;
        const missing = url === undefined || url.length === 0;
        if (missing) {
          expect(() => getDatabaseUrl(env)).toThrow(/DATABASE_URL/);
        } else {
          expect(getDatabaseUrl(env)).toBe(url);
        }
      }),
      RUNS,
    );
  });

  it("Feature: free-auth-and-database, Property 6: Password hashing round-trip, never plaintext — verify succeeds against own hash; hash ≠ plaintext", async () => {
    // bcrypt caps the effective input at 72 bytes; keep inputs short so the
    // 100 iterations stay fast while still exercising varied passwords.
    const pwArb = fc.string({ minLength: 1, maxLength: 40 });
    await fc.assert(
      fc.asyncProperty(pwArb, async (pw) => {
        const hash = await hashPassword(pw);
        expect(hash).not.toBe(pw);
        expect(await verifyPassword(pw, hash)).toBe(true);
      }),
      RUNS,
    );
  }, 60_000);

  it("Feature: free-auth-and-database, Property 7: Credentials authorization matches iff password is correct — returns the user iff verifyPassword true, else null", async () => {
    // Import after AUTH_SECRET is stubbed and @/lib/db is mocked.
    const { buildProviders } = await import("@/lib/auth");
    const providers = buildProviders({} as NodeJS.ProcessEnv);
    // The Credentials provider is always first.
    const credentials = providers[0] as unknown as {
      authorize: (raw: Record<string, unknown>) => Promise<unknown>;
    };

    const scenarioArb = fc.record({
      email: fc.emailAddress(),
      correctPw: fc.string({ minLength: 1, maxLength: 30 }),
      attemptPw: fc.string({ minLength: 1, maxLength: 30 }),
      // "user"=normal account, "oauth"=null passwordHash, "none"=no user row.
      kind: fc.constantFrom("user", "oauth", "none"),
    });

    await fc.assert(
      fc.asyncProperty(scenarioArb, async ({ email, correctPw, attemptPw, kind }) => {
        findUniqueMock.mockReset();
        let expected: unknown = null;

        if (kind === "none") {
          findUniqueMock.mockResolvedValue(null);
        } else if (kind === "oauth") {
          findUniqueMock.mockResolvedValue({
            id: "u1",
            email,
            name: "OAuth User",
            role: "USER",
            passwordHash: null,
          });
        } else {
          const passwordHash = await hashPassword(correctPw);
          findUniqueMock.mockResolvedValue({
            id: "u1",
            email,
            name: "Real User",
            role: "USER",
            passwordHash,
          });
          if (await verifyPassword(attemptPw, passwordHash)) {
            expected = { id: "u1", email, name: "Real User", role: "USER" };
          }
        }

        const result = await credentials.authorize({ email, password: attemptPw });
        expect(result).toEqual(expected);
      }),
      RUNS,
    );
  }, 120_000);

  it("Feature: free-auth-and-database, Property 8: Registration validation accepts exactly the valid inputs — accepts iff name 1–80, valid email, password 8–200", () => {
    // Mix of clearly-valid and boundary/invalid fields to exercise both sides.
    const nameArb = fc.oneof(
      fc.string({ minLength: 1, maxLength: 80 }).filter((s) => s.length >= 1),
      fc.constant(""),
      fc.string({ minLength: 81, maxLength: 90 }),
    );
    const emailArb = fc.oneof(
      fc.emailAddress(),
      fc.string({ maxLength: 20 }), // usually not a valid email
    );
    const pwArb = fc.oneof(
      fc.string({ minLength: 8, maxLength: 200 }),
      fc.string({ maxLength: 7 }),
      fc.string({ minLength: 201, maxLength: 210 }),
    );

    fc.assert(
      fc.property(nameArb, emailArb, pwArb, (name, email, password) => {
        const result = registerSchema.safeParse({ name, email, password });
        // Recompute the oracle from the schema's own rules.
        const emailValid = z_emailValid(email);
        const expected =
          name.length >= 1 &&
          name.length <= 80 &&
          emailValid &&
          password.length >= 8 &&
          password.length <= 200;
        expect(result.success).toBe(expected);
      }),
      RUNS,
    );
  });

  it("Feature: free-auth-and-database, Property 9: Provider-conditional registration — Google iff both google keys set, GitHub iff both github keys set, Credentials always", async () => {
    const { buildProviders, enabledProviderNames } = await import("@/lib/auth");

    const maybeVal = fc.oneof(fc.constant(undefined), fc.constant(""), fc.string({ minLength: 1, maxLength: 12 }));
    const envArb = fc.record({
      GOOGLE_CLIENT_ID: maybeVal,
      GOOGLE_CLIENT_SECRET: maybeVal,
      GITHUB_CLIENT_ID: maybeVal,
      GITHUB_CLIENT_SECRET: maybeVal,
    });

    fc.assert(
      fc.property(envArb, (raw) => {
        const env = raw as unknown as NodeJS.ProcessEnv;
        const googleOn = Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);
        const githubOn = Boolean(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET);

        const names = enabledProviderNames(env);
        expect(names).toContain("credentials");
        expect(names.includes("google")).toBe(googleOn);
        expect(names.includes("github")).toBe(githubOn);

        const providers = buildProviders(env);
        const expectedLen = 1 + (googleOn ? 1 : 0) + (githubOn ? 1 : 0);
        expect(providers.length).toBe(expectedLen);
      }),
      RUNS,
    );
  }, 60_000);
});

/** Mirror of zod's email validity for the P8 oracle (avoids re-implementing). */
function z_emailValid(email: string): boolean {
  return registerSchema.shape.email.safeParse(email).success;
}
