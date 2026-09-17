import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/guard";
import { askLoopSchema } from "@/lib/validation/schemas";
import { retrieveRelevantFeedback } from "@/lib/search";
import { answerFromFeedback } from "@/lib/ai";
import { db } from "@/lib/db";

// POST /api/insights/ask — AI3, Ask LOOP.
// Retrieve-then-answer: find the most relevant feedback for the
// question first, then ask Claude to answer using ONLY those items.
// The response includes the actual feedback items the answer is based
// on, so the UI can show citations the person can click through and
// verify — this is what "grounded" means in practice, not just a claim.
export async function POST(req: NextRequest) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  const body = await req.json().catch(() => ({}));
  const parsed = askLoopSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { question } = parsed.data;

  const retrieved = await retrieveRelevantFeedback(session.workspaceId, question, 8);

  const { answer, usedItemIds } = await answerFromFeedback(
    question,
    retrieved.map((r) => ({
      id: r.id,
      content: r.content,
      channel: r.channel,
      sentiment: r.sentiment,
    }))
  );

  // Fetch full records for just the items actually cited, so the UI can
  // show real citations rather than the whole retrieved set.
  const citedItems =
    usedItemIds.length > 0
      ? await db.feedback.findMany({
          where: { id: { in: usedItemIds }, workspaceId: session.workspaceId },
          select: { id: true, content: true, channel: true, sentiment: true, createdAt: true },
        })
      : [];

  return NextResponse.json({ answer, citedItems });
}
