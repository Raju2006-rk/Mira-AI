// @vitest-environment jsdom
/**
 * Task 8.2 — Unit/component tests for the provider-aware login UI and the
 * OAuth error message mapping. (Requirements 8.1, 8.2, 8.3, 8.4, 1.4, 2.4)
 *
 * Plain deterministic assertions (NOT property tests).
 *
 * The global Vitest environment is `node`; this file opts into `jsdom` via the
 * docblock above so React can render into a DOM.
 *
 * AuthForm is a client component that pulls in `next/navigation`
 * (useRouter/useSearchParams) and `next-auth/react` (signIn). We mock both so
 * the component renders without a real Next.js runtime. `useSearchParams` is
 * backed by a mutable URLSearchParams so individual tests can seed an OAuth
 * `error` query param.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";

// Mutable search params so each test can control the query string.
let currentParams = new URLSearchParams();
const pushMock = vi.fn();
const refreshMock = vi.fn();
const signInMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock }),
  useSearchParams: () => currentParams,
}));

vi.mock("next-auth/react", () => ({
  signIn: (...args: unknown[]) => signInMock(...args),
}));

// next/link renders a plain anchor in the jsdom environment.
vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

import { AuthForm } from "@/components/AuthForm";

beforeEach(() => {
  currentParams = new URLSearchParams();
  pushMock.mockReset();
  refreshMock.mockReset();
  signInMock.mockReset();
});

afterEach(() => {
  cleanup();
});

describe("AuthForm provider buttons & OAuth error UI (task 8.2)", () => {
  it("credentials-only: renders email + password, no OAuth buttons", () => {
    render(<AuthForm mode="login" enabledProviders={["credentials"]} />);

    // Email and password fields are always present.
    expect(screen.getByLabelText("Email")).toBeTruthy();
    expect(screen.getByLabelText("Password")).toBeTruthy();

    // No OAuth buttons when only credentials are enabled.
    expect(screen.queryByText("Continue with Google")).toBeNull();
    expect(screen.queryByText("Continue with GitHub")).toBeNull();
  });

  it("google+github enabled: renders both OAuth buttons", () => {
    render(
      <AuthForm
        mode="login"
        enabledProviders={["credentials", "google", "github"]}
      />,
    );

    expect(screen.getByText("Continue with Google")).toBeTruthy();
    expect(screen.getByText("Continue with GitHub")).toBeTruthy();
  });

  it("clicking the Google button calls signIn('google')", () => {
    render(
      <AuthForm
        mode="login"
        enabledProviders={["credentials", "google", "github"]}
      />,
    );

    fireEvent.click(screen.getByText("Continue with Google"));

    expect(signInMock).toHaveBeenCalledWith("google");
  });

  it("maps ?error=OAuthAccountNotLinked to a friendly alert message", () => {
    currentParams = new URLSearchParams("error=OAuthAccountNotLinked");

    render(<AuthForm mode="login" enabledProviders={["credentials"]} />);

    const alert = screen.getByRole("alert");
    expect(alert.textContent).toContain(
      "already registered with a different sign-in method",
    );
  });

  it("unrecognized error code falls back to a generic sign-in failure", () => {
    currentParams = new URLSearchParams("error=SomethingUnknown");

    render(<AuthForm mode="login" enabledProviders={["credentials"]} />);

    const alert = screen.getByRole("alert");
    expect(alert.textContent).toContain("Sign-in failed");
  });

  it("register mode additionally renders the name field", () => {
    render(<AuthForm mode="register" enabledProviders={["credentials"]} />);

    expect(screen.getByLabelText("Your name")).toBeTruthy();
    expect(screen.getByLabelText("Email")).toBeTruthy();
    expect(screen.getByLabelText("Password")).toBeTruthy();
  });
});
