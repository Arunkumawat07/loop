import { auth, signOut } from "@/lib/auth";
import { db } from "@/lib/db";

// This is the Day 5 checkpoint page: proves sign-up -> login -> session
// -> workspace-scoped data all work end to end. Build the real charts
// (C5) here in Week 2 — for now it just proves the pipeline.
export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) return null;

  const [feedbackCount, memberCount] = await Promise.all([
    db.feedback.count({ where: { workspaceId: session.user.workspaceId } }),
    db.user.count({ where: { workspaceId: session.user.workspaceId } }),
  ]);

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">
            Signed in as {session.user.email} · role: {session.user.role}
          </p>
        </div>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <button className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50">
            Sign out
          </button>
        </form>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">Feedback items</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{feedbackCount}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">Workspace members</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{memberCount}</p>
        </div>
      </div>

      <div className="mt-8 rounded-lg border border-dashed border-slate-300 p-6 text-sm text-slate-500">
        Charts (volume / sentiment / top themes), the inbox, Ask LOOP, and
        the VoC report all get built here through Weeks 2–4 — see
        Section 08 of the brief for acceptance criteria on each.
      </div>
    </main>
  );
}
