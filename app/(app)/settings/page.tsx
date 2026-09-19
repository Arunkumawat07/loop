import { auth } from "@/lib/auth";
import { MembersClient } from "@/components/members-client";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user) return null;

  const isAdmin = session.user.role === "ADMIN";

  return (
    <main className="mx-auto max-w-3xl px-6 py-8">
      <h1 className="text-xl font-semibold text-ink">Settings</h1>
      <p className="mt-1 text-sm text-ink-soft">Workspace members and roles.</p>

      <div className="mt-6">
        <MembersClient isAdmin={isAdmin} currentUserId={session.user.id} />
      </div>
    </main>
  );
}
