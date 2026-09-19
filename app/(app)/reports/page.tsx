import { auth } from "@/lib/auth";
import { ReportsClient } from "@/components/reports-client";

export default async function ReportsPage() {
  const session = await auth();
  if (!session?.user) return null;

  const canGenerate = session.user.role === "ADMIN" || session.user.role === "ANALYST";

  return (
    <main className="mx-auto max-w-4xl px-6 py-8">
      <h1 className="text-xl font-semibold text-ink">Voice of Customer Reports</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Generate a shareable digest of what customers said in a given period.
      </p>

      <div className="mt-6">
        <ReportsClient canGenerate={canGenerate} />
      </div>
    </main>
  );
}
