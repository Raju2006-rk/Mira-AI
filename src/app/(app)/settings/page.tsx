import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { SettingsPanel } from "@/components/SettingsPanel";

export default async function SettingsPage() {
  const session = await getSession();
  const settings = await prisma.userSettings.findUnique({
    where: { userId: session!.userId },
  });

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
      <SettingsPanel
        initial={{
          voiceEnabled: settings?.voiceEnabled ?? true,
          notificationsOn: settings?.notificationsOn ?? true,
          saveConversationHistory: settings?.saveConversationHistory ?? true,
        }}
      />
    </div>
  );
}
