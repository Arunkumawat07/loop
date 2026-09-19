import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/guard";
import { reportGenerateSchema } from "@/lib/validation/schemas";
import { createVoCReport } from "@/lib/reports";

// GET /api/reports — list saved reports for the workspace (AI4, criterion 3).
export async function GET() {
  const session = await requireRole(["ADMIN", "ANALYST", "VIEWER"]);
  if (session instanceof NextResponse) return session;

  const reports = await db.report.findMany({
    where: { workspaceId: session.workspaceId },
    orderBy: { createdAt: "desc" },
    include: { generatedBy: { select: { name: true, email: true } } },
  });

  return NextResponse.json(reports);
}

// POST /api/reports — generate a new VoC report for a chosen period
// (AI4, criterion 1). ADMIN/ANALYST only — VIEWER is read-only.
export async function POST(req: NextRequest) {
  const session = await requireRole(["ADMIN", "ANALYST"]);
  if (session instanceof NextResponse) return session;

  const body = await req.json().catch(() => ({}));
  const parsed = reportGenerateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { periodStart, periodEnd } = parsed.data;
  if (periodStart >= periodEnd) {
    return NextResponse.json(
      { error: "periodStart must be before periodEnd" },
      { status: 400 }
    );
  }

  const report = await createVoCReport(
    session.workspaceId,
    session.userId,
    periodStart,
    periodEnd
  );

  return NextResponse.json(report, { status: 201 });
}
