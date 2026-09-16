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
    <main className="mx-auto max-w-6xl px-6 py-8">
      <h1 className="text-xl font-semibold text-slate-900">Dashboard</h1>
      <p className="mt-1 text-sm text-slate-500">Last 30 days, {session.user.email}'s workspace</p>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <StatCard label="Total feedback" value={summary.stats.totalItems} />
        <StatCard label="Negative" value={`${summary.stats.negativePct}%`} />
        <StatCard label="New this week" value={summary.stats.newThisWeek} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <VolumeChart data={summary.volume} />
        <SentimentChart data={summary.sentiment} />
        <TopThemesChart data={summary.topThemes} />
      </div>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}
