import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/guard";
import { getDashboardSummary } from "@/lib/insights";

// GET /api/insights/summary?days=30 — C5, acceptance criteria 1-2.
// Powers the dashboard's three required charts: volume over time,
// sentiment breakdown, and top themes.
export async function GET(req: NextRequest) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  const url = new URL(req.url);
  const days = Math.min(Math.max(Number(url.searchParams.get("days")) || 30, 1), 180);

  const summary = await getDashboardSummary(session.workspaceId, days);
  return NextResponse.json(summary);
}
