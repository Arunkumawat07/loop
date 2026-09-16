import { auth } from "@/lib/auth";
import { InboxClient } from "@/components/inbox-client";

// C4 — Feedback inbox. Search, filter, paginate, and triage feedback.
// canEdit is passed down so VIEWER role sees a read-only inbox (add
// form, status changes, and CSV import are hidden) while the API layer
// still enforces this server-side regardless of what the UI shows.
export default async function InboxPage() {
  const session = await auth();
  if (!session?.user) return null;

  const canEdit = session.user.role === "ADMIN" || session.user.role === "ANALYST";

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <h1 className="text-xl font-semibold text-slate-900">Inbox</h1>
      <p className="mt-1 text-sm text-slate-500">
        Search, filter, and triage all feedback in your workspace.
      </p>

      <div className="mt-6">
        <InboxClient canEdit={canEdit} />
      </div>
    </main>
  );
}
