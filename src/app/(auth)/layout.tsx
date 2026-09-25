import { Logo } from "@/components/Logo";
import { brand } from "@/config/brand";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-brand-50 to-slate-50">
      <div className="container-page py-6">
        <Logo />
      </div>
      <main className="flex flex-1 items-center justify-center px-4 pb-16">
        <div className="w-full max-w-md">
          {children}
          <p className="mt-6 text-center text-xs text-slate-400">
            {brand.messages[3]}
          </p>
        </div>
      </main>
    </div>
  );
}
