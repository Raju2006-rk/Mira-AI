# Requirements Document

## Introduction

SpeakMate AI currently supports a single sign-in method: email and password, backed by a hand-rolled signed-JWT session cookie (`speakmate_session`) and a PostgreSQL database accessed through Prisma. This feature expands authentication to include free, no-cost social login providers (Google and GitHub) alongside the existing email/password flow, and standardizes support for free-tier PostgreSQL hosting providers (Neon, Supabase, Vercel Postgres). It also delivers clear, link-backed documentation so a developer can obtain every required credential (OAuth client IDs/secrets and database connection strings) without guesswork.

Per confirmed decisions:
- Authentication will be migrated to Auth.js (NextAuth v5), which wraps OAuth and credential providers and integrates with Prisma. The existing email/password capability is preserved as a Credentials provider.
- Social providers in scope: Google and GitHub.
- Free-tier database providers to document and support: Neon, Supabase, and Vercel Postgres.
- All provider setup steps must include direct links to where credentials are obtained.

## Glossary

- **SpeakMate**: The overall SpeakMate AI Next.js application.
- **Auth_System**: The authentication subsystem built on Auth.js (NextAuth v5), including providers, session handling, and account persistence.
- **Auth_Provider**: An external identity source used to sign in. In scope: Google OAuth, GitHub OAuth, and the built-in Credentials (email/password) provider.
- **OAuth_Provider**: An `Auth_Provider` that uses the OAuth 2.0 authorization-code flow (Google, GitHub).
- **Credentials_Provider**: The email/password `Auth_Provider` that verifies a bcrypt password hash stored on the `User` record.
- **Session**: An authenticated user session managed by the `Auth_System` and represented by an httpOnly session cookie.
- **User_Account**: The `User` record in the database, uniquely identified by email.
- **Linked_Account**: A persisted association between a `User_Account` and a specific `OAuth_Provider` identity (provider name plus provider-side account id).
- **Database_Provider**: A hosting service that supplies a PostgreSQL connection string. In scope: Neon, Supabase, Vercel Postgres, and local PostgreSQL.
- **Connection_String**: The PostgreSQL URL supplied via the `DATABASE_URL` environment variable.
- **Setup_Documentation**: The developer-facing docs (README plus `.env.example`) that describe configuration and credential acquisition.
- **Credential_Link**: A direct URL, included in `Setup_Documentation`, to the page where a specific provider credential is created or copied.

## Requirements

### Requirement 1: Google social sign-in

**User Story:** As a new or returning user, I want to sign in with my Google account, so that I can access SpeakMate without creating or remembering a password.

#### Acceptance Criteria

1. THE Auth_System SHALL offer Google as an OAuth_Provider using the OAuth 2.0 authorization-code flow.
2. WHEN a user completes Google authentication successfully AND no User_Account exists for the returned email, THE Auth_System SHALL create a User_Account from the returned Google profile and establish a Session.
3. WHEN a user completes Google authentication successfully AND a User_Account already exists for the returned email, THE Auth_System SHALL establish a Session for that existing User_Account.
4. IF Google authentication fails or is cancelled, THEN THE Auth_System SHALL return the user to the login page with a descriptive error message and SHALL NOT establish a Session.
5. WHERE the Google OAuth credentials are not configured, THE Auth_System SHALL omit the Google sign-in option from the login interface.

### Requirement 2: GitHub social sign-in

**User Story:** As a developer-oriented user, I want to sign in with my GitHub account, so that I can use an identity I already trust.

#### Acceptance Criteria

1. THE Auth_System SHALL offer GitHub as an OAuth_Provider using the OAuth 2.0 authorization-code flow.
2. WHEN a user completes GitHub authentication successfully AND no User_Account exists for the returned email, THE Auth_System SHALL create a User_Account from the returned GitHub profile and establish a Session.
3. WHEN a user completes GitHub authentication successfully AND a User_Account already exists for the returned email, THE Auth_System SHALL establish a Session for that existing User_Account.
4. IF GitHub authentication fails or is cancelled, THEN THE Auth_System SHALL return the user to the login page with a descriptive error message and SHALL NOT establish a Session.
5. IF the GitHub profile does not include a verified email address, THEN THE Auth_System SHALL reject the sign-in with a descriptive error message and SHALL NOT establish a Session.
6. WHERE the GitHub OAuth credentials are not configured, THE Auth_System SHALL omit the GitHub sign-in option from the login interface.

### Requirement 3: Preserve email/password sign-in

**User Story:** As an existing user with an email/password account, I want to keep signing in with my email and password, so that my current access is not disrupted by the new login options.

#### Acceptance Criteria

1. THE Auth_System SHALL provide a Credentials_Provider that accepts an email and password.
2. WHEN a user submits an email and password that match a stored User_Account password hash, THE Auth_System SHALL establish a Session.
3. IF a user submits credentials that do not match a stored User_Account password hash, THEN THE Auth_System SHALL reject the sign-in with a descriptive error message and SHALL NOT establish a Session.
4. WHEN a new user registers with email and password, THE Auth_System SHALL store the password as a bcrypt hash and SHALL NOT store the plaintext password.
5. THE Auth_System SHALL preserve the existing registration validation rules for email format and password strength.

### Requirement 4: Account model supports OAuth and password accounts

**User Story:** As a user, I want a single account regardless of how I sign in, so that my learning data stays together across sign-in methods.

#### Acceptance Criteria

1. THE Auth_System SHALL allow a User_Account to exist without a stored password hash WHERE the account was created through an OAuth_Provider.
2. THE Auth_System SHALL persist a Linked_Account for each OAuth_Provider identity, recording the provider name and the provider-side account identifier.
3. WHEN a signed-in user authenticates through an additional OAuth_Provider whose email matches the current User_Account email, THE Auth_System SHALL attach a new Linked_Account to that existing User_Account.
4. THE Auth_System SHALL enforce that each User_Account email is unique.
5. THE Auth_System SHALL enforce that each combination of OAuth_Provider name and provider-side account identifier maps to at most one User_Account.
6. WHEN a User_Account is created through any Auth_Provider, THE Auth_System SHALL create the associated default Profile and UserSettings records for that User_Account.

### Requirement 5: Session behavior and security

**User Story:** As a user, I want my session to remain secure and behave consistently, so that my account is protected no matter which login method I used.

#### Acceptance Criteria

1. THE Auth_System SHALL store the Session in an httpOnly cookie.
2. WHILE the application runs in production, THE Auth_System SHALL mark the Session cookie as Secure.
3. THE Auth_System SHALL set the Session cookie SameSite attribute to `lax`.
4. THE Auth_System SHALL expire a Session no later than 7 days after it is established.
5. THE Auth_System SHALL protect the OAuth authorization-code flow against cross-site request forgery using a state parameter.
6. WHEN a user signs out, THE Auth_System SHALL invalidate the Session cookie.
7. THE Auth_System SHALL expose the signed-in user's id, email, name, and role to server-side code for authorization checks.
8. IF the required Auth_System signing secret is missing or shorter than 32 characters, THEN THE Auth_System SHALL fail startup with a descriptive error message.

### Requirement 6: Free-tier database provider support

**User Story:** As a developer deploying SpeakMate, I want to connect to a free-tier PostgreSQL database, so that I can run the application at no cost.

#### Acceptance Criteria

1. THE SpeakMate application SHALL read the PostgreSQL Connection_String from the `DATABASE_URL` environment variable.
2. THE SpeakMate application SHALL operate against a Connection_String provided by Neon, Supabase, Vercel Postgres, or a local PostgreSQL instance without code changes.
3. WHERE a Database_Provider requires TLS in its Connection_String, THE Setup_Documentation SHALL state the required Connection_String parameters for that Database_Provider.
4. IF `DATABASE_URL` is missing at startup, THEN THE SpeakMate application SHALL fail startup with a descriptive error message that names the missing variable.
5. THE Auth_System SHALL persist User_Account, Linked_Account, and Session-supporting data through Prisma against the configured PostgreSQL database.

### Requirement 7: Credential acquisition documentation

**User Story:** As a developer setting up SpeakMate, I want direct links to obtain each provider's API keys and connection strings, so that I can configure authentication and the database without searching.

#### Acceptance Criteria

1. THE Setup_Documentation SHALL list every environment variable required to enable Google sign-in, GitHub sign-in, and each supported Database_Provider.
2. THE Setup_Documentation SHALL include a Credential_Link to the Google OAuth credentials page where the client id and client secret are created.
3. THE Setup_Documentation SHALL include a Credential_Link to the GitHub OAuth application page where the client id and client secret are created.
4. THE Setup_Documentation SHALL include a Credential_Link to Neon, a Credential_Link to Supabase, and a Credential_Link to Vercel Postgres where each Connection_String is obtained.
5. THE Setup_Documentation SHALL state the exact OAuth redirect/callback URL that must be registered with each OAuth_Provider for local development and for production.
6. THE Setup_Documentation SHALL instruct developers to keep credential values in a local, uncommitted environment file and SHALL NOT contain real credential values.
7. THE `.env.example` file SHALL include placeholder entries, each with an explanatory comment, for every Google, GitHub, Auth_System, and Database_Provider variable introduced by this feature.

### Requirement 8: Login interface presents available methods

**User Story:** As a user on the login page, I want to see the sign-in options that are actually configured, so that I am not offered a method that cannot work.

#### Acceptance Criteria

1. THE Auth_System SHALL present the email/password form on the login page.
2. WHERE an OAuth_Provider is configured, THE Auth_System SHALL present a sign-in button for that OAuth_Provider on the login page.
3. WHERE an OAuth_Provider is not configured, THE Auth_System SHALL omit that OAuth_Provider's sign-in button from the login page.
4. WHEN a sign-in attempt fails, THE Auth_System SHALL display a descriptive error message on the login page.
