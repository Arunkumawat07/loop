import { NextResponse } from "next/server";
import { requireSession } from "@/lib/guard";
import { getThemeTrends } from "@/lib/insights";

// GET /api/insights/trends — AI2, criterion 2.
export async function GET() {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  const data = await getThemeTrends(session.workspaceId);
  return NextResponse.json(data);
}
