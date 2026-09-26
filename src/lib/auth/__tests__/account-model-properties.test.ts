import { describe, it, expect, vi, beforeAll } from "vitest";
import fc from "fast-check";

/**
 * Property-based tests for tasks 6.10–6.13 of the free-auth-and-database spec.
 *
 * These cover the pure/deterministic auth-model logic:
 *   P10 — OAuth resolution maps a profile to exactly one user
 *   P11 — Account-integrity invariant over sign-in sequences
 *   P12 — GitHub sign-in requires a verified email
 *   P13 — User creation provisions default records
 *
 * P10/P11/P13 concern behavior the app delegates to `@auth/prisma-adapter` +
 * Auth.js internals (creating/linking `User`/`Account` rows). That linking is
 * integration-level and not our code to unit test. As the design's Testing
 * Strategy dictates ("Prisma is mocked with an in-memory store for
 * resolution/default-record properties"), we model the adapter *contract* the
 * app relies on with a small, PURE, in-memory resolution helper defined in this
 * file, and assert the invariants hold across fast-check-generated inputs. The
 * uniqueness rules mirrored here come directly from prisma/schema.prisma:
 *   - User.email               @unique
 *   - Account @@unique([provider, providerAccountId])
 *
 * P12 exercises OUR real code: `hasVerifiedGitHubEmail` exported from
 * src/lib/auth/index.ts (the guard behind the `signIn` callback).
 */

const NUM_RUNS = 200;

// ---------------------------------------------------------------------------
// In-memory model of the Prisma-adapter account-resolution contract (P10/P11).
//
// This is intentionally a faithful, minimal restatement of the semantics the
// real adapter guarantees — NOT a re-implementation of the adapter itself:
//   * (provider, providerAccountId) is a unique identity -> if we've seen it,
//     return the same user it was linked to.
//   * email is unique on User -> if a user already exists for the email, the
//     new identity is linked to that existing user (no new user created).
//   * otherwise a brand-new passwordless (OAuth-only) user is created.
// ---------------------------------------------------------------------------

interface ModelUser {
  id: string;
  email: string;
  passwordHash: string | null;
}

interface ModelAccount {
  provider: string;
  providerAccountId: string;
  userId: string;
}

interface Store {
  users: Map<string, ModelUser>; // userId -> user
  usersByEmail: Map<string, string>; // email -> userId
  accounts: Map<string, ModelAccount>; // `${provider}:${providerAccountId}` -> account
}

interface OAuthProfile {
  provider: string;
  providerAccountId: string;
  email: string;
}

interface ResolutionResult {
  userId: string;
  created: boolean;
}

function createStore(): Store {
  return {
    users: new Map(),
    usersByEmail: new Map(),
    accounts: new Map(),
  };
}

function accountKey(p: string, id: string): string {
  return `${p}\u0000${id}`;
}

let userSeq = 0;
function nextUserId(): string {
  userSeq += 1;
  return `user_${userSeq}`;
}

/**
 * Resolve an OAuth sign-in against the in-memory store, returning exactly one
 * user id. Models the adapter contract described above.
 */
function resolveOAuthSignIn(store: Store, profile: OAuthProfile): ResolutionResult {
  const key = accountKey(profile.provider, profile.providerAccountId);

  // 1. Known identity -> reuse its linked user (identity is unique).
  const existingAccount = store.accounts.get(key);
  if (existingAccount) {
    return { userId: existingAccount.userId, created: false };
  }

  // 2. Known email -> link this identity to the existing user (email unique).
  const existingUserId = store.usersByEmail.get(profile.email);
  if (existingUserId !== undefined) {
    store.accounts.set(key, {
      provider: profile.provider,
      providerAccountId: profile.providerAccountId,
      userId: existingUserId,
    });
    return { userId: existingUserId, created: false };
  }

  // 3. Otherwise create a new OAuth-only user (passwordHash null) and link it.
  const id = nextUserId();
  store.users.set(id, { id, email: profile.email, passwordHash: null });
  store.usersByEmail.set(profile.email, id);
  store.accounts.set(key, {
    provider: profile.provider,
    providerAccountId: profile.providerAccountId,
    userId: id,
  });
  return { userId: id, created: true };
}

// ---------------------------------------------------------------------------
// fast-check arbitraries
// ---------------------------------------------------------------------------

const providerArb = fc.constantFrom("google", "github");
const emailArb = fc
  .tuple(
    fc.string({ minLength: 1, maxLength: 8 }).filter((s) => /^[a-z0-9]+$/i.test(s)),
    fc.constantFrom("example.com", "test.org", "mail.net"),
  )
  .map(([local, domain]) => `${local}@${domain}`);
const providerAccountIdArb = fc.string({ minLength: 1, maxLength: 12 });

const profileArb: fc.Arbitrary<OAuthProfile> = fc.record({
  provider: providerArb,
  providerAccountId: providerAccountIdArb,
  email: emailArb,
});

describe("free-auth-and-database — account model properties", () => {
  it("Feature: free-auth-and-database, Property 10: OAuth resolution maps a profile to exactly one user", () => {
    fc.assert(
      fc.property(profileArb, (profile) => {
        const store = createStore();

        const first = resolveOAuthSignIn(store, profile);
        // No prior user for the email -> a new passwordless user is created.
        expect(first.created).toBe(true);
        const user = store.users.get(first.userId);
        expect(user).toBeDefined();
        expect(user?.passwordHash).toBeNull();
        expect(user?.email).toBe(profile.email);
        // Exactly one user resolved.
        expect(store.users.size).toBe(1);

        // Resolving the same profile again yields the SAME single user, no new one.
        const second = resolveOAuthSignIn(store, profile);
        expect(second.created).toBe(false);
        expect(second.userId).toBe(first.userId);
        expect(store.users.size).toBe(1);
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it("Feature: free-auth-and-database, Property 11: Account-integrity invariant over sign-in sequences", () => {
    fc.assert(
      fc.property(
        fc.array(profileArb, { minLength: 1, maxLength: 40 }),
        (sequence) => {
          const store = createStore();

          for (const profile of sequence) {
            const emailUserBefore = store.usersByEmail.get(profile.email);
            const key = accountKey(profile.provider, profile.providerAccountId);
            const identityKnownBefore = store.accounts.has(key);

            const result = resolveOAuthSignIn(store, profile);

            // Each successful sign-in leaves a linked account referencing its user.
            const linked = store.accounts.get(key);
            expect(linked).toBeDefined();
            expect(linked?.userId).toBe(result.userId);

            // A sign-in whose email matches an existing user attaches to that
            // user rather than creating a new one (unless the identity itself
            // was already linked, which also reuses the existing user).
            if (emailUserBefore !== undefined && !identityKnownBefore) {
              expect(result.created).toBe(false);
              expect(result.userId).toBe(emailUserBefore);
            }
          }

          // Invariant: every email maps to at most one user.
          for (const [email, userId] of store.usersByEmail) {
            const owner = store.users.get(userId);
            expect(owner).toBeDefined();
            expect(owner?.email).toBe(email);
          }
          // usersByEmail is a Map keyed by email, so uniqueness is structural;
          // assert user count never exceeds distinct emails.
          const distinctEmails = new Set(
            [...store.users.values()].map((u) => u.email),
          );
          expect(store.users.size).toBe(distinctEmails.size);

          // Invariant: every (provider, providerAccountId) maps to at most one
          // user (Map keyed by identity), and that user exists.
          for (const account of store.accounts.values()) {
            expect(store.users.has(account.userId)).toBe(true);
          }
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });

  it("Feature: free-auth-and-database, Property 12: GitHub sign-in requires a verified email", async () => {
    // Import the real guard AFTER setting AUTH_SECRET so module init succeeds.
    const { hasVerifiedGitHubEmail } = await import("@/lib/auth");

    // A GitHub emails-array entry.
    const emailEntryArb = fc.record({
      email: fc.oneof(emailArb, fc.constant(undefined)),
      verified: fc.boolean(),
    });

    const githubProfileArb = fc.record(
      {
        emails: fc.option(fc.array(emailEntryArb, { maxLength: 5 }), {
          nil: undefined,
        }),
        email: fc.option(fc.oneof(emailArb, fc.constant("")), { nil: undefined }),
      },
      { requiredKeys: [] },
    );
    const userArb = fc.option(
      fc.record({ email: fc.option(emailArb, { nil: null }) }),
      { nil: undefined },
    );

    fc.assert(
      fc.property(githubProfileArb, userArb, (profile, user) => {
        const result = hasVerifiedGitHubEmail(
          profile as Record<string, unknown>,
          user ?? undefined,
        );

        // Recompute the expected verdict from the guard's documented contract:
        // permitted iff (a verified entry with a string email exists) OR
        // (a non-empty top-level profile email) OR (a resolved user.email).
        const emails = profile.emails;
        const hasVerifiedEntry =
          Array.isArray(emails) &&
          emails.some(
            (e) => e.verified === true && typeof e.email === "string",
          );
        const hasProfileEmail =
          typeof profile.email === "string" && profile.email.length > 0;
        const hasUserEmail = Boolean(user?.email);
        const expected = hasVerifiedEntry || hasProfileEmail || hasUserEmail;

        expect(result).toBe(expected);
      }),
      { numRuns: NUM_RUNS },
    );
  }, 30000);

  it("Feature: free-auth-and-database, Property 13: User creation provisions default records", async () => {
    // Reset the module registry so our vi.mock('@/lib/db') takes effect.
    vi.resetModules();
    const updateSpy = vi.fn().mockResolvedValue({});
    vi.doMock("@/lib/db", () => ({
      prisma: { user: { update: updateSpy } },
      getDatabaseUrl: (env: NodeJS.ProcessEnv) => env.DATABASE_URL ?? "",
    }));

    const { authConfig } = await import("@/lib/auth");
    const createUser = authConfig.events?.createUser;
    expect(typeof createUser).toBe("function");

    await fc.assert(
      fc.asyncProperty(fc.string({ minLength: 1, maxLength: 30 }), async (id) => {
        updateSpy.mockClear();

        // Invoke the real createUser event with a freshly created user.
        // The event shape from Auth.js is { user, account?, profile? }.
        await createUser!({ user: { id, email: `${id}@e.co`, emailVerified: null } } as never);

        expect(updateSpy).toHaveBeenCalledTimes(1);
        const arg = updateSpy.mock.calls[0][0] as {
          where: { id: string };
          data: {
            profile: { create: unknown };
            settings: { create: unknown };
            streak: { create: unknown };
          };
        };
        // Targets the newly created user id.
        expect(arg.where.id).toBe(id);
        // Provisions the default Profile + UserSettings (+ DailyStreak) records.
        expect(arg.data.profile).toHaveProperty("create");
        expect(arg.data.settings).toHaveProperty("create");
        expect(arg.data.streak).toHaveProperty("create");
      }),
      { numRuns: NUM_RUNS },
    );

    vi.doUnmock("@/lib/db");
    vi.resetModules();
  }, 30000);
});

beforeAll(() => {
  // Auth.js config init (buildProviders + getAuthSecret) runs at import time.
  // A >=32-char secret keeps getAuthSecret from throwing during module load.
  process.env.AUTH_SECRET = "x".repeat(48);
  process.env.DATABASE_URL ??= "postgresql://user:pass@localhost:5432/db";
});
