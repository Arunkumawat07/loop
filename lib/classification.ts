import { db } from "@/lib/db";
import { classifyFeedback } from "@/lib/ai";

/**
 * Classifies one feedback item and persists the result:
 *  - sentiment + sentimentScore stored directly on the Feedback row
 *  - each returned theme name is matched to an existing Theme (by name,
 *    scoped to the workspace) or created if it doesn't exist yet — this
 *    is the "theme clustering" half of AI2: new feedback either joins
 *    an existing theme or forms a new one.
 *  - old FeedbackTheme links are cleared first so re-classification
 *    doesn't leave stale theme assignments behind.
 *
 * Failures are caught and logged rather than thrown — a bad AI response
 * for one item should never fail the whole ingestion batch (CSV import,
 * simulate-channel). The item is simply left unclassified and can be
 * retried later via the manual re-classify action (AI1, criterion 4).
 */
export async function classifyAndStoreFeedback(
  feedbackId: string,
  workspaceId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const feedback = await db.feedback.findUnique({ where: { id: feedbackId } });
    if (!feedback || feedback.workspaceId !== workspaceId) {
      return { ok: false, error: "Feedback not found in workspace" };
    }

    const existingThemes = await db.theme.findMany({
      where: { workspaceId },
      select: { name: true },
    });

    const result = await classifyFeedback(
      feedback.content,
      existingThemes.map((t) => t.name)
    );

    await db.$transaction(async (tx) => {
      await tx.feedback.update({
        where: { id: feedbackId },
        data: {
          sentiment: result.sentiment,
          sentimentScore: result.sentimentScore,
        },
      });

      // Clear old links (relevant on re-classify) then attach fresh ones.
      await tx.feedbackTheme.deleteMany({ where: { feedbackId } });

      for (const themeName of result.themes) {
        const theme = await tx.theme.upsert({
          where: { workspaceId_name: { workspaceId, name: themeName } },
          create: { workspaceId, name: themeName },
          update: {},
        });

        await tx.feedbackTheme.create({
          data: { feedbackId, themeId: theme.id, confidence: 0.9 },
        });
      }
    }, { timeout: 15000, maxWait: 10000 });

    return { ok: true };
  } catch (err) {
    console.error(`Classification failed for feedback ${feedbackId}:`, err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Unknown classification error",
    };
  }
}

/**
 * Classifies a batch of feedback items sequentially. Used after CSV
 * import / simulate-channel where several rows land at once. Sequential
 * (not Promise.all) on purpose — it's kinder to API rate limits than
 * firing dozens of concurrent requests, and this project's data volumes
 * don't need the throughput.
 */
export async function classifyBatch(
  feedbackIds: string[],
  workspaceId: string
): Promise<{ classified: number; failed: number }> {
  let classified = 0;
  let failed = 0;

  for (const id of feedbackIds) {
    const result = await classifyAndStoreFeedback(id, workspaceId);
    if (result.ok) classified++;
    else failed++;
  }

  return { classified, failed };
}
