# Implementation Plan: Free Auth and Database

## Overview

This plan converts the design into incremental, test-driven coding tasks. It is ordered to keep the build green: pre-existing Next.js 16 compile failures are fixed first so `tsc --noEmit`/`next build` pass before any migration work; then the test runner is stood up; then the data model, Auth.js core, route/middleware/UI wiring, dependencies, tests, and documentation follow. Each task references the design sections and requirement clauses it implements, and test-writing sub-tasks are grouped under the feature they exercise. The final task is an end-to-end verification gate (`typecheck` + `test` + `build`).

Property-based tests use `fast-check` (minimum 100 iterations each, one test per correctness property P1–P13), tagged `Feature: free-auth-and-database, Property {n}: {text}`. Prisma is mocked with an in-memory store for resolution/default-record properties. Example/unit and integration tests cover the external machinery per the design Testing Strategy.

## Tasks

- [x] 1. Root cause fixes — make the baseline compile (prerequisite gate)
  - [x] 1.1 Fix async `cookies()` in `src/lib/auth/session.ts`
    - `await cookies()` before `.set`/`.get` in `setSessionCookie`, `getSession`, and `clearSessionCookie`
    - Make `clearSessionCookie` `async` returning `Promise<void>`
    - Extract and export a testable `getAuthSecret(secret: string | undefined): string` guard that throws a descriptive error naming the variable and 32-char minimum when the secret is missing or shorter than 32 characters, otherwise returns it; use it in place of the current 16-char check
    - _Requirements: 5.8; Design: Root Cause Fixes → Fix 1, Components → getAuthSecret_
  - [x] 1.2 Update `src/app/api/auth/logout/route.ts` to `await clearSessionCookie()`
    - Await the now-async cookie clear during the transition to Auth.js `signOut`
    - _Requirements: 5.6; Design: Root Cause Fixes → Fix 1_
  - [x] 1.3 Fix async route `params` in `src/app/api/mistakes/[id]/route.ts`
    - Type the handler's second argument as `{ params: Promise<{ id: string }> }`
    - `await` params before reading `id`; use `id` in the Prisma `where` clauses
    - _Requirements: n/a (baseline compile); Design: Root Cause Fixes → Fix 2_
  - [x] 1.4 Verify baseline compiles
    - Run `npm run typecheck` and resolve any remaining type errors introduced by fixes 1.1–1.3
    - _Requirements: 5.8; Design: Root Cause Fixes, Testing Strategy → Typecheck gate_

- [x] 2. Set up the test infrastructure
  - [x] 2.1 Add and configure Vitest with fast-check
    - Add `vitest`, `@vitest/coverage-v8`, and `fast-check` as devDependencies
    - Add a `"test": "vitest run"` script (run-once, not watch mode)
    - Add a `vitest.config.ts` (Node environment, TypeScript/ESM, `@` path alias matching `tsconfig`)
    - _Requirements: n/a (tooling); Design: Testing Strategy_

- [x] 3. Extend the Prisma data model
  - [x] 3.1 Update `prisma/schema.prisma` for Auth.js
    - Make `User.passwordHash` optional (`String?`); add `emailVerified DateTime?` and `image String?`; add `accounts Account[]` relation
    - Add `Account` model with `@@unique([provider, providerAccountId])`, `@@index([userId])`, and cascade delete on `user`
    - Add `VerificationToken` model with `@@unique([identifier, token])`
    - Do NOT add a `Session` model (JWT strategy — session lives in the signed cookie)
    - _Requirements: 4.1, 4.2, 4.4, 4.5, 6.5; Design: Data Models_
  - [x] 3.2 Generate client and create the migration
    - Run `prisma generate`; create the additive migration (`prisma migrate dev`) making `passwordHash` nullable and adding `Account`/`VerificationToken`
    - _Requirements: 4.1, 4.2, 6.5; Design: Data Models → Migration_

- [x] 4. Implement Auth.js core configuration
  - [x] 4.1 Add `next-auth` (v5 beta) and `@auth/prisma-adapter` dependencies
    - Add both to `dependencies` in `package.json` (pinned versions)
    - _Requirements: 1.1, 2.1, 4.2; Design: Overview, Components_
  - [x] 4.2 Create `src/lib/auth/index.ts` with providers and NextAuth config
    - Export pure `buildProviders(env)` that always includes `Credentials` (authorize parses via `loginSchema`, looks up user via Prisma, rejects null `passwordHash`, verifies via existing `verifyPassword`, returns `{ id, email, name, role }`), conditionally includes `Google` iff both `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` are set, and `GitHub` iff both `GITHUB_CLIENT_ID`/`GITHUB_CLIENT_SECRET` are set
    - Configure `NextAuth` with `PrismaAdapter(prisma)`, `session { strategy: "jwt", maxAge: 604800 }`, `secret: getAuthSecret(process.env.AUTH_SECRET)`, `pages { signIn: "/login", error: "/login" }`, and cookie `sessionToken` named `speakmate_session` with `httpOnly`, `sameSite: "lax"`, `path: "/"`, `secure` in production
    - Export `handlers`, `auth`, `signIn`, `signOut`
    - _Requirements: 1.1, 1.5, 2.1, 2.6, 3.1, 3.2, 5.1, 5.2, 5.3, 5.4, 5.8, 8.2, 8.3; Design: Components → src/lib/auth/index.ts_
  - [x] 4.3 Implement callbacks and events
    - `signIn` callback: for `provider === "github"`, reject unless the profile carries a verified email
    - `jwt` callback: on first sign-in copy `id`, `email`, `name`, `role` into the token
    - `session` callback: map those token fields onto `session.user`
    - `createUser` event: create default `Profile`, `UserSettings`, and `DailyStreak` for the new user (mirror the register route's nested create)
    - _Requirements: 2.5, 4.6, 5.7; Design: Callbacks and events_
  - [x] 4.4 Add the `DATABASE_URL` startup guard
    - Add a testable guard (invoked where the Prisma client / auth config initializes) that throws a descriptive error naming `DATABASE_URL` iff it is absent or empty
    - _Requirements: 6.4; Design: Error Handling, Components → getAuthSecret/DATABASE_URL guard_

- [x] 5. Wire routes, middleware, and UI to Auth.js
  - [x] 5.1 Add the Auth.js catch-all route `src/app/api/auth/[...nextauth]/route.ts`
    - Export `runtime = "nodejs"` and `{ GET, POST } = handlers` from `@/lib/auth`
    - _Requirements: 1.1, 2.1, 3.1; Design: Components → route.ts_
  - [x] 5.2 Update `src/middleware.ts` to use Auth.js
    - Replace `verifySessionToken(cookie)` with `auth()`/`getToken` to read the session on the Edge
    - Preserve `PROTECTED_PREFIXES`, `ADMIN_PREFIXES`, `AUTH_PAGES`, the `matcher` config, and the `role === "ADMIN"` admin gate verbatim
    - _Requirements: 5.7; Design: Components → src/middleware.ts_
  - [x] 5.3 Update `src/lib/auth/require.ts` to use `auth()`
    - `requireUser()` calls `auth()`, returns the normalized session, and throws the same `{ status: 401 }` shape; keep the signature compatible so API routes need no changes
    - _Requirements: 5.7; Design: Components → src/lib/auth/require.ts_
  - [x] 5.4 Update `src/components/AuthForm.tsx` and the login page for provider-aware UI
    - Submit email/password via `signIn("credentials", { redirect: false, … })`, surfacing the returned error in the existing `role="alert"` region
    - Render Google/GitHub buttons only for providers in an enabled-provider prop; the login page derives enabled names from `buildProviders` and maps OAuth `error` query params to descriptive messages
    - _Requirements: 3.1, 8.1, 8.2, 8.3, 8.4, 1.4, 2.4; Design: Components → AuthForm, Error Handling_
  - [x] 5.5 Update the register and logout routes to use Auth.js sessions
    - `register`: retain account creation (hash + user + default records) but issue the session via `signIn("credentials")` instead of `setSessionCookie`
    - `logout`: call Auth.js `signOut` to invalidate the session
    - _Requirements: 3.4, 5.6; Design: Components → Legacy credential routes_

- [ ] 6. Property-based tests for pure auth logic
  - [ ]* 6.1 Write property test for session payload round-trip
    - **Property 1: Session payload round-trip** — verifying the token for a payload returns the same `id`, `email`, `name`, `role`
    - **Validates: Requirements 5.7**
  - [ ]* 6.2 Write property test for session lifetime bound
    - **Property 2: Session lifetime is bounded to 7 days** — `exp − iat ≤ 604800`
    - **Validates: Requirements 5.4**
  - [ ]* 6.3 Write property test for sign-out invalidation
    - **Property 3: Sign-out invalidates the session** — after sign-out the session read returns null
    - **Validates: Requirements 5.6**
  - [ ]* 6.4 Write property test for the AUTH_SECRET guard
    - **Property 4: AUTH_SECRET guard rejects weak secrets** — throws iff missing or shorter than 32 chars, else returns it
    - **Validates: Requirements 5.8**
  - [ ]* 6.5 Write property test for the DATABASE_URL guard
    - **Property 5: DATABASE_URL startup guard** — throws naming `DATABASE_URL` iff absent or empty
    - **Validates: Requirements 6.4**
  - [ ]* 6.6 Write property test for password hashing round-trip
    - **Property 6: Password hashing round-trip, never plaintext** — verify succeeds against own hash; hash ≠ plaintext
    - **Validates: Requirements 3.4**
  - [ ]* 6.7 Write property test for credentials authorization
    - **Property 7: Credentials authorization matches iff password is correct** — returns user iff `verifyPassword` true, else no user/no session (Prisma mocked)
    - **Validates: Requirements 3.2, 3.3**
  - [ ]* 6.8 Write property test for registration validation
    - **Property 8: Registration validation accepts exactly the valid inputs** — accepts iff email well-formed and password length 8–200
    - **Validates: Requirements 3.5**
  - [ ]* 6.9 Write property test for provider-conditional registration
    - **Property 9: Provider-conditional registration** — Google iff both Google keys set, GitHub iff both GitHub keys set, Credentials always
    - **Validates: Requirements 1.5, 2.6, 8.2, 8.3**
  - [ ]* 6.10 Write property test for OAuth resolution
    - **Property 10: OAuth resolution maps a profile to exactly one user** — new passwordless user when none exists for the email, else the existing user (Prisma mocked, in-memory store)
    - **Validates: Requirements 1.2, 1.3, 2.2, 2.3, 4.1**
  - [ ]* 6.11 Write property test for account-integrity invariant
    - **Property 11: Account-integrity invariant over sign-in sequences** — email→≤1 user, `(provider, providerAccountId)`→≤1 user, each success leaves a linked account, matching email attaches to existing user (mocked store, sequences)
    - **Validates: Requirements 4.2, 4.3, 4.4, 4.5**
  - [ ]* 6.12 Write property test for the GitHub verified-email guard
    - **Property 12: GitHub sign-in requires a verified email** — permitted iff verified email present, else rejected with no session
    - **Validates: Requirements 2.5**
  - [ ]* 6.13 Write property test for default-record provisioning
    - **Property 13: User creation provisions default records** — `Profile` and `UserSettings` created for any newly created user (mocked store)
    - **Validates: Requirements 4.6**

- [x] 7. Checkpoint — ensure all property tests and typecheck pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 8. Example, unit, and integration tests for external machinery
  - [ ]* 8.1 Write unit tests for cookie attributes
    - Assert `httpOnly`, `sameSite: "lax"`, `path: "/"`, and `secure` toggled by `NODE_ENV`
    - _Requirements: 5.1, 5.2, 5.3; Design: Testing Strategy_
  - [ ]* 8.2 Write unit tests for login-page provider buttons and OAuth error UI
    - Render the email/password form; render exactly the OAuth buttons for a given enabled-provider set; map OAuth `error` query params to descriptive messages
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 1.4, 2.4; Design: Testing Strategy_
  - [ ]* 8.3 Write unit test for `.env.example` completeness
    - Assert each new key (`AUTH_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`) is present with an explanatory comment, alongside `AUTH_SECRET` and `DATABASE_URL`
    - _Requirements: 7.7; Design: Testing Strategy_
  - [ ]* 8.4 Write integration tests for credentials login/register paths
    - Exercise happy and error paths through the route handlers
    - _Requirements: 3.2, 3.3, 3.4; Design: Testing Strategy_
  - [ ]* 8.5 Write integration test for Prisma adapter persistence
    - Assert the adapter creates a `User` + linked `Account`
    - _Requirements: 4.2, 6.5; Design: Testing Strategy_
  - [ ]* 8.6 Write integration test for OAuth state parameter
    - Assert the `state` parameter is present on the authorize redirect
    - _Requirements: 5.5; Design: Testing Strategy_

- [x] 9. Setup documentation
  - [x] 9.1 Extend `.env.example` with commented placeholders
    - Add commented placeholders for `AUTH_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`; keep existing `AUTH_SECRET` and `DATABASE_URL`; no real secrets
    - _Requirements: 7.1, 7.6, 7.7; Design: Configuration & Environment Variables_
  - [x] 9.2 Add a "Free auth & database setup" section to `README.md`
    - List every required env var; include credential links (Google `https://console.cloud.google.com/apis/credentials`, GitHub `https://github.com/settings/developers`, Neon `https://neon.tech`, Supabase `https://supabase.com`, Vercel Postgres `https://vercel.com/docs/storage/vercel-postgres`)
    - State the callback URL pattern `{AUTH_URL}/api/auth/callback/{provider}` for local and production, and TLS/`sslmode=require` notes for managed providers; no real secrets
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 6.3; Design: Configuration & Environment Variables_

- [x] 10. Final verification and build gate
  - Run `npm run typecheck`, `npm run test`, and `npm run build` (`prisma generate && next build`); all must pass
  - Fix any failures uncovered here, then clean up any temporary files created during verification
  - _Requirements: all; Design: Testing Strategy → Typecheck / build gate_

## Notes

- Tasks marked with `*` are optional test sub-tasks and can be skipped for a faster MVP; core implementation tasks are never optional.
- Each task references specific requirement clauses and design sections for traceability.
- Root cause fixes (Task 1) come first so the baseline compiles before the migration; the final gate (Task 10) re-verifies typecheck, tests, and build together.
- Property tests validate universal correctness properties (P1–P13, one test each, min 100 iterations, tagged per the design); example/unit and integration tests cover cookies, UI, `.env.example`, routes, adapter persistence, and OAuth state.
- Prisma is mocked with an in-memory store for resolution/default-record property tests (P10, P11, P13).

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.3", "2.1"] },
    { "id": 1, "tasks": ["1.2", "3.1"] },
    { "id": 2, "tasks": ["1.4", "3.2", "4.1"] },
    { "id": 3, "tasks": ["4.2", "4.4"] },
    { "id": 4, "tasks": ["4.3", "5.1", "5.3"] },
    { "id": 5, "tasks": ["5.2", "5.4", "5.5"] },
    { "id": 6, "tasks": ["6.1", "6.2", "6.3", "6.4", "6.5", "6.6", "6.7", "6.8", "6.9", "6.10", "6.11", "6.12", "6.13"] },
    { "id": 7, "tasks": ["8.1", "8.2", "8.3", "8.4", "8.5", "8.6", "9.1", "9.2"] }
  ]
}
```
