# SpeakMate AI — API Reference

All endpoints live under `/api`. Requests and responses are JSON. Endpoints
follow a consistent envelope:

```jsonc
// success
{ "ok": true, "data": { /* ... */ } }
// error (raw server errors are never leaked)
{ "ok": false, "error": "Human-friendly message" }
```

Authentication uses an httpOnly session cookie (`speakmate_session`) set on
login/register. Protected endpoints return **401** when the cookie is missing or
invalid.

---

## Auth

### `POST /api/auth/register`
Create an account and start a session.

```jsonc
// body
{ "name": "Raj", "email": "raj@example.com", "password": "atleast8chars" }
// 200 -> { ok, data: { id, name, email, role } }
// 409 -> email already exists
// 422 -> validation error
```

### `POST /api/auth/login`
```jsonc
{ "email": "raj@example.com", "password": "..." }
// 200 -> { ok, data: { id, name, email, role } }
// 401 -> incorrect email or password
```

### `POST /api/auth/logout`
Clears the session cookie. `200 -> { ok, data: { loggedOut: true } }`

---

## Tutor (Mira)

### `POST /api/chat`  🔒
Conversational turn with Mira. Persists the conversation and auto-records
important corrections into the Mistake Book.

```jsonc
// body
{
  "message": "Today I go college and I meet my friend.",
  "mode": "CONVERSATION",          // CONVERSATION|TEACHER|CORRECTION|INTERVIEW|ROLEPLAY|PRONUNCIATION
  "conversationId": "optional-existing-id"
}
// 200
{
  "ok": true,
  "data": {
    "conversationId": "...",
    "reply": "Good attempt! A more natural way ...",
    "corrections": [
      { "original": "...", "corrected": "...", "category": "GRAMMAR", "explanation": "..." }
    ],
    "messageId": "..."
  }
}
```

### `POST /api/phrasing`  🔒
"What Should I Say?" — one idea in three registers.

```jsonc
{ "idea": "I want to ask teacher whether class is cancelled." }
// -> { ok, data: { simple, polite, professional, note } }
```

### `POST /api/fix`  🔒
"Fix My English" — natural rewrite + reason. Records the correction.

```jsonc
{ "sentence": "I am having doubt regarding this." }
// -> { ok, data: { simple, natural, professional, why } }
```

### `POST /api/find-word`  🔒
"Find the Right Word" — describe an idea, get a word.

```jsonc
{ "description": "a person who always helps others" }
// -> { ok, data: { word, meaning, example, synonyms, usageNote } }
```

---

## Learning data

### `GET /api/mistakes`  🔒
List saved mistakes (most frequent first).
`-> { ok, data: { mistakes: [...] } }`

### `DELETE /api/mistakes/{id}`  🔒
Delete one of the learner's own mistakes. `404` if not found/owned.

### `GET /api/progress`  🔒
Aggregate indicators for the progress dashboard.
`-> { ok, data: { conversations, turnsSpoken, mistakesLogged, wordsSaved, lessonsCompleted, confidenceScore, streak: { current, longest } } }`

### `POST /api/streak/ping`  🔒
Register today's practice and update the daily streak.
`-> { ok, data: { current, longest } }`

---

## Settings & privacy

### `GET /api/settings`  🔒
`-> { ok, data: { settings } }`

### `PATCH /api/settings`  🔒
```jsonc
{ "voiceEnabled": true, "notificationsOn": false, "saveConversationHistory": true, "speakingRate": 1.0 }
```

### `DELETE /api/conversations`  🔒
Delete all of the learner's conversation history (privacy control).
`-> { ok, data: { cleared: true } }`

---

🔒 = requires an authenticated session.
