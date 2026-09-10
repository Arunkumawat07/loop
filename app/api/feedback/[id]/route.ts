import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/guard";
import { statusUpdateSchema } from "@/lib/validation/schemas";

// PATCH /api/feedback/:id — status workflow: NEW -> REVIEWED -> ACTIONED
// (C4, acceptance criterion 4). VIEWER cannot change status.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireRole(["ADMIN", "ANALYST"]);
  if (session instanceof NextResponse) return session;

  const { id } = await params;
  const body = await req.json();
  const parsed = statusUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  // updateMany + workspaceId filter, NOT update({ where: { id } }) alone —
  // this is what prevents Company A from editing Company B's row just by
  // guessing an id. A plain update() would succeed even for the wrong
  // tenant; updateMany() with the workspace filter returns count: 0.
  const result = await db.feedback.updateMany({
    where: { id, workspaceId: session.workspaceId },
    data: { status: parsed.data.status },
  });

  if (result.count === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updated = await db.feedback.findUnique({ where: { id } });
  return NextResponse.json(updated);
}
