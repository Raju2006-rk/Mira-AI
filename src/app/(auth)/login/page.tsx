import { Suspense } from "react";
import { AuthForm } from "@/components/AuthForm";
import { enabledProviderNames } from "@/lib/auth";

// Server component: rendered on the Node runtime, so importing the full auth
// config (Prisma/bcrypt) is fine. We derive the configured provider names from
// process.env via the single source of truth (`enabledProviderNames`) rather
// than duplicating env checks here, and pass them to the client form so it
// renders exactly the OAuth buttons that are actually configured.
export default function LoginPage() {
  const enabledProviders = enabledProviderNames(process.env);
  return (
    <Suspense fallback={<div className="card">Loading…</div>}>
      <AuthForm mode="login" enabledProviders={enabledProviders} />
    </Suspense>
  );
}
