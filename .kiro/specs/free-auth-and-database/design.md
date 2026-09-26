# Design Document: Free Auth and Database

## Overview

SpeakMate AI today authenticates users with a single method — email/password — backed by a hand-rolled signed-JWT session cookie (`speakmate_session`) implemented in `src/lib/auth/session.ts` using `jose`, and a PostgreSQL database accessed through Prisma (`prisma/schema.prisma`, `src/lib/db.ts`). This design migrates authentication to **Auth.js (NextAuth v5)** with the **`@auth/prisma-adapter`**, adds **Google** and **GitHub** OAuth providers, and preserves the existing email/password flow as an Auth.js **Credentials** provider that keeps the current `bcryptjs` verification. It also standardizes support for free-tier PostgreSQL hosts (Neon, Supabase, Vercel Postgres, local) and delivers link-backed setup documentation (README + `.env.example`).

Two decisions anchor the design:

1. **Auth.js becomes the single source of truth for sessions**, replacing the bespoke `verifySessionToken`/`setSessionCookie` machinery. We keep a **JWT session strategy** so `src/middleware.ts` can authorize on the Edge from a cookie without a database round-trip — this preserves the current middleware model while satisfying Requirement 5. (Req 5.7, 6.5)
2. **Prisma + PostgreSQL stay.** We extend the schema with Auth.js-compatible `Account` and `VerificationToken` models and make `User.passwordHash` optional so OAuth-only accounts are valid. Because we use the JWT strategy, **no `Session` table is required** (noted explicitly below). (Req 4.1, 4.2, 6.5)

This design also fixes two pre-existing TypeScript compilation failures that block `tsc --noEmit` and `next build` on Next.js 16 (see [Root Cause Fixes](#root-cause-fixes)). These are prerequisites: the migration cannot be verified green until the baseline compiles.

Scope references the approved `requirements.md` (Requirements 1–8).

## Architecture

Auth.js is mounted at the App Router catch-all route `src/app/api/auth/[...nextauth]/route.ts`, which exports the `GET`/`POST` handlers produced by a central config module `src/lib/auth/index.ts`. That module composes providers, the Prisma adapter, JWT/session callbacks, and cookie options — and exports `auth`, `signIn`, `signOut`, and `handlers`. Middleware and server code call `auth()` instead of the hand-rolled `verifySessionToken`/`getSession`.

```mermaid
flowchart TD
    subgraph Client
        LoginUI["Login page (src/app/(auth)/login/page.tsx)<br/>AuthForm + OAuth buttons"]
    end

    subgraph EdgeMiddleware["Edge — src/middleware.ts"]
        MW["auth() session check<br/>PROTECTED/ADMIN/AUTH_PAGES"]
    end

    subgraph AuthCore["Auth.js core — src/lib/auth/index.ts"]
        Providers["buildProviders(env):<br/>Google? · GitHub? · Credentials"]
        Callbacks["callbacks: signIn / jwt / session<br/>events: createUser"]
        Cookies["cookie: httpOnly, secure(prod), sameSite=lax, 7d"]
    end

    subgraph Routes["src/app/api/auth/[...nextauth]/route.ts"]
        NA["handlers GET/POST<br/>/api/auth/*"]
    end

    subgraph Data["Prisma — prisma/schema.prisma"]
        DB[("PostgreSQL<br/>User · Account · VerificationToken<br/>Profile · UserSettings · DailyStreak")]
        Adapter["@auth/prisma-adapter"]
    end

    LoginUI -->|"credentials POST / OAuth redirect"| NA
    NA --> Providers
    Providers --> Callbacks
    Callbacks --> Adapter
    Adapter --> DB
    Callbacks --> Cookies
    Cookies -->|"speakmate_session (JWT)"| LoginUI
    LoginUI -->|"navigates to protected route"| MW
    MW -->|"auth() verifies JWT cookie"| AuthCore
    MW -->|"no session -> redirect /login"| LoginUI
```

Request flows:

- **Credentials sign-in (Req 3):** `AuthForm` calls `signIn("credentials", …)` which posts to `/api/auth/callback/credentials`. The Credentials `authorize` callback looks up the user via Prisma and calls the existing `verifyPassword` (`src/lib/auth/password.ts`). On success Auth.js issues the JWT cookie.
- **OAuth sign-in (Req 1, 2):** `AuthForm` OAuth buttons call `signIn("google"|"github")`. Auth.js runs the OAuth 2.0 authorization-code flow (state/PKCE provided by the library, Req 5.5), the `signIn` callback enforces the GitHub verified-email guard (Req 2.5), the Prisma adapter creates/links `Account` and `User` rows (Req 4.2–4.5), and the `createUser` event provisions default `Profile`/`UserSettings` (Req 4.6).
- **Authorization (Req 5.7):** `middleware.ts` calls `auth()` and reads `id`, `email`, `name`, `role` from the JWT to gate `PROTECTED_PREFIXES` and `ADMIN_PREFIXES`.

## Components and Interfaces

### `src/lib/auth/index.ts` (new — Auth.js configuration)

Central NextAuth v5 setup. Replaces the session-issuing role of `src/lib/auth/session.ts`.

```ts
import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import { loginSchema } from "@/lib/validation";

// Pure, testable provider selection (Req 1.5, 2.6, 8.2, 8.3).
export function buildProviders(env: NodeJS.ProcessEnv) {
  const providers = [
    Credentials({
      credentials: { email: {}, password: {} },
      authorize: async (raw) => {
        const { email, password } = loginSchema.parse(raw);
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user?.passwordHash) return null;              // OAuth-only account
        if (!(await verifyPassword(password, user.passwordHash))) return null;
        return { id: user.id, email: user.email, name: user.name, role: user.role };
      },
    }),
  ];
  if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) providers.push(Google);
  if (env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET) providers.push(GitHub);
  return providers;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 7 }, // 7 days (Req 5.4)
  secret: getAuthSecret(process.env.AUTH_SECRET),          // guard, Req 5.8
  providers: buildProviders(process.env),
  pages: { signIn: "/login", error: "/login" },            // Req 1.4, 2.4, 8.4
  cookies: {
    sessionToken: {
      name: "speakmate_session",
      options: { httpOnly: true, sameSite: "lax", path: "/",
                 secure: process.env.NODE_ENV === "production" }, // Req 5.1–5.3
    },
  },
  callbacks: { /* signIn, jwt, session — see below */ },
  events:    { /* createUser — see below */ },
});
```

Interfaces exposed:

- `buildProviders(env)` — pure function returning the active provider list. **This is the single source of truth for "which methods are available"** and drives both server-side registration and the login UI (Req 8.2/8.3). It is directly unit/property testable.
- `handlers.GET` / `handlers.POST` — mounted by the route file.
- `auth()` — session accessor used by middleware, `require.ts`, and server code.
- `signIn` / `signOut` — used by `AuthForm` and the logout route.
- `getAuthSecret(secret)` — the AUTH_SECRET guard (Req 5.8), extracted so it is testable in isolation.

### Callbacks and events

- **`signIn` callback (Req 2.5):** for `provider === "github"`, reject unless the profile carries a verified email (`profile.email` present and, where GitHub exposes it, verified). Returning `false`/redirect surfaces a descriptive error and prevents a session.
- **`jwt` callback (Req 5.7):** on first sign-in, copy `id`, `email`, `name`, `role` from the DB user into the token so authorization data lives in the cookie (no DB round-trip in middleware).
- **`session` callback:** map those token fields onto `session.user`.
- **`createUser` event (Req 4.6):** when the adapter creates a new `User` (OAuth or first-time), create the default `Profile` and `UserSettings` (and `DailyStreak`, matching today's register flow). This mirrors the nested `create` currently in `src/app/api/auth/register/route.ts`.

### `src/app/api/auth/[...nextauth]/route.ts` (new)

```ts
import { handlers } from "@/lib/auth";
export const runtime = "nodejs"; // bcryptjs + Prisma need Node, matches existing routes
export const { GET, POST } = handlers;
```

### `src/lib/auth/session.ts` (retained, reduced role)

Auth.js owns session issuance after migration. To keep `tsc` green on Next 16 immediately and to avoid breaking any residual imports, the three cookie functions are corrected to `await cookies()` (Root Cause Fix 1). Once all callers move to `auth()`/`signIn`/`signOut`, the custom issuance path is dead code and may be removed in the tasks phase; the `SessionPayload` shape (`userId`, `email`, `role`, `name`) informs the Auth.js token shape.

### `src/lib/auth/require.ts` (updated)

`requireUser()` calls `auth()` and returns the normalized session, throwing the same `{ status: 401 }` error shape that `src/lib/api.ts` already maps to a friendly 401. Signature stays `Promise<SessionPayload>`-compatible so API routes (`chat`, `mistakes`, `conversations`, etc.) need no changes.

### `src/middleware.ts` (updated)

Replace `verifySessionToken(cookie)` with Auth.js's `auth()` wrapper (or `getToken`) to read the session on the Edge. `PROTECTED_PREFIXES`, `ADMIN_PREFIXES`, `AUTH_PAGES`, and the `matcher` config are preserved verbatim — only the session-read mechanism changes. The admin gate still checks `session.user.role === "ADMIN"`.

### `src/components/AuthForm.tsx` and login page (updated)

`AuthForm` keeps its email/password form (Req 8.1) but submits via `signIn("credentials", { redirect: false, … })` instead of hand-rolled `fetch("/api/auth/login")`, surfacing the returned error on failure (Req 8.4). It renders Google/GitHub buttons **only for providers present in the enabled list** (Req 8.2/8.3); the login page passes the enabled-provider names (derived from `buildProviders`) as a prop so the client renders exactly the configured methods.

### Legacy credential routes

`src/app/api/auth/{login,register,logout}/route.ts`:
- `login` becomes redundant once `AuthForm` uses `signIn`; it can be removed or thinned in the tasks phase.
- `register` is retained for account creation (hashing + user + default records) but now issues the session via Auth.js `signIn("credentials")` rather than `setSessionCookie` (Req 3.4).
- `logout` calls Auth.js `signOut` (Req 5.6). Its current synchronous `clearSessionCookie()` call is corrected as part of Root Cause Fix 1 during the transition.

## Data Models

Changes to `prisma/schema.prisma`. Existing learning-domain models (`Profile`, `UserSettings`, `Conversation`, `UserMistake`, etc.) are unchanged.

**`User` — make `passwordHash` optional (Req 4.1):**

```prisma
model User {
  id            String    @id @default(cuid())
  email         String    @unique          // Req 4.4
  passwordHash  String?                     // was String; now optional for OAuth-only accounts
  name          String
  role          Role      @default(USER)
  emailVerified DateTime?                   // Auth.js convention
  image         String?                     // OAuth avatar
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  accounts      Account[]                   // Req 4.2
  profile       Profile?
  settings      UserSettings?
  conversations Conversation[]
  mistakes      UserMistake[]
  userVocabulary UserVocabulary[]
  progress      LessonProgress[]
  streak        DailyStreak?

  @@index([role])
}
```

**`Account` — Auth.js linked accounts (Req 4.2, 4.3, 4.5):**

```prisma
model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String?
  access_token      String?
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String?
  session_state     String?
  user              User    @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])   // Req 4.5: identity maps to one user
  @@index([userId])
}
```

**`VerificationToken` — Auth.js convention (adapter completeness):**

```prisma
model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime
  @@unique([identifier, token])
}
```

**No `Session` model.** Because the session strategy is **JWT**, Auth.js does not persist sessions in the database (Req 5 is satisfied by the signed cookie), so no `Session` table is added. This is a deliberate choice to preserve the Edge-middleware model with no DB round-trip.

Migration: making `passwordHash` nullable and adding tables is additive/backward-compatible for existing rows; created via `prisma migrate dev` (dev) / `prisma migrate deploy` (prod). `passwordHash` field names in `login`/`register` routes stay consistent with the schema.

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

These correctness properties are validated with property-based testing because the auth-model and session logic are pure/deterministic functions over large input spaces (session payloads, secrets, env maps, passwords, OAuth profiles, and sequences of sign-in resolutions). The OAuth transport, cookie transport, and Prisma persistence are exercised via integration/example tests (see Testing Strategy), not PBT, because they test external machinery rather than our logic.

### Property 1: Session payload round-trip

*For any* valid session payload (`id`, `email`, `name`, `role`), verifying the token produced for that payload returns the same `id`, `email`, `name`, and `role`.

**Validates: Requirements 5.7**

### Property 2: Session lifetime is bounded to 7 days

*For any* issued session token, the difference between its expiration and its issued-at time is at most 604800 seconds (7 days).

**Validates: Requirements 5.4**

### Property 3: Sign-out invalidates the session

*For any* established session, after sign-out the session cookie no longer verifies to a valid session (session read returns null).

**Validates: Requirements 5.6**

### Property 4: AUTH_SECRET guard rejects weak secrets

*For any* string value, the AUTH_SECRET guard throws a descriptive error if and only if the value is missing or shorter than 32 characters; otherwise it returns the secret.

**Validates: Requirements 5.8**

### Property 5: DATABASE_URL startup guard

*For any* environment map, the startup guard throws a descriptive error naming `DATABASE_URL` if and only if `DATABASE_URL` is absent or empty.

**Validates: Requirements 6.4**

### Property 6: Password hashing round-trip, never plaintext

*For any* valid password, verifying it against its own hash succeeds, and the stored hash is never equal to the plaintext password.

**Validates: Requirements 3.4**

### Property 7: Credentials authorization matches iff password is correct

*For any* password and any stored user with a password hash, the Credentials `authorize` step returns that user if and only if the password verifies against the stored hash; otherwise it returns no user and establishes no session.

**Validates: Requirements 3.2, 3.3**

### Property 8: Registration validation accepts exactly the valid inputs

*For any* registration input, the registration schema accepts it if and only if the email is well-formed and the password length is within the allowed bounds (8–200), preserving existing rules.

**Validates: Requirements 3.5**

### Property 9: Provider-conditional registration

*For any* environment map, `buildProviders` includes Google if and only if both `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are present and non-empty, includes GitHub if and only if both `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` are present and non-empty, and always includes Credentials.

**Validates: Requirements 1.5, 2.6, 8.2, 8.3**

### Property 10: OAuth resolution maps a profile to exactly one user

*For any* OAuth profile and any provider, resolving the sign-in yields exactly one user: a newly created user with no password hash when no account exists for the returned email, or the existing user when one exists for that email.

**Validates: Requirements 1.2, 1.3, 2.2, 2.3, 4.1**

### Property 11: Account-integrity invariant over sign-in sequences

*For any* sequence of OAuth sign-in resolutions, after processing: every email maps to at most one user, every `(provider, providerAccountId)` maps to at most one user, each successful OAuth sign-in leaves a persisted linked account referencing its user, and a signed-in identity whose email matches an existing user is attached to that existing user rather than creating a new one.

**Validates: Requirements 4.2, 4.3, 4.4, 4.5**

### Property 12: GitHub sign-in requires a verified email

*For any* GitHub profile, sign-in is permitted if and only if the profile carries a verified email; otherwise it is rejected with a descriptive error and no session is established.

**Validates: Requirements 2.5**

### Property 13: User creation provisions default records

*For any* newly created user (via Credentials or any OAuth provider), a default `Profile` and `UserSettings` record are created for that user.

**Validates: Requirements 4.6**

## Configuration & Environment Variables

All values live in an uncommitted `.env` (Req 7.6); `.env.example` carries commented placeholders only, with **no real secrets** (Req 7.6, 7.7). New/changed variables introduced by this feature:

| Variable | Purpose | Requirement |
|---|---|---|
| `AUTH_SECRET` | Signs the session JWT. **Must be ≥ 32 chars** or startup fails. | 5.8 |
| `AUTH_URL` / `NEXTAUTH_URL` | Canonical app URL used to build OAuth callback URLs. | 1.1, 2.1 |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google OAuth credentials; Google enabled only when both present. | 1.1, 1.5 |
| `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` | GitHub OAuth credentials; GitHub enabled only when both present. | 2.1, 2.6 |
| `DATABASE_URL` | PostgreSQL connection string; startup fails if missing. | 6.1, 6.4 |

**Credential links (Req 7.2–7.4):**

- Google OAuth client id/secret: <https://console.cloud.google.com/apis/credentials>
- GitHub OAuth application: <https://github.com/settings/developers>
- Neon (Postgres connection string): <https://neon.tech>
- Supabase (Postgres connection string): <https://supabase.com>
- Vercel Postgres: <https://vercel.com/docs/storage/vercel-postgres>

**Callback / redirect URLs (Req 7.5):** the pattern is `{AUTH_URL}/api/auth/callback/{provider}`.

- Local dev: `http://localhost:3000/api/auth/callback/google` and `.../callback/github`
- Production: `https://<your-domain>/api/auth/callback/google` and `.../callback/github`

These exact URLs must be registered in each provider's console.

**Database connection-string notes (Req 6.2, 6.3):** the app reads `DATABASE_URL` unchanged across providers. Managed providers require TLS — documentation states the required parameters:

- Neon / Supabase / Vercel Postgres: append `?sslmode=require` (Supabase pooled connections also use the `-pooler` host and port `6543`).
- Local: `?schema=public` with no TLS, e.g. `postgresql://postgres:postgres@localhost:5432/speakmate?schema=public` (matches the current `.env.example`).

`.env.example` will be extended with a commented block for `AUTH_URL`, `GOOGLE_*`, and `GITHUB_*` alongside the existing `AUTH_SECRET` and `DATABASE_URL` entries (Req 7.1, 7.7). README gains a "Free auth & database setup" section carrying the links and callback URLs above (Req 7.1–7.6).

## Error Handling

- **OAuth failure/cancellation (Req 1.4, 2.4):** Auth.js redirects to the configured `pages.error` (`/login`) with an `error` query param; the login page maps it to a descriptive, non-technical message via the existing `AuthForm` error region (`role="alert"`).
- **GitHub unverified email (Req 2.5):** the `signIn` callback returns a rejection that surfaces as a descriptive login-page error; no session is issued.
- **Credentials failure (Req 3.3):** `authorize` returns `null`; `AuthForm` shows the existing "Incorrect email or password." style message. The existing `src/lib/api.ts` `handler` continues to convert thrown `{ status: 401 }` and `ZodError` into friendly messages, never leaking server internals.
- **Missing/weak `AUTH_SECRET` (Req 5.8):** `getAuthSecret` throws a descriptive error at startup naming the variable and its minimum length.
- **Missing `DATABASE_URL` (Req 6.4):** a startup guard (invoked where the Prisma client / auth config initializes) throws a descriptive error naming `DATABASE_URL`.
- **Duplicate email / identity conflicts (Req 4.4, 4.5):** enforced by the `@unique` constraints; the adapter/resolution logic surfaces conflicts as sign-in errors rather than creating duplicate users.

## Security Considerations

- **Cookie hardening (Req 5.1–5.3):** the session cookie is `httpOnly`, `sameSite=lax`, `path=/`, and `secure` in production. Attributes are set in the Auth.js `cookies.sessionToken.options`, mirroring the current `speakmate_session` settings.
- **CSRF / OAuth state (Req 5.5):** Auth.js applies the OAuth `state` parameter and PKCE automatically — we do not hand-roll this.
- **Secret strength (Req 5.8):** enforced ≥ 32 chars (stricter than the current 16-char check in `session.ts`).
- **Password storage (Req 3.4):** unchanged `bcryptjs` hashing at 10 rounds; the `authorize` callback rejects OAuth-only accounts (null `passwordHash`) instead of comparing against null.
- **Email trust (Req 2.5):** GitHub sign-in requires a verified email before any account is created or linked, preventing email-spoofed account takeover during linking.
- **No secrets in the repo (Req 7.6):** `.env` stays git-ignored; `.env.example` and README contain placeholders and links only.
- **Runtime:** auth routes run on the Node.js runtime (`runtime = "nodejs"`) because `bcryptjs` and the Prisma adapter require Node APIs, consistent with the existing auth routes.

## Root Cause Fixes

The baseline `tsc --noEmit` currently **fails**. These fixes are in-scope; the migration is only considered verified when `tsc --noEmit` and `next build` pass.

### Fix 1 — async `cookies()` in `src/lib/auth/session.ts` (Next.js 16)

In Next 16, `cookies()` returns `Promise<ReadonlyRequestCookies>`, so `.set`/`.get` do not exist on the returned value. `setSessionCookie`, `clearSessionCookie`, and `getSession` currently call `cookies()` synchronously.

- `await cookies()` in all three functions before `.set`/`.get`.
- Make `clearSessionCookie` `async` (return `Promise<void>`).
- Update the caller `src/app/api/auth/logout/route.ts` to `await clearSessionCookie()` (during the transition to Auth.js `signOut`).

This clears the compile errors on `session.ts` and `logout/route.ts`.

### Fix 2 — async route `params` in `src/app/api/mistakes/[id]/route.ts` (Next.js 16)

The `DELETE` handler types the second argument as `{ params: { id: string } }`, but Next 16 passes `{ params: Promise<{ id: string }> }`.

- Type the argument as `{ params: Promise<{ id: string }> }`.
- `await` the params before reading `id` (e.g. `const { id } = await params;`) and use it in the Prisma `where` clauses.

Both fixes are required for `tsc --noEmit` and `next build` (which runs `prisma generate && next build`) to succeed, and are the gate for validating every property above.

## Testing Strategy

No test runner exists in `package.json` today. **Add Vitest** (plus `@vitest/coverage-v8`) as the test runner, with a `test` script (`vitest run`) so tests run once rather than in watch mode. Vitest is chosen for first-class TypeScript/ESM support and speed in a Next.js codebase. Property-based tests use **`fast-check`**.

### Dual approach

- **Property tests** (fast-check, **minimum 100 iterations** each, one property-based test per correctness property) cover the pure logic: session token round-trip and lifetime, secret and `DATABASE_URL` guards, password hashing, credentials authorization, registration validation, provider-conditional registration, OAuth resolution, account-integrity invariants, GitHub verified-email guard, and default-record provisioning. Prisma is mocked (in-memory store) so account-resolution and default-record properties test our logic without a live DB.
  - Each property test is tagged: **`Feature: free-auth-and-database, Property {number}: {property_text}`**.
- **Unit / example tests** cover: cookie attributes (`httpOnly`, `sameSite=lax`, `secure` by `NODE_ENV`), OAuth error-redirect messages on the login page, login-page rendering of the email/password form and the correct OAuth buttons for a given enabled-provider set, and `.env.example` completeness (each new key present with a comment).
- **Integration tests** cover the external machinery that PBT is not suited to: credentials login/register happy and error paths through the route handlers, the Prisma adapter creating a `User` + `Account`, the OAuth `state` parameter presence on the authorize redirect (Req 5.5), and a single connect smoke test against a representative `DATABASE_URL`.
- **Typecheck / build gate:** CI (and local verification) runs `npm run typecheck` (`tsc --noEmit`) and `npm run build` (`prisma generate && next build`). Both must pass — this is where [Root Cause Fixes](#root-cause-fixes) are validated.

### Test mapping per correctness property

| Property | Test type | Notes |
|---|---|---|
| P1 Session round-trip | property | fast-check over payloads |
| P2 Lifetime ≤ 7d | property | assert exp − iat ≤ 604800 |
| P3 Sign-out invalidates | property | issue → sign-out → expect null |
| P4 AUTH_SECRET guard | property | throws iff len < 32 / missing |
| P5 DATABASE_URL guard | property | throws naming var iff missing |
| P6 Hash round-trip | property | verify true, hash ≠ plaintext |
| P7 Credentials authorize | property | user iff verifyPassword true |
| P8 Registration schema | property | accept iff email+len valid |
| P9 Provider-conditional | property | include iff both env keys set |
| P10 OAuth resolution | property | mock store; one user per profile |
| P11 Account integrity | property | sequences; uniqueness + linking |
| P12 GitHub verified email | property | allow iff verified email present |
| P13 Default records | property | Profile+UserSettings on create |
| Cookie attrs / OAuth error UI / login buttons / .env.example | example/unit | deterministic assertions |
| Credentials routes / adapter persistence / OAuth state / DB connect | integration | 1–3 representative cases |

### Review and Approval

`requirements.md` exists and is approved for this requirements-first workflow. This design covers all eight requirements. If gaps are found during review, we can return to requirements clarification.
