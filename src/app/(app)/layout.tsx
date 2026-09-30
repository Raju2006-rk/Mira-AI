import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth/require";
import { AppSidebar, AppBottomNav } from "@/components/AppNav";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession();
  if (!session) redirect("/login");

  return (
    <div className="flex min-h-screen bg-slate-50">
      <AppSidebar name={session.name} />
      <div className="flex-1 pb-20 md:pb-0">
        <div className="container-page py-6">{children}</div>
      </div>
      <AppBottomNav />
    </div>
  );
}
