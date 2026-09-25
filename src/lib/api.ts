import { NextResponse } from "next/server";
import { ZodError } from "zod";

/** Standard success JSON. */
export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ ok: true, data }, init);
}

/** Standard error JSON with a user-friendly message. */
export function fail(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

/**
 * Wraps a route handler with consistent error handling so raw server errors
 * are never leaked to the client (spec §43).
 */
export function handler<T extends unknown[]>(
  fn: (...args: T) => Promise<NextResponse>,
) {
  return async (...args: T): Promise<NextResponse> => {
    try {
      return await fn(...args);
    } catch (err) {
      if (err instanceof ZodError) {
        return fail(err.issues[0]?.message ?? "Invalid input", 422);
      }
      const status = (err as { status?: number })?.status;
      if (status === 401) return fail("Please sign in to continue.", 401);
      // Log server-side detail, return a friendly message.
      console.error("[api] unhandled error:", err);
      return fail("Something went wrong. Please try again.", 500);
    }
  };
}
