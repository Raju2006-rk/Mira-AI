import { Suspense } from "react";
import { AuthForm } from "@/components/AuthForm";

// Never statically pre-render this page — Firebase client SDK must only
// initialise in the browser, not during Next.js build-time pre-rendering.
export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="card">Loading…</div>}>
      <AuthForm mode="login" />
    </Suspense>
  );
}
