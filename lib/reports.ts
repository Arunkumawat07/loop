import { db } from "@/lib/db";
import { anthropicClient, MODEL, stripCodeFences } from "@/lib/ai-client";

// AI4 — Voice-of-Customer report (Section 09.3).
// "Pre-compute the period's stats in code, then ask Claude to write the
// narrative around those numbers. This keeps the report accurate and
// cheap, and stops the model from hallucinating figures." — we never
// ask Claude to count or calculate anything; it only writes prose
// around numbers we already computed with real database queries.

export type PeriodStats = {
  totalItems: number;
  sentimentCounts: { POS: number; NEU: number; NEG: number };
  previousSentimentCounts: { POS: number; NEU: number; NEG: number };
  topThemes: { name: string; count: number; color: string }[];
  representativeQuotes: { content: string; sentiment: string | null; channel: string }[];
};

export async function computePeriodStats(
  workspaceId: string,
  periodStart: Date,
  periodEnd: Date
): Promise<PeriodStats> {
  const periodLengthMs = periodEnd.getTime() - periodStart.getTime();
  const previousStart = new Date(periodStart.getTime() - periodLengthMs);
  const previousEnd = periodStart;

  const [items, previousItems, themeCounts] = await Promise.all([
    db.feedback.findMany({
      where: { workspaceId, createdAt: { gte: periodStart, lte: periodEnd } },
      select: { content: true, sentiment: true, channel: true, createdAt: true },
    }),
    db.feedback.findMany({
      where: { workspaceId, createdAt: { gte: previousStart, lt: previousEnd } },
      select: { sentiment: true },
    }),
    db.feedbackTheme.groupBy({
      by: ["themeId"],
      where: {
        feedback: { workspaceId, createdAt: { gte: periodStart, lte: periodEnd } },
      },
      _count: { themeId: true },
      orderBy: { _count: { themeId: "desc" } },
      take: 5,
    }),
  ]);

  function countSentiments(rows: { sentiment: string | null }[]) {
    const counts = { POS: 0, NEU: 0, NEG: 0 };
    for (const row of rows) {
      if (row.sentiment === "POS" || row.sentiment === "NEU" || row.sentiment === "NEG") {
        counts[row.sentiment]++;
      }
    }
    return counts;
  }

  const themeIds = themeCounts.map((t) => t.themeId);
  const themes = await db.theme.findMany({ where: { id: { in: themeIds } } });
  const themeById = new Map(themes.map((t) => [t.id, t]));
  const topThemes = themeCounts.map((t) => ({
    name: themeById.get(t.themeId)?.name ?? "Unknown",
    color: themeById.get(t.themeId)?.color ?? "#7C6EF2",
    count: t._count.themeId,
  }));

  // Representative quotes: the most negative and most positive items by
  // sentiment score, so the report shows real voice-of-customer language
  // rather than a random sample.
  const scored = await db.feedback.findMany({
    where: {
      workspaceId,
      createdAt: { gte: periodStart, lte: periodEnd },
      sentimentScore: { not: null },
    },
    orderBy: { sentimentScore: "asc" },
    select: { content: true, sentiment: true, channel: true, sentimentScore: true },
  });
  const mostNegative = scored.slice(0, 2);
  const mostPositive = scored.slice(-2).reverse();
  const representativeQuotes = [...mostNegative, ...mostPositive].map((q) => ({
    content: q.content,
    sentiment: q.sentiment,
    channel: q.channel,
  }));

  return {
    totalItems: items.length,
    sentimentCounts: countSentiments(items),
    previousSentimentCounts: countSentiments(previousItems),
    topThemes,
    representativeQuotes,
  };
}

export type ReportContent = {
  narrative: string;
  recommendedActions: string[];
  stats: PeriodStats;
};

/**
 * Asks Claude to write the narrative summary and recommended actions
 * around stats we already computed. The prompt explicitly hands Claude
 * the final numbers and forbids it from introducing new ones — its job
 * is prose and judgment, not arithmetic.
 */
export async function generateReportNarrative(stats: PeriodStats): Promise<{
  narrative: string;
  recommendedActions: string[];
}> {
  const prompt = `You are writing a Voice-of-Customer digest for a product/support leadership team, based on real, pre-computed statistics. Do not invent any numbers beyond what is given below — only reference these exact figures.

Period stats:
- Total feedback items: ${stats.totalItems}
- Sentiment this period: ${stats.sentimentCounts.POS} positive, ${stats.sentimentCounts.NEU} neutral, ${stats.sentimentCounts.NEG} negative
- Sentiment previous period: ${stats.previousSentimentCounts.POS} positive, ${stats.previousSentimentCounts.NEU} neutral, ${stats.previousSentimentCounts.NEG} negative
- Top themes: ${stats.topThemes.map((t) => `${t.name} (${t.count} items)`).join(", ") || "none classified yet"}
- Representative quotes:
${stats.representativeQuotes.map((q) => `  - "${q.content}" (${q.channel}, ${q.sentiment ?? "unclassified"})`).join("\n") || "  (none available)"}

Write a Voice-of-Customer summary suitable to forward to leadership without editing. Return ONLY a JSON object, no markdown fences:
{
  "narrative": string (3-5 sentences: overall sentiment shift, what's driving it, and the top 1-2 themes to watch — reference the exact numbers given above, don't round or restate them differently),
  "recommendedActions": [string, string, string] (3 concrete, specific next steps a product/support team could act on this week, grounded in the themes and quotes above)
}`;

  const response = await anthropicClient.messages.create({
    model: MODEL,
    max_tokens: 700,
    messages: [{ role: "user", content: prompt }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Claude returned no text content");
  }

  const parsed = JSON.parse(stripCodeFences(textBlock.text)) as {
    narrative: string;
    recommendedActions: string[];
  };
  return parsed;
}

export async function createVoCReport(
  workspaceId: string,
  generatedById: string,
  periodStart: Date,
  periodEnd: Date
) {
  const stats = await computePeriodStats(workspaceId, periodStart, periodEnd);
  const { narrative, recommendedActions } = await generateReportNarrative(stats);

  const content: ReportContent = { narrative, recommendedActions, stats };

  const report = await db.report.create({
    data: {
      title: `Voice of Customer — ${periodStart.toLocaleDateString()} to ${periodEnd.toLocaleDateString()}`,
      periodStart,
      periodEnd,
      contentJson: content as any,
      workspaceId,
      generatedById,
    },
  });

  return report;
}
