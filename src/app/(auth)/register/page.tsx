import { Suspense } from "react";
import { AuthForm } from "@/components/AuthForm";
import { enabledProviderNames } from "@/lib/auth";

// Server component: OAuth can register new users too, so we surface the same
// configured OAuth buttons on the register page. Provider names come from the
// single source of truth (`enabledProviderNames`) computed on the server.
export default function RegisterPage() {
  const enabledProviders = enabledProviderNames(process.env);
  return (
    <Suspense fallback={<div className="card">Loading…</div>}>
      <AuthForm mode="register" enabledProviders={enabledProviders} />
    </Suspense>
  );
}
