/**
 * Task 8.4 — Integration tests for the legacy credentials login/register route
 * handlers. (Requirements 3.2, 3.3, 3.4; Design: Testing Strategy)
 *
 * Plain deterministic assertions (NOT property tests). We exercise the real
 * POST handlers with real `Request` objects and assert the `{ ok, data }` /
 * `{ ok, error }` envelope plus HTTP status.
 *
 * Mocks:
 *   - `@/lib/db` prisma (user.findUnique / user.create) — no real database.
 *   - `@/lib/auth/session` `setSessionCookie` — a no-op so the login handler
 *     completes outside a Next.js request scope (the real one calls
 *     `next/headers` cookies(), which is unavailable here).
 *   - Passwords use REAL bcrypt (via @/lib/auth/password) so verification is
 *     genuine, not faked.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { hashPassword } from "@/lib/auth/password";

const findUniqueMock = vi.fn();
const createMock = vi.fn();
const setSessionCookieMock = vi.fn();

vi.mock("@/lib/db", () => ({
  getDatabaseUrl: (env: NodeJS.ProcessEnv) => env.DATABASE_URL ?? "",
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => findUniqueMock(...args),
      create: (...args: unknown[]) => createMock(...args),
    },
  },
}));

// setSessionCookie touches next/headers cookies(); stub to a no-op.
vi.mock("@/lib/auth/session", () => ({
  setSessionCookie: (...args: unknown[]) => setSessionCookieMock(...args),
}));

import { POST as loginPOST } from "@/app/api/auth/login/route";
import { POST as registerPOST } from "@/app/api/auth/register/route";

function jsonRequest(body: unknown): Request {
  return new Request("http://localhost/api/auth/x", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  findUniqueMock.mockReset();
  createMock.mockReset();
  setSessionCookieMock.mockReset();
});

describe("credentials login route (task 8.4)", () => {
  it("returns 401 { ok:false } when no user exists", async () => {
    findUniqueMock.mockResolvedValue(null);

    const res = await loginPOST(
      jsonRequest({ email: "nobody@example.com", password: "password123" }),
    );
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.ok).toBe(false);
    expect(setSessionCookieMock).not.toHaveBeenCalled();
  });

  it("returns 401 { ok:false } for an OAuth-only account (null passwordHash)", async () => {
    findUniqueMock.mockResolvedValue({
      id: "u1",
      email: "oauth@example.com",
      name: "OAuth User",
      role: "USER",
      passwordHash: null,
    });

    const res = await loginPOST(
      jsonRequest({ email: "oauth@example.com", password: "password123" }),
    );
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.ok).toBe(false);
  });

  it("returns 401 { ok:false } when the password is wrong", async () => {
    const passwordHash = await hashPassword("correct-password");
    findUniqueMock.mockResolvedValue({
      id: "u1",
      email: "real@example.com",
      name: "Real User",
      role: "USER",
      passwordHash,
    });

    const res = await loginPOST(
      jsonRequest({ email: "real@example.com", password: "wrong-password" }),
    );
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.ok).toBe(false);
  });

  it("returns ok(user) and sets the session for valid credentials", async () => {
    const passwordHash = await hashPassword("correct-password");
    findUniqueMock.mockResolvedValue({
      id: "u1",
      email: "real@example.com",
      name: "Real User",
      role: "USER",
      passwordHash,
    });

    const res = await loginPOST(
      jsonRequest({ email: "real@example.com", password: "correct-password" }),
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.data).toMatchObject({
      id: "u1",
      email: "real@example.com",
      name: "Real User",
      role: "USER",
    });
    expect(setSessionCookieMock).toHaveBeenCalledTimes(1);
  });
});

describe("credentials register route (task 8.4)", () => {
  it("returns 409 { ok:false } when the email already exists", async () => {
    findUniqueMock.mockResolvedValue({ id: "u1", email: "taken@example.com" });

    const res = await registerPOST(
      jsonRequest({
        name: "New User",
        email: "taken@example.com",
        password: "password123",
      }),
    );
    const body = await res.json();

    expect(res.status).toBe(409);
    expect(body.ok).toBe(false);
    expect(createMock).not.toHaveBeenCalled();
  });

  it("creates the user with nested profile/settings/streak and returns ok(user)", async () => {
    findUniqueMock.mockResolvedValue(null);
    createMock.mockResolvedValue({
      id: "u-new",
      name: "New User",
      email: "new@example.com",
      role: "USER",
    });

    const res = await registerPOST(
      jsonRequest({
        name: "New User",
        email: "new@example.com",
        password: "password123",
      }),
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.data).toMatchObject({
      id: "u-new",
      name: "New User",
      email: "new@example.com",
      role: "USER",
    });

    // Assert the nested default-record creation and that the password is hashed
    // (never stored as plaintext).
    expect(createMock).toHaveBeenCalledTimes(1);
    const createArg = createMock.mock.calls[0][0] as {
      data: {
        passwordHash: string;
        profile: unknown;
        settings: unknown;
        streak: unknown;
      };
    };
    expect(createArg.data.profile).toEqual({ create: {} });
    expect(createArg.data.settings).toEqual({ create: {} });
    expect(createArg.data.streak).toEqual({ create: {} });
    expect(createArg.data.passwordHash).not.toBe("password123");
    expect(typeof createArg.data.passwordHash).toBe("string");
  });
});
