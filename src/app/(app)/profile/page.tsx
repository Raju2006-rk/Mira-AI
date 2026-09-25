import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

const LEVEL_LABEL: Record<string, string> = {
  BEGINNER: "Beginner",
  ELEMENTARY: "Elementary",
  INTERMEDIATE: "Intermediate",
  UPPER_INTERMEDIATE: "Upper Intermediate",
  ADVANCED: "Advanced",
};

export default async function ProfilePage() {
  const session = await getSession();
  const profile = await prisma.profile.findUnique({
    where: { userId: session!.userId },
  });

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-2xl font-bold text-slate-900">Your profile</h1>
      <div className="card space-y-3">
        <Row label="Name" value={session!.name} />
        <Row label="Email" value={session!.email} />
        <Row label="Level" value={LEVEL_LABEL[profile?.level ?? "BEGINNER"]} />
        <Row
          label="Goals"
          value={
            (profile?.goals ?? [])
              .map((g) => g.replace(/_/g, " "))
              .join(", ") || "Not set yet"
          }
        />
        <Row
          label="Support language"
          value={(profile?.supportLang ?? "en").toUpperCase()}
        />
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 pb-3 last:border-0 last:pb-0">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-sm font-medium text-slate-900">{value}</span>
    </div>
  );
}
