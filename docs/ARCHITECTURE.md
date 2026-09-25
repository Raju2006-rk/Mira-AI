# SpeakMate AI — Architecture & Folder Structure

## Folder structure

```
speakmate/
├── prisma/
│   ├── schema.prisma          # Database schema (PostgreSQL)
│   └── seed.ts                # Demo data + demo logins
├── src/
│   ├── config/
│   │   ├── brand.ts           # ⭐ Single source of truth for product naming
│   │   └── plans.ts           # Configurable subscription plans (no hardcoded logic)
│   ├── lib/
│   │   ├── ai/                # Replaceable AI provider layer
│   │   │   ├── types.ts       #   AIProvider interface + DTOs
│   │   │   ├── local-provider.ts   #   Offline rule-based tutor (default)
│   │   │   ├── openai-provider.ts  #   OpenAI-compatible adapter (+ fallback)
│   │   │   ├── gemini-provider.ts  #   Google Gemini adapter (+ fallback)
│   │   │   └── index.ts       #   getAIProvider() — env-driven selection
│   │   ├── auth/
│   │   │   ├── session.ts     #   JWT session cookies (jose)
│   │   │   ├── password.ts    #   bcrypt hashing
│   │   │   └── require.ts     #   requireUser() guard for route handlers
│   │   ├── api.ts             # ok()/fail()/handler() — safe error envelope
│   │   ├── context.ts         # buildTutorContext() from the user's profile
│   │   ├── db.ts              # Prisma client singleton
│   │   ├── greeting.ts        # time-of-day greeting
│   │   ├── speech.ts          # Web Speech API wrappers (STT/TTS)
│   │   └── validation.ts      # Zod schemas
│   ├── components/            # Reusable UI (Logo, nav, chat, tools, etc.)
│   ├── middleware.ts          # Route protection + role gating + redirects
│   └── app/
│       ├── layout.tsx         # Root layout
│       ├── globals.css        # Tailwind + component classes
│       ├── page.tsx           # Landing page
│       ├── (auth)/            # login, register (+ auth layout)
│       ├── (app)/             # Protected app (dashboard, speak, tools, ...)
│       │   └── layout.tsx     #   Sidebar + bottom-nav shell, session guard
│       ├── admin/             # Role-protected admin area
│       ├── features/ pricing/ faq/ about/ contact/ privacy/ terms/ how-it-works/
│       └── api/               # Route handlers (auth, chat, phrasing, fix, ...)
├── .env.example
├── next.config.mjs
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

## Design principles

- **The rest of the app never talks to a vendor directly.** All AI access goes
  through the `AIProvider` interface. Selecting a provider is a one-line env
  change (`AI_PROVIDER`). API keys stay server-side.
- **Correctness of the error boundary.** Every API route is wrapped in
  `handler()`, which maps Zod/auth/unknown errors to friendly messages and
  logs raw details server-side only.
- **Voice degrades gracefully.** `speech.ts` feature-detects the Web Speech API;
  the UI falls back to text input when voice isn't available and shows friendly
  messages for permission/no-speech/network errors.
- **One-file rebrand.** `src/config/brand.ts` holds all product-facing strings.

## How to add a new AI provider

1. Implement the `AIProvider` interface (`src/lib/ai/types.ts`) in a new file,
   e.g. `src/lib/ai/anthropic-provider.ts`. Reuse `LocalProvider` as a fallback.
2. Wire it into `getAIProvider()` in `src/lib/ai/index.ts` behind a new
   `AI_PROVIDER` value.
3. Add any keys to `.env.example`. Never read keys in client components.

## How to add a new speech provider

`src/lib/speech.ts` currently uses the browser Web Speech API. To use a cloud
STT/TTS service, add a server route that proxies audio to the provider (keeping
keys server-side) and swap the client calls in `MiraChat.tsx` / `speech.ts`.

## Data model (summary)

`User 1—1 Profile / UserSettings / DailyStreak`, `User 1—* Conversation 1—*
ConversationMessage`, `User 1—* UserMistake`, `User *—* Vocabulary`
(via `UserVocabulary`), `User *—* Lesson` (via `LessonProgress`). Indexes are
defined on foreign keys and `Role`. See `prisma/schema.prisma`.
