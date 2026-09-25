import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { Logo } from "@/components/Logo";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN") redirect("/dashboard");

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-100 bg-white">
        <div className="container-page flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo href="/admin" />
            <span className="chip">Admin</span>
          </div>
          <Link
            href="/dashboard"
            className="text-sm font-medium text-brand-600 hover:underline"
          >
            Back to app
          </Link>
        </div>
      </header>
      <div className="container-page py-6">{children}</div>
    </div>
  );
}
