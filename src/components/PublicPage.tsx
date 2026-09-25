import { PublicHeader } from "./PublicHeader";
import { PublicFooter } from "./PublicFooter";

export function PublicPage({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader />
      <main className="flex-1">
        <div className="container-page py-12">
          <h1 className="text-3xl font-bold text-slate-900">{title}</h1>
          {subtitle && (
            <p className="mt-2 max-w-2xl text-slate-600">{subtitle}</p>
          )}
          <div className="mt-8">{children}</div>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
