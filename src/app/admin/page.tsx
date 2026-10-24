import { prisma, safeDb } from "@/lib/db";

export default async function AdminDashboard() {
  const [users, conversations, messages, mistakes, lessons] = await Promise.all(
    [
      safeDb(() => prisma.user.count(), 0),
      safeDb(() => prisma.conversation.count(), 0),
      safeDb(() => prisma.conversationMessage.count(), 0),
      safeDb(() => prisma.userMistake.count(), 0),
      safeDb(() => prisma.lesson.count(), 0),
    ],
  );

  const recentUsers = await safeDb(
    () =>
      prisma.user.findMany({
        orderBy: { createdAt: "desc" },
        take: 8,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
        },
      }),
    [],
  );

  const stats = [
    { label: "Total users", value: users },
    { label: "Conversations", value: conversations },
    { label: "Messages", value: messages },
    { label: "Mistakes logged", value: mistakes },
    { label: "Lessons", value: lessons },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Admin dashboard</h1>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        {stats.map((s) => (
          <div key={s.label} className="card text-center">
            <p className="text-2xl font-bold text-brand-600">{s.value}</p>
            <p className="mt-1 text-xs font-medium text-slate-500">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="card">
        <h2 className="font-semibold text-slate-900">Recent users</h2>
        {recentUsers.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">
            No database connected — user data will appear here once a PostgreSQL
            instance is configured.
          </p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase text-slate-400">
                <tr>
                  <th className="py-2">Name</th>
                  <th className="py-2">Email</th>
                  <th className="py-2">Role</th>
                  <th className="py-2">Joined</th>
                </tr>
              </thead>
              <tbody>
                {recentUsers.map((u) => (
                  <tr key={u.id} className="border-t border-slate-100">
                    <td className="py-2 font-medium text-slate-900">
                      {u.name}
                    </td>
                    <td className="py-2 text-slate-600">{u.email}</td>
                    <td className="py-2">
                      <span className="chip">{u.role}</span>
                    </td>
                    <td className="py-2 text-slate-500">
                      {u.createdAt.toISOString().slice(0, 10)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
