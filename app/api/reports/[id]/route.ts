import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/guard";

// GET /api/reports/:id — view a previously generated report
// (AI4, criterion 3: "Reports are saved and viewable later").
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireRole(["ADMIN", "ANALYST", "VIEWER"]);
  if (session instanceof NextResponse) return session;

  const { id } = await params;

  const report = await db.report.findFirst({
    where: { id, workspaceId: session.workspaceId },
    include: { generatedBy: { select: { name: true, email: true } } },
  });

  if (!report) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(report);
}
