import { auth } from "@/lib/auth";
import { getThemeTrends } from "@/lib/insights";
import Link from "next/link";

// AI2 — Theme clustering & trends page.
// Criterion 3 ("clicking a theme drills into the underlying feedback")
// is satisfied by linking each theme card to /inbox?themeId=..., which
// reuses the Inbox's existing theme filter rather than building a
// second feedback list view.
export default async function TrendsPage() {
  const session = await auth();
  if (!session?.user) return null;

  const { periodDays, trends } = await getThemeTrends(session.user.workspaceId);

  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      <h1 className="text-xl font-semibold text-ink">Trends</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Theme volume over the last {periodDays} days vs. the {periodDays} days before that.
      </p>

      {trends.length === 0 ? (
        <div className="mt-8 rounded-lg border border-dashed border-line p-8 text-center text-sm text-ink-soft">
          No themes yet — classify some feedback first (add feedback, import a
          CSV, or use Simulate channel in the Inbox) and themes will appear
          here automatically.
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {trends.map((theme) => (
            <Link
              key={theme.themeId}
              href={`/inbox?themeId=${theme.themeId}`}
              className="rounded-lg border border-line bg-paper-raised p-4 transition hover:border-signal/40 hover:shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: theme.color }}
                  />
                  <span className="font-medium text-ink">{theme.name}</span>
                </div>
                {theme.isSpiking && (
                  <span className="rounded-full bg-negative-soft px-2 py-0.5 text-xs font-medium text-negative">
                    Spiking
                  </span>
                )}
              </div>

              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl font-semibold text-ink">
                  {theme.currentCount}
                </span>
                <span className="text-sm text-ink-soft">this period</span>
              </div>

              <p className="mt-1 text-xs text-ink-soft">
                {theme.previousCount} last period ·{" "}
                <span
                  className={
                    theme.percentChange > 0
                      ? "text-negative"
                      : theme.percentChange < 0
                        ? "text-positive"
                        : "text-ink-soft"
                  }
                >
                  {theme.percentChange > 0 ? "+" : ""}
                  {theme.percentChange}%
                </span>
              </p>

              <p className="mt-2 text-xs text-ink-faint">
                {theme.totalCount} total items · click to view feedback
              </p>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
