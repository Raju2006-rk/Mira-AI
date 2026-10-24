"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  auth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from "@/lib/firebase/client";

type Mode = "login" | "register";

/** Map Firebase Auth error codes to friendly, non-technical messages. */
function friendlyError(code: string): string {
  const map: Record<string, string> = {
    "auth/email-already-in-use": "An account with this email already exists.",
    "auth/invalid-email": "Please enter a valid email address.",
    "auth/weak-password": "Password should be at least 6 characters.",
    "auth/user-not-found": "No account found with this email.",
    "auth/wrong-password": "Incorrect password. Please try again.",
    "auth/invalid-credential": "Incorrect email or password.",
    "auth/too-many-requests":
      "Too many attempts. Please wait a moment and try again.",
    "auth/network-request-failed":
      "Network error. Check your connection and try again.",
    "auth/user-disabled": "This account has been disabled.",
    "auth/operation-not-allowed":
      "Email/password sign-in is not enabled in Firebase. Please enable it in the Firebase console.",
  };
  return map[code] ?? "Something went wrong. Please try again.";
}

export function AuthForm({
  mode,
  enabledProviders: _enabledProviders,
}: {
  mode: Mode;
  /** @deprecated Firebase handles all providers — this prop is ignored. */
  enabledProviders?: string[];
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isRegister = mode === "register";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      let userCredential;

      if (isRegister) {
        // 1. Create Firebase user
        userCredential = await createUserWithEmailAndPassword(
          auth,
          email,
          password,
        );
        // 2. Set display name
        await updateProfile(userCredential.user, {
          displayName: name.trim() || email.split("@")[0],
        });
      } else {
        // 1. Sign in with Firebase
        userCredential = await signInWithEmailAndPassword(
          auth,
          email,
          password,
        );
      }

      // 3. Get the Firebase ID token
      const idToken = await userCredential.user.getIdToken();

      // 4. Exchange for a server-side session cookie
      const res = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idToken,
          name: isRegister
            ? name.trim() || email.split("@")[0]
            : (userCredential.user.displayName ?? email.split("@")[0]),
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.ok) {
        setError(json.error ?? "Something went wrong. Please try again.");
        return;
      }

      const next = params.get("next") ?? "/dashboard";
      router.push(next);
      router.refresh();
    } catch (err) {
      const code = (err as { code?: string })?.code ?? "";
      setError(friendlyError(code));
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
            placeholder={isRegister ? "At least 6 characters" : "Your password"}
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
