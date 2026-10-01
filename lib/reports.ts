import { db } from "@/lib/db";
import { generateJson, stripCodeFences } from "@/lib/ai-client";
import { differenceInDays, subDays, format } from "date-fns";

export type ReportContent = {
  narrative: string;
  recommendedActions: string[];
  stats: {
    totalItems: number;
    sentimentCounts: { POS: number; NEU: number; NEG: number };
    previousSentimentCounts: { POS: number; NEU: number; NEG: number };
    topThemes: { name: string; count: number; color: string }[];
    representativeQuotes: { content: string; sentiment: string | null; channel: string }[];
  };
};

export async function createVoCReport(
  workspaceId: string,
  generatedById: string,
  periodStart: Date,
  periodEnd: Date
) {
  const periodLengthDays = Math.max(1, differenceInDays(periodEnd, periodStart));
  const previousPeriodStart = subDays(periodStart, periodLengthDays);
  const previousPeriodEnd = periodStart;

  const [currentItems, previousItems] = await Promise.all([
    db.feedback.findMany({
      where: { workspaceId, createdAt: { gte: periodStart, lte: periodEnd } },
      include: { themes: { include: { theme: true } } },
    }),
    db.feedback.findMany({
      where: { workspaceId, createdAt: { gte: previousPeriodStart, lt: previousPeriodEnd } },
      select: { sentiment: true },
    }),
  ]);

  // --- Real numbers, computed in code, not by the model. -------------
  const sentimentCounts = {
    POS: currentItems.filter((i) => i.sentiment === "POS").length,
    NEU: currentItems.filter((i) => i.sentiment === "NEU").length,
    NEG: currentItems.filter((i) => i.sentiment === "NEG").length,
  };
  const previousSentimentCounts = {
    POS: previousItems.filter((i) => i.sentiment === "POS").length,
    NEU: previousItems.filter((i) => i.sentiment === "NEU").length,
    NEG: previousItems.filter((i) => i.sentiment === "NEG").length,
  };

  const themeCounts = new Map<string, { count: number; color: string }>();
  for (const item of currentItems) {
    for (const ft of item.themes) {
      const existing = themeCounts.get(ft.theme.name);
      themeCounts.set(ft.theme.name, {
        count: (existing?.count ?? 0) + 1,
        color: ft.theme.color,
      });
    }
  }
  const topThemes = Array.from(themeCounts.entries())
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 5)
    .map(([name, v]) => ({ name, count: v.count, color: v.color }));

  const negativeQuotes = currentItems.filter((i) => i.sentiment === "NEG").slice(0, 2);
  const positiveQuotes = currentItems.filter((i) => i.sentiment === "POS").slice(0, 2);
  const representativeQuotes = [...negativeQuotes, ...positiveQuotes].map((i) => ({
    content: i.content,
    sentiment: i.sentiment,
    channel: i.channel,
  }));

  const periodLabel = `${format(periodStart, "MMM d, yyyy")} – ${format(periodEnd, "MMM d, yyyy")}`;

  // --- Gemini only writes the narrative around the numbers above. ----
  const themesBlock = topThemes.map((t) => `- ${t.name}: ${t.count} items`).join("\n");
  const quotesBlock = representativeQuotes
    .map((q) => `- (${q.channel}, ${q.sentiment ?? "unclassified"}) "${q.content}"`)
    .join("\n");

  const prompt = `You are writing a Voice-of-Customer report for a product leadership team. Use ONLY the numbers given below — do not invent statistics, counts, or facts that aren't provided.

Period: ${periodLabel}
Total feedback items: ${currentItems.length} (previous period: ${previousItems.length})
Sentiment this period: ${sentimentCounts.POS} positive, ${sentimentCounts.NEU} neutral, ${sentimentCounts.NEG} negative
Sentiment previous period: ${previousSentimentCounts.POS} positive, ${previousSentimentCounts.NEU} neutral, ${previousSentimentCounts.NEG} negative

Top themes:
${themesBlock || "(no themed feedback yet)"}

Representative verbatim quotes:
${quotesBlock || "(none available)"}

Write a report a Head of Product could forward to leadership without editing. Return a JSON object:
{
  "narrative": string (3-5 sentences telling the overall story of this period),
  "recommendedActions": [string, ...] (2-4 short, concrete, actionable recommendations)
}`;

  const text = await generateJson(prompt);

  const parsed = JSON.parse(stripCodeFences(text)) as {
    narrative: string;
    recommendedActions: string[];
  };

  const contentJson: ReportContent = {
    narrative: parsed.narrative,
    recommendedActions: parsed.recommendedActions,
    stats: {
      totalItems: currentItems.length,
      sentimentCounts,
      previousSentimentCounts,
      topThemes,
      representativeQuotes,
    },
  };

  const report = await db.report.create({
    data: {
      title: `Voice of Customer — ${periodLabel}`,
      periodStart,
      periodEnd,
      contentJson: contentJson as unknown as object,
      workspaceId,
      generatedById,
    },
  });

  return report;
}
