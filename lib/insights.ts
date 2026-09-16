import { db } from "@/lib/db";
import { subDays, format, startOfDay } from "date-fns";

export async function getDashboardSummary(workspaceId: string, days = 30) {
  const since = startOfDay(subDays(new Date(), days));

  const [items, themeCounts, totalCount, newThisWeekCount] = await Promise.all([
    db.feedback.findMany({
      where: { workspaceId, createdAt: { gte: since } },
      select: { sentiment: true, createdAt: true },
    }),
    db.feedbackTheme.groupBy({
      by: ["themeId"],
      where: { feedback: { workspaceId } },
      _count: { themeId: true },
      orderBy: { _count: { themeId: "desc" } },
      take: 8,
    }),
    db.feedback.count({ where: { workspaceId } }),
    db.feedback.count({
      where: { workspaceId, createdAt: { gte: startOfDay(subDays(new Date(), 7)) } },
    }),
  ]);

  const volumeMap = new Map<string, number>();
  for (let i = 0; i < days; i++) {
    volumeMap.set(format(subDays(new Date(), days - 1 - i), "MMM d"), 0);
  }
  for (const item of items) {
    const key = format(item.createdAt, "MMM d");
    if (volumeMap.has(key)) volumeMap.set(key, (volumeMap.get(key) ?? 0) + 1);
  }
  const volume = Array.from(volumeMap, ([date, count]) => ({ date, count }));

  const sentimentCounts = { POS: 0, NEU: 0, NEG: 0, unclassified: 0 };
  for (const item of items) {
    if (item.sentiment) sentimentCounts[item.sentiment]++;
    else sentimentCounts.unclassified++;
  }
  const negativePct =
    items.length > 0 ? Math.round((sentimentCounts.NEG / items.length) * 100) : 0;

  const themeIds = themeCounts.map((t) => t.themeId);
  const themes = await db.theme.findMany({ where: { id: { in: themeIds } } });
  const themeById = new Map(themes.map((t) => [t.id, t]));
  const topThemes = themeCounts.map((t) => ({
    themeId: t.themeId,
    name: themeById.get(t.themeId)?.name ?? "Unknown",
    color: themeById.get(t.themeId)?.color ?? "#7C6EF2",
    count: t._count.themeId,
  }));

  return {
    stats: { totalItems: totalCount, negativePct, newThisWeek: newThisWeekCount },
    volume,
    sentiment: [
      { name: "Positive", value: sentimentCounts.POS, color: "#10B981" },
      { name: "Neutral", value: sentimentCounts.NEU, color: "#94A3B8" },
      { name: "Negative", value: sentimentCounts.NEG, color: "#EF4444" },
      ...(sentimentCounts.unclassified > 0
        ? [{ name: "Unclassified", value: sentimentCounts.unclassified, color: "#CBD5E1" }]
        : []),
    ],
    topThemes,
  };
}