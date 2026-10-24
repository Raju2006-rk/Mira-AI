import { Suspense } from "react";
import { AuthForm } from "@/components/AuthForm";

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="card">Loading…</div>}>
      <AuthForm mode="register" />
    </Suspense>
  );
}
