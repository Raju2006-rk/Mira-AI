"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";

type Mode = "login" | "register";

/**
 * Map an Auth.js OAuth `error` query param (delivered to the configured error
 * page, `/login`) to a friendly, non-technical message. (Req 1.4, 2.4, 8.4)
 *
 * Auth.js uses a small set of well-known error codes; anything unrecognized
 * falls back to a generic sign-in failure message so we never leak internals.
 */
function oauthErrorMessage(code: string): string {
  switch (code) {
    case "OAuthAccountNotLinked":
      return "That email is already registered with a different sign-in method. Please use the method you signed up with.";
    case "AccessDenied":
      return "Sign-in was cancelled or not permitted. Please try again.";
    case "Configuration":
      return "Sign-in is temporarily unavailable. Please try again later.";
    case "Verification":
      return "This sign-in link is invalid or has expired. Please try again.";
    default:
      return "Sign-in failed. Please try again.";
  }
}

export function AuthForm({
  mode,
  enabledProviders = ["credentials"],
}: {
  mode: Mode;
  /**
   * The provider ids the server has configured (e.g.
   * `["credentials", "google", "github"]`). OAuth buttons render only for the
   * providers present here. (Req 8.2, 8.3)
   */
  enabledProviders?: string[];
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // Seed the alert region from any OAuth `error` query param on first render.
  const oauthError = params.get("error");
  const [error, setError] = useState<string | null>(
    oauthError ? oauthErrorMessage(oauthError) : null,
  );
  const [loading, setLoading] = useState(false);

  const isRegister = mode === "register";
  const showGoogle = enabledProviders.includes("google");
  const showGitHub = enabledProviders.includes("github");
  const hasOAuth = showGoogle || showGitHub;

  function redirectAfterAuth() {
    const next = params.get("next") ?? "/dashboard";
    router.push(next);
    router.refresh();
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (isRegister) {
        // 1) Create the account. The register route no longer sets a session
        //    cookie (task 5.5), so we establish the session below.
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, password }),
        });
        const json = await res.json();
        if (!res.ok || !json.ok) {
          setError(json.error ?? "Something went wrong. Please try again.");
          return;
        }
      }

      // 2) Establish the session via Auth.js Credentials (both login and the
      //    post-register step). `redirect: false` keeps us on the client so we
      //    can surface errors and navigate ourselves.
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (!result || result.error) {
        setError("Incorrect email or password.");
        return;
      }

      redirectAfterAuth();
    } catch {
      setError(
        "Couldn't reach the server. Check your connection and try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card">
      <h1 className="text-2xl font-bold text-slate-900">
        {isRegister ? "Create your account" : "Welcome back"}
      </h1>
      <p className="mt-1 text-sm text-slate-500">
        {isRegister
          ? "Start practicing English without fear."
          : "Log in to keep practicing with Mira."}
      </p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
        {isRegister && (
          <div>
            <label className="label" htmlFor="name">
              Your name
            </label>
            <input
              id="name"
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Raj"
              autoComplete="name"
              required
            />
          </div>
        )}
        <div>
          <label className="label" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            className="input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            required
          />
        </div>
        <div>
          <label className="label" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            className="input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={isRegister ? "At least 8 characters" : "Your password"}
            autoComplete={isRegister ? "new-password" : "current-password"}
            required
          />
        </div>

        {error && (
          <p
            role="alert"
            className="rounded-xl bg-red-50 px-4 py-2 text-sm text-red-600"
          >
            {error}
          </p>
        )}

        <button type="submit" className="btn-primary w-full" disabled={loading}>
          {loading ? "Please wait…" : isRegister ? "Create account" : "Log in"}
        </button>
      </form>

      {hasOAuth && (
        <>
          <div className="my-6 flex items-center gap-3">
            <span className="h-px flex-1 bg-slate-200" />
            <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
              or
            </span>
            <span className="h-px flex-1 bg-slate-200" />
          </div>

          <div className="space-y-3">
            {showGoogle && (
              <button
                type="button"
                className="btn-secondary w-full"
                onClick={() => signIn("google")}
                disabled={loading}
              >
                Continue with Google
              </button>
            )}
            {showGitHub && (
              <button
                type="button"
                className="btn-secondary w-full"
                onClick={() => signIn("github")}
                disabled={loading}
              >
                Continue with GitHub
              </button>
            )}
          </div>
        </>
      )}

      <p className="mt-4 text-center text-sm text-slate-500">
        {isRegister ? (
          <>
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-semibold text-brand-600 hover:underline"
            >
              Log in
            </Link>
          </>
        ) : (
          <>
            New here?{" "}
            <Link
              href="/register"
              className="font-semibold text-brand-600 hover:underline"
            >
              Create an account
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
