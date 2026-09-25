# SpeakMate AI — Your 24/7 Personal English Speaking Coach

> **Speak English Without Fear.** Practice every day with your personal AI
> English teacher (Mira) and become more confident in real conversations.

This repository contains **Phase 1** of SpeakMate AI: a real, runnable
**Next.js + TypeScript + Tailwind** web application with genuine authentication,
a PostgreSQL database, a **replaceable AI provider layer**, and a voice-first
tutor experience.

Everything here is functional — no fake buttons, no fake auth, no hardcoded
dashboards. The default AI provider is a fully offline, rule-based English tutor
so the product works end-to-end with **no API keys**; you can swap in an
OpenAI-compatible LLM with a single environment variable.

---

## What's included in Phase 1

| Area | Status |
| --- | --- |
| Central brand config (one-file rename) | ✅ `src/config/brand.ts` |
| Real auth: email/password, hashed, JWT sessions, roles, protected routes | ✅ |
| PostgreSQL schema via Prisma (core learning entities) | ✅ |
| Replaceable AI provider layer (local + OpenAI-compatible) | ✅ |
| Voice-first "Speak with Mira" (Web Speech STT/TTS, graceful fallback) | ✅ |
| What Should I Say? · Fix My English · Find the Right Word | ✅ |
| Personal Mistake Book (auto-recorded, deletable) | ✅ |
| Progress dashboard with confidence/speaking/grammar indicators | ✅ |
| Daily streak tracking | ✅ |
| Settings + privacy controls (clear history, toggles) | ✅ |
| Admin dashboard (role-protected) | ✅ |
| Public marketing site (Home, Features, Pricing, FAQ, About, Privacy, Terms…) | ✅ |
| Responsive layout (mobile bottom-nav + desktop sidebar) | ✅ |

### Planned for later phases (see [ROADMAP](#roadmap))

Roleplay scenarios, Interview simulator, Presentation mode, Pronunciation
coach, Listening practice, full Vocabulary spaced-repetition UI, Grammar coach
chat, onboarding assessment flow, native-language explanations, notifications,
and the **Flutter Android app**.

---

## Tech stack

- **Framework:** Next.js 14 (App Router) + TypeScript (strict)
- **UI:** Tailwind CSS with a small reusable component system
- **Database:** PostgreSQL via Prisma ORM
- **Auth:** Email/password (bcryptjs) + signed JWT session cookies (jose)
- **AI:** Provider abstraction (`src/lib/ai`) — `local` (offline) or `openai`
- **Speech:** Browser Web Speech API (STT + TTS), no keys required

---

## Prerequisites

- **Node.js 18+** (20/22 recommended)
- **PostgreSQL 13+** running locally or a hosted connection string
- npm (or pnpm/yarn)

---

## Setup (from a clean environment)

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
#    - Set DATABASE_URL to your Postgres instance
#    - Set AUTH_SECRET to a long random string:  openssl rand -base64 48
#    - Leave AI_PROVIDER=local to run fully offline (default)

# 3. Create the database schema
npm run prisma:push        # or: npm run prisma:migrate (creates a migration)

# 4. Generate the Prisma client
npm run prisma:generate

# 5. (Optional) Seed demo data + demo logins
npm run db:seed

# 6. Start the dev server
npm run dev
# open http://localhost:3000
```

### Demo logins (after seeding)

| Role | Email | Password |
| --- | --- | --- |
| Learner | `demo@speakmate.example` | `password123` |
| Admin | `admin@speakmate.example` | `password123` |

> These are seed accounts for local development only. Change or remove them
> before any real deployment.

---

## Development commands

```bash
npm run dev              # start dev server (http://localhost:3000)
npm run typecheck        # TypeScript type checking (tsc --noEmit)
npm run lint             # ESLint
npm run prisma:studio    # browse the database in Prisma Studio
npm run prisma:push      # sync schema to the database (no migration files)
npm run prisma:migrate   # create + apply a migration
npm run db:seed          # seed demo data
```

## Production build

```bash
npm run build            # prisma generate + next build
npm run start            # start the production server
```

---

## Enabling a real LLM (optional)

The default `local` provider does genuine grammar analysis offline. To use a
cloud LLM instead, set these in `.env`:

```env
AI_PROVIDER="openai"
OPENAI_API_KEY="sk-..."
OPENAI_BASE_URL="https://api.openai.com/v1"   # any OpenAI-compatible endpoint
OPENAI_MODEL="gpt-4o-mini"
```

The API key is used **server-side only** and is never sent to the browser. If a
network/API error occurs, the app automatically falls back to the offline
provider so the learner is never stuck.

See [`docs/API.md`](docs/API.md) for the full API reference and
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the folder structure and how
to add a new AI/speech provider.

---

## Roadmap

Phase 1 (this repo) delivers the core learning loop. Subsequent phases:

1. **Onboarding + assessment** — language, level, goals, 30-second speaking test
2. **Roleplay & Interview** — scenario engine, interviewer persona, feedback
3. **Pronunciation & Listening** — listen→repeat→compare, adaptive audio
4. **Vocabulary system** — spaced repetition UI, My Words
5. **Grammar coach** — conversational grammar Q&A
6. **Native-language support** — Telugu, Hindi, Tamil, and more
7. **Notifications & offline caching**
8. **Flutter Android app** sharing this backend

---

## Notes on learning indicators

Confidence, speaking, and grammar percentages shown in the app are **learning
indicators to guide practice — not scientific measurements or certifications**,
and they do not predict real-world outcomes such as employment.
