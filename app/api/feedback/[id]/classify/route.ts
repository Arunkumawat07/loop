import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/guard";
import { classifyAndStoreFeedback } from "@/lib/classification";

// POST /api/feedback/:id/classify — lets an Analyst/Admin manually
// re-run classification on a single item, e.g. after correcting the
// content, or if the auto-classification on ingest failed or looks wrong.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireRole(["ADMIN", "ANALYST"]);
  if (session instanceof NextResponse) return session;

  const { id } = await params;

  // Confirm the item belongs to this workspace before doing anything —
  // classifyAndStoreFeedback also checks this, but failing fast with a
  // clean 404 here avoids burning an AI call on a request that can never
  // succeed.
  const feedback = await db.feedback.findUnique({ where: { id } });
  if (!feedback || feedback.workspaceId !== session.workspaceId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const result = await classifyAndStoreFeedback(id, session.workspaceId);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 502 });
  }

  const updated = await db.feedback.findUnique({
    where: { id },
    include: { themes: { include: { theme: true } } },
  });

  return NextResponse.json(updated);
}
