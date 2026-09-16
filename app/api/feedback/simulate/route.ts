import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/guard";
import { simulateChannelSchema } from "@/lib/validation/schemas";

// POST /api/feedback/simulate — C3, acceptance criterion 3.
// The brief explicitly excludes real third-party integrations (Section
// 04.2): "Simulate channels with seed data instead." This is that
// simulation — a button that mimics pulling fresh feedback from a
// channel, so the ingestion pipeline has more than one entry point.
const BANK: Record<string, string[]> = {
  support_ticket: [
    "Can't reset my password, the reset email never arrives.",
    "Getting a 500 error every time I try to add a new team member.",
    "Two-factor auth setup keeps failing on the last step.",
    "The search bar in the inbox doesn't return results for partial matches.",
  ],
  app_store: [
    "App is snappy now, big improvement over last version.",
    "Crashes on launch after the latest update, please fix.",
    "Would love a widget for quick stats on the home screen.",
    "Clean UI, does exactly what I need without the bloat.",
  ],
  nps: [
    "Great tool but onboarding could be shorter.",
    "Wouldn't recommend yet — missing SSO for our security team.",
    "Solid 9/10, the dashboard alone is worth it.",
    "Support response times have gotten slower this quarter.",
  ],
  sales_call: [
    "Champion said procurement is blocked without SOC 2 report.",
    "They specifically asked about a Slack integration during the demo.",
    "Budget approved, just waiting on SSO confirmation to sign.",
    "Competitor's export feature was the deciding factor for them.",
  ],
  community: [
    "Posted a workaround for the CSV export bug, works great meanwhile.",
    "Feature request thread for bulk actions is getting a lot of upvotes.",
    "Someone asked if there's a public API roadmap anywhere.",
    "Really happy with how active the team is in here.",
  ],
};

export async function POST(req: NextRequest) {
  const session = await requireRole(["ADMIN", "ANALYST"]);
  if (session instanceof NextResponse) return session;

  const body = await req.json().catch(() => ({}));
  const parsed = simulateChannelSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { channel, count } = parsed.data;
  const pool = BANK[channel];

  const rows = Array.from({ length: count }, (_, i) => ({
    content: pool[i % pool.length],
    channel,
    status: "NEW" as const,
    workspaceId: session.workspaceId,
  }));

  const created = await db.feedback.createMany({ data: rows });

  return NextResponse.json(
    { importedCount: created.count, channel },
    { status: 201 }
  );
}
