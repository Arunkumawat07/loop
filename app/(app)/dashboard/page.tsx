import { auth } from "@/lib/auth";
import { getDashboardSummary } from "@/lib/insights";
import { VolumeChart } from "@/components/charts/volume-chart";
import { SentimentChart } from "@/components/charts/sentiment-chart";
import { TopThemesChart } from "@/components/charts/top-themes-chart";

// C5 — Analytics dashboard. Three charts (volume/sentiment/top themes),
// stat cards, and graceful empty states. Data is fetched server-side and
// scoped to the caller's workspace via getDashboardSummary().
export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) return null;

  const summary = await getDashboardSummary(session.user.workspaceId, 30);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-8">
      <h1 className="font-display text-xl font-semibold text-ink">Dashboard</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Last 30 days · {session.user.email}'s workspace
      </p>

      {/* Hero stat + two supporting figures, divided by hairlines rather
         than boxed into identical cards — the total feedback count gets
         the visual weight since it's the headline number. */}
      <div className="mt-8 flex flex-col divide-y divide-line border-y border-line sm:flex-row sm:divide-x sm:divide-y-0">
        <div className="flex-1 py-4 pr-6 sm:py-0 sm:pb-0">
          <p className="text-sm text-ink-soft">Total feedback</p>
          <p className="font-display tabular-nums mt-1 text-5xl font-semibold text-ink">
            {summary.stats.totalItems}
          </p>
        </div>
        <div className="flex-1 py-4 sm:py-0 sm:px-6">
          <p className="text-sm text-ink-soft">Negative</p>
          <p className="font-display tabular-nums mt-1 text-3xl font-semibold text-negative">
            {summary.stats.negativePct}%
          </p>
        </div>
        <div className="flex-1 py-4 sm:py-0 sm:pl-6">
          <p className="text-sm text-ink-soft">New this week</p>
          <p className="font-display tabular-nums mt-1 text-3xl font-semibold text-ink">
            {summary.stats.newThisWeek}
          </p>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <VolumeChart data={summary.volume} />
        <SentimentChart data={summary.sentiment} />
        <TopThemesChart data={summary.topThemes} />
      </div>
    </main>
  );
}
